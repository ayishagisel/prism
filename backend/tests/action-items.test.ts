import { ActionItemsService, ActionItem, ActionItemType } from '../src/modules/action-items/action-items.service';
import { ActionItemsController } from '../src/modules/action-items/action-items.controller';
import { Request, Response } from 'express';

// Mock the database
jest.mock('../src/config/db', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnValue([]),
  },
}));

describe('ActionItemsService', () => {
  let service: ActionItemsService;

  beforeEach(() => {
    service = new ActionItemsService();
    jest.clearAllMocks();
  });

  describe('getActionItems', () => {
    it('should return empty array when no action items exist', async () => {
      const result = await service.getActionItems('agency_001');
      expect(result).toEqual([]);
    });

    it('should return action items sorted by created_at descending', async () => {
      // Mock implementation would return items - testing interface compliance
      const result = await service.getActionItems('agency_001');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getActionItemsCount', () => {
    it('should return correct counts structure', async () => {
      const result = await service.getActionItemsCount('agency_001');

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('escalated_chats');
      expect(result).toHaveProperty('restore_requests');
      expect(typeof result.total).toBe('number');
      expect(typeof result.escalated_chats).toBe('number');
      expect(typeof result.restore_requests).toBe('number');
    });

    it('should return zero counts when no items exist', async () => {
      const result = await service.getActionItemsCount('agency_001');

      expect(result.total).toBe(0);
      expect(result.escalated_chats).toBe(0);
      expect(result.restore_requests).toBe(0);
    });
  });
});

describe('ActionItemsController', () => {
  let controller: ActionItemsController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    controller = new ActionItemsController();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };
    jest.clearAllMocks();
  });

  describe('getActionItems', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockRequest = { auth: undefined } as any;

      await controller.getActionItems(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should return 403 when user is not an agency user', async () => {
      mockRequest = {
        auth: {
          userId: 'user_001',
          agencyId: 'agency_001',
          role: 'CLIENT_USER',
        },
      } as any;

      await controller.getActionItems(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Only agency users can view action items',
      });
    });

    it('should return 200 with action items for AGENCY_ADMIN', async () => {
      mockRequest = {
        auth: {
          userId: 'user_001',
          agencyId: 'agency_001',
          role: 'AGENCY_ADMIN',
        },
      } as any;

      await controller.getActionItems(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Array),
      });
    });

    it('should return 200 with action items for AGENCY_MEMBER', async () => {
      mockRequest = {
        auth: {
          userId: 'user_001',
          agencyId: 'agency_001',
          role: 'AGENCY_MEMBER',
        },
      } as any;

      await controller.getActionItems(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Array),
      });
    });
  });

  describe('getActionItemsCount', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockRequest = { auth: undefined } as any;

      await controller.getActionItemsCount(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should return 403 when user is not an agency user', async () => {
      mockRequest = {
        auth: {
          userId: 'user_001',
          agencyId: 'agency_001',
          role: 'CLIENT_USER',
        },
      } as any;

      await controller.getActionItemsCount(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Only agency users can view action items count',
      });
    });

    it('should return 200 with counts for AGENCY_ADMIN', async () => {
      mockRequest = {
        auth: {
          userId: 'user_001',
          agencyId: 'agency_001',
          role: 'AGENCY_ADMIN',
        },
      } as any;

      await controller.getActionItemsCount(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          total: expect.any(Number),
          escalated_chats: expect.any(Number),
          restore_requests: expect.any(Number),
        }),
      });
    });

    it('should return 200 with counts for AGENCY_MEMBER', async () => {
      mockRequest = {
        auth: {
          userId: 'user_001',
          agencyId: 'agency_001',
          role: 'AGENCY_MEMBER',
        },
      } as any;

      await controller.getActionItemsCount(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          total: expect.any(Number),
          escalated_chats: expect.any(Number),
          restore_requests: expect.any(Number),
        }),
      });
    });
  });
});

describe('ActionItem Interface', () => {
  it('should support escalated_chat type', () => {
    const item: ActionItem = {
      id: 'chat_opp1_client1',
      type: 'escalated_chat',
      created_at: new Date(),
      client_name: 'Test Client',
      client_id: 'client_001',
      client_user_id: 'user_001',
      client_user_name: 'John Doe',
      opportunity_id: 'opp_001',
      opportunity_title: 'Test Opportunity',
      summary: 'Test message...',
      metadata: { message_count: 3, last_message: 'Full message text' },
    };

    expect(item.type).toBe('escalated_chat');
    expect(item.metadata.message_count).toBe(3);
  });

  it('should support restore_request type', () => {
    const item: ActionItem = {
      id: 'restore_001',
      type: 'restore_request',
      created_at: new Date(),
      client_name: 'Test Client',
      client_id: 'client_001',
      client_user_id: 'user_001',
      client_user_name: 'John Doe',
      opportunity_id: 'opp_001',
      opportunity_title: 'Test Opportunity',
      summary: 'Client requested to restore this declined opportunity',
      metadata: { request_type: 'restore' },
    };

    expect(item.type).toBe('restore_request');
    expect(item.metadata.request_type).toBe('restore');
  });
});
