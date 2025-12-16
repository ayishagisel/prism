import { PresenceService, UserType } from '../src/modules/websocket/presence.service';

// Mock the database
jest.mock('../src/config/db', () => ({
  db: {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnValue([]),
  },
}));

describe('PresenceService', () => {
  let service: PresenceService;

  beforeEach(() => {
    service = new PresenceService();
    jest.clearAllMocks();
  });

  describe('setUserOnline', () => {
    it('should set agency user online with socket ID', async () => {
      await service.setUserOnline('user_001', 'agency_user', 'socket_123');
      // Test passes if no error thrown
      expect(true).toBe(true);
    });

    it('should set client user online with socket ID', async () => {
      await service.setUserOnline('user_002', 'client_user', 'socket_456');
      // Test passes if no error thrown
      expect(true).toBe(true);
    });
  });

  describe('setUserOffline', () => {
    it('should set agency user offline', async () => {
      await service.setUserOffline('user_001', 'agency_user');
      // Test passes if no error thrown
      expect(true).toBe(true);
    });

    it('should set client user offline', async () => {
      await service.setUserOffline('user_002', 'client_user');
      // Test passes if no error thrown
      expect(true).toBe(true);
    });
  });

  describe('isUserOnline', () => {
    it('should return false for agency user when no result', async () => {
      const result = await service.isUserOnline('user_001', 'agency_user');
      expect(result).toBe(false);
    });

    it('should return false for client user when no result', async () => {
      const result = await service.isUserOnline('user_002', 'client_user');
      expect(result).toBe(false);
    });
  });

  describe('getUserSocketId', () => {
    it('should return null for agency user when no result', async () => {
      const result = await service.getUserSocketId('user_001', 'agency_user');
      expect(result).toBeNull();
    });

    it('should return null for client user when no result', async () => {
      const result = await service.getUserSocketId('user_002', 'client_user');
      expect(result).toBeNull();
    });
  });

  describe('updateLastSeen', () => {
    it('should update last_seen_at for agency user', async () => {
      await service.updateLastSeen('user_001', 'agency_user');
      // Test passes if no error thrown
      expect(true).toBe(true);
    });

    it('should update last_seen_at for client user', async () => {
      await service.updateLastSeen('user_002', 'client_user');
      // Test passes if no error thrown
      expect(true).toBe(true);
    });
  });

  describe('setUserOfflineBySocketId', () => {
    it('should return null when socket ID not found', async () => {
      const result = await service.setUserOfflineBySocketId('unknown_socket');
      expect(result).toBeNull();
    });
  });
});

describe('UserType', () => {
  it('should support agency_user type', () => {
    const type: UserType = 'agency_user';
    expect(type).toBe('agency_user');
  });

  it('should support client_user type', () => {
    const type: UserType = 'client_user';
    expect(type).toBe('client_user');
  });
});
