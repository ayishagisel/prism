import { NotificationRouterService, NotificationPayload, NotificationType } from '../src/modules/notifications/notification-router.service';

// Mock dependencies
jest.mock('../src/modules/websocket/websocket.service', () => ({
  websocketService: {
    emitToUser: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('../src/modules/websocket/presence.service', () => ({
  presenceService: {
    isUserOnline: jest.fn().mockResolvedValue(false),
  },
}));

jest.mock('../src/modules/notifications/push.service', () => ({
  notificationPushService: {
    sendPushNotification: jest.fn().mockResolvedValue(false),
  },
}));

jest.mock('../src/modules/notifications/email.service', () => ({
  notificationEmailService: {
    sendAOPRNotification: jest.fn().mockResolvedValue(true),
    sendRestoreRequestResponse: jest.fn().mockResolvedValue(true),
    sendClientOpportunityAlert: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('../src/config/db', () => ({
  db: {},
}));

// Import mocked modules for assertions
import { websocketService } from '../src/modules/websocket/websocket.service';
import { presenceService } from '../src/modules/websocket/presence.service';
import { notificationPushService } from '../src/modules/notifications/push.service';
import { notificationEmailService } from '../src/modules/notifications/email.service';

describe('NotificationRouterService', () => {
  let service: NotificationRouterService;

  const createPayload = (type: NotificationType): NotificationPayload => ({
    recipientId: 'user_001',
    recipientType: 'client_user',
    agencyId: 'agency_001',
    type,
    title: 'Test Notification',
    body: 'Test body content',
    data: {
      deepLink: '/client/opportunities/opp_001',
      opportunityId: 'opp_001',
      clientName: 'Test Client',
      opportunityTitle: 'Test Opportunity',
    },
  });

  beforeEach(() => {
    service = new NotificationRouterService();
    jest.clearAllMocks();
  });

  describe('routeNotification', () => {
    it('should send via WebSocket when user is online', async () => {
      (presenceService.isUserOnline as jest.Mock).mockResolvedValue(true);
      (websocketService.emitToUser as jest.Mock).mockResolvedValue(true);

      const payload = createPayload('chat_message');
      const result = await service.routeNotification(payload);

      expect(presenceService.isUserOnline).toHaveBeenCalledWith('user_001', 'client_user');
      expect(websocketService.emitToUser).toHaveBeenCalled();
      expect(result.websocket).toBe(true);
      expect(result.push).toBe(false);
      expect(result.email).toBe('skipped');
    });

    it('should skip push when user is online and WebSocket succeeds', async () => {
      (presenceService.isUserOnline as jest.Mock).mockResolvedValue(true);
      (websocketService.emitToUser as jest.Mock).mockResolvedValue(true);

      const payload = createPayload('chat_message');
      await service.routeNotification(payload);

      expect(notificationPushService.sendPushNotification).not.toHaveBeenCalled();
    });

    it('should try push when user is offline', async () => {
      (presenceService.isUserOnline as jest.Mock).mockResolvedValue(false);
      (notificationPushService.sendPushNotification as jest.Mock).mockResolvedValue(true);

      const payload = createPayload('chat_message');
      const result = await service.routeNotification(payload);

      expect(notificationPushService.sendPushNotification).toHaveBeenCalled();
      expect(result.push).toBe(true);
    });

    it('should queue email with 2.5 min delay when push succeeds', async () => {
      (presenceService.isUserOnline as jest.Mock).mockResolvedValue(false);
      (notificationPushService.sendPushNotification as jest.Mock).mockResolvedValue(true);

      const payload = createPayload('chat_message');
      const result = await service.routeNotification(payload);

      expect(result.email).toBe('queued');
      expect(result.emailDelayMs).toBe(2.5 * 60 * 1000);
    });

    it('should send email immediately when no push subscription', async () => {
      (presenceService.isUserOnline as jest.Mock).mockResolvedValue(false);
      (notificationPushService.sendPushNotification as jest.Mock).mockResolvedValue(false);

      const payload = createPayload('chat_message');
      const result = await service.routeNotification(payload);

      expect(result.email).toBe('sent');
      expect(result.emailDelayMs).toBeNull();
      expect(notificationEmailService.sendAOPRNotification).toHaveBeenCalled();
    });

    it('should call correct email service for restore_response type', async () => {
      (presenceService.isUserOnline as jest.Mock).mockResolvedValue(false);
      (notificationPushService.sendPushNotification as jest.Mock).mockResolvedValue(false);

      const payload = createPayload('restore_response');
      payload.data.status = 'approved';
      await service.routeNotification(payload);

      expect(notificationEmailService.sendRestoreRequestResponse).toHaveBeenCalled();
    });

    it('should call correct email service for new_opportunity type', async () => {
      (presenceService.isUserOnline as jest.Mock).mockResolvedValue(false);
      (notificationPushService.sendPushNotification as jest.Mock).mockResolvedValue(false);

      const payload = createPayload('new_opportunity');
      payload.data.outletName = 'Test Outlet';
      payload.data.mediaType = 'Print';
      payload.data.deadline = '2024-01-01';
      await service.routeNotification(payload);

      expect(notificationEmailService.sendClientOpportunityAlert).toHaveBeenCalled();
    });
  });

  describe('generateDeepLink', () => {
    it('should generate correct deep link for chat_message', () => {
      const link = service.generateDeepLink('chat_message', 'client_user', { opportunityId: 'opp_001' });
      expect(link).toContain('/client/opportunities/opp_001?chat=open');
    });

    it('should generate correct deep link for chat_escalation', () => {
      const link = service.generateDeepLink('chat_escalation', 'agency_user', { conversationId: 'conv_001' });
      expect(link).toContain('/agency/action-items?highlight=conv_001');
    });

    it('should generate correct deep link for restore_request', () => {
      const link = service.generateDeepLink('restore_request', 'agency_user', {});
      expect(link).toContain('/agency/action-items?type=restore_request');
    });

    it('should generate correct deep link for restore_response', () => {
      const link = service.generateDeepLink('restore_response', 'client_user', { opportunityId: 'opp_001' });
      expect(link).toContain('/client/opportunities/opp_001');
    });

    it('should generate correct deep link for new_opportunity', () => {
      const link = service.generateDeepLink('new_opportunity', 'client_user', { opportunityId: 'opp_001' });
      expect(link).toContain('/client/opportunities/opp_001');
    });

    it('should use agency portal for agency users', () => {
      const link = service.generateDeepLink('chat_message', 'agency_user', { opportunityId: 'opp_001' });
      expect(link).toContain('/agency/opportunities/opp_001');
    });
  });

  describe('cancelScheduledEmail', () => {
    it('should return false when no matching email is scheduled', () => {
      const result = service.cancelScheduledEmail('user_999', 'chat_message', 'opp_999');
      expect(result).toBe(false);
    });
  });

  describe('getPendingEmailCount', () => {
    it('should return a number', () => {
      const count = service.getPendingEmailCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('NotificationType', () => {
  it('should support chat_message type', () => {
    const type: NotificationType = 'chat_message';
    expect(type).toBe('chat_message');
  });

  it('should support chat_escalation type', () => {
    const type: NotificationType = 'chat_escalation';
    expect(type).toBe('chat_escalation');
  });

  it('should support restore_request type', () => {
    const type: NotificationType = 'restore_request';
    expect(type).toBe('restore_request');
  });

  it('should support restore_response type', () => {
    const type: NotificationType = 'restore_response';
    expect(type).toBe('restore_response');
  });

  it('should support new_opportunity type', () => {
    const type: NotificationType = 'new_opportunity';
    expect(type).toBe('new_opportunity');
  });
});
