import { WebSocketService, WebSocketEvent } from '../src/modules/websocket/websocket.service';

// Mock dependencies
jest.mock('../src/modules/auth/auth.service', () => ({
  authService: {
    verifyToken: jest.fn().mockReturnValue({
      userId: 'user_001',
      agencyId: 'agency_001',
      role: 'AGENCY_ADMIN',
    }),
  },
}));

jest.mock('../src/modules/websocket/presence.service', () => ({
  presenceService: {
    setUserOnline: jest.fn().mockResolvedValue(undefined),
    setUserOffline: jest.fn().mockResolvedValue(undefined),
    getUserSocketId: jest.fn().mockResolvedValue(null),
    isUserOnline: jest.fn().mockResolvedValue(false),
    updateLastSeen: jest.fn().mockResolvedValue(undefined),
    setUserOfflineBySocketId: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('../src/config/db', () => ({
  db: {},
}));

describe('WebSocketService', () => {
  let service: WebSocketService;

  beforeEach(() => {
    service = new WebSocketService();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should start without Socket.io server', () => {
      expect(service.getIO()).toBeNull();
    });
  });

  describe('emitToUser', () => {
    it('should return false when service not initialized', async () => {
      const result = await service.emitToUser('user_001', 'agency_user', 'action_item:new', { test: true });
      expect(result).toBe(false);
    });
  });

  describe('emitToAgency', () => {
    it('should not throw when service not initialized', () => {
      expect(() => {
        service.emitToAgency('agency_001', 'action_item:new', { test: true });
      }).not.toThrow();
    });
  });

  describe('emitToRoom', () => {
    it('should not throw when service not initialized', () => {
      expect(() => {
        service.emitToRoom('room_001', 'action_item:new', { test: true });
      }).not.toThrow();
    });
  });

  describe('isUserConnected', () => {
    it('should check presence service for online status', async () => {
      const result = await service.isUserConnected('user_001', 'agency_user');
      expect(result).toBe(false);
    });
  });
});

describe('WebSocketEvent types', () => {
  it('should support action_item:new event', () => {
    const event: WebSocketEvent = 'action_item:new';
    expect(event).toBe('action_item:new');
  });

  it('should support action_item:updated event', () => {
    const event: WebSocketEvent = 'action_item:updated';
    expect(event).toBe('action_item:updated');
  });

  it('should support chat:message event', () => {
    const event: WebSocketEvent = 'chat:message';
    expect(event).toBe('chat:message');
  });

  it('should support chat:escalated event', () => {
    const event: WebSocketEvent = 'chat:escalated';
    expect(event).toBe('chat:escalated');
  });

  it('should support restore:request event', () => {
    const event: WebSocketEvent = 'restore:request';
    expect(event).toBe('restore:request');
  });

  it('should support restore:response event', () => {
    const event: WebSocketEvent = 'restore:response';
    expect(event).toBe('restore:response');
  });

  it('should support notification:new event', () => {
    const event: WebSocketEvent = 'notification:new';
    expect(event).toBe('notification:new');
  });
});
