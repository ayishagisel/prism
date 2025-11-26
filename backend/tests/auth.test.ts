import { authService } from '../src/modules/auth/auth.service';

describe('AuthService', () => {
  describe('createToken', () => {
    it('should create a valid JWT token', () => {
      const token = authService.createToken({
        userId: 'test_user',
        agencyId: 'test_agency',
        email: 'test@example.com',
        role: 'AGENCY_ADMIN',
      });

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should verify and decode token correctly', () => {
      const payload = {
        userId: 'test_user',
        agencyId: 'test_agency',
        email: 'test@example.com',
        role: 'AGENCY_ADMIN' as const,
      };

      const token = authService.createToken(payload);
      const decoded = authService.verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(payload.userId);
      expect(decoded?.agencyId).toBe(payload.agencyId);
      expect(decoded?.email).toBe(payload.email);
    });

    it('should return null for invalid token', () => {
      const decoded = authService.verifyToken('invalid.token.here');
      expect(decoded).toBeNull();
    });
  });

  describe('password hashing', () => {
    it('should hash a password', async () => {
      const password = 'test_password_123';
      const hash = await authService.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
    });

    it('should correctly compare password with hash', async () => {
      const password = 'test_password_123';
      const hash = await authService.hashPassword(password);

      const isMatch = await authService.comparePassword(password, hash);
      expect(isMatch).toBe(true);
    });

    it('should not match incorrect password', async () => {
      const password = 'test_password_123';
      const hash = await authService.hashPassword(password);

      const isMatch = await authService.comparePassword('wrong_password', hash);
      expect(isMatch).toBe(false);
    });
  });

  describe('extractToken', () => {
    it('should extract token from Bearer header', () => {
      const token = 'test.jwt.token';
      const header = `Bearer ${token}`;

      const extracted = authService.extractToken(header);
      expect(extracted).toBe(token);
    });

    it('should return null for missing header', () => {
      const extracted = authService.extractToken();
      expect(extracted).toBeNull();
    });

    it('should return null for malformed header', () => {
      const extracted = authService.extractToken('InvalidHeader test');
      expect(extracted).toBeNull();
    });
  });
});
