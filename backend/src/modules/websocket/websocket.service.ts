import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { authService } from '../auth/auth.service';
import { presenceService, UserType } from './presence.service';
import { logger } from '../../utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userType?: UserType;
  agencyId?: string;
}

/**
 * WebSocket events that can be emitted
 */
export type WebSocketEvent =
  | 'action_item:new'
  | 'action_item:updated'
  | 'chat:message'
  | 'chat:escalated'
  | 'restore:request'
  | 'restore:response'
  | 'notification:new'
  | 'status:updated'
  | 'opportunity:updated'
  | 'task:updated'
  | 'data:refresh';

/**
 * Service for managing WebSocket connections
 * Handles real-time communication between agency and clients
 */
export class WebSocketService {
  private io: SocketServer | null = null;

  /**
   * Initialize Socket.io with the HTTP server
   */
  initialize(httpServer: HttpServer): void {
    this.io = new SocketServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
          return next(new Error('Authentication required'));
        }

        const payload = authService.verifyToken(token);
        if (!payload) {
          return next(new Error('Invalid token'));
        }

        // Attach user info to socket
        socket.userId = payload.userId;
        socket.agencyId = payload.agencyId;
        socket.userType = this.getUserTypeFromRole(payload.role);

        next();
      } catch (err) {
        logger.error('WebSocket authentication error', err);
        next(new Error('Authentication failed'));
      }
    });

    // Connection handler
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });

    logger.info('WebSocket service initialized');
  }

  /**
   * Get the Socket.io server instance
   */
  getIO(): SocketServer | null {
    return this.io;
  }

  /**
   * Handle new socket connection
   */
  private async handleConnection(socket: AuthenticatedSocket): Promise<void> {
    const { userId, userType, agencyId } = socket;

    if (!userId || !userType || !agencyId) {
      logger.warn('Socket connected without user info');
      socket.disconnect();
      return;
    }

    logger.info(`User connected: ${userId} (${userType})`);

    // Set user online
    await presenceService.setUserOnline(userId, userType, socket.id);

    // Join agency room for agency-wide broadcasts
    socket.join(`agency:${agencyId}`);

    // Join user-specific room for direct messages
    socket.join(`user:${userId}`);

    // Handle heartbeat for presence updates
    socket.on('heartbeat', async () => {
      await presenceService.updateLastSeen(userId, userType);
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      await this.handleDisconnection(socket);
    });

    // Handle errors
    socket.on('error', (err) => {
      logger.error(`Socket error for user ${userId}:`, err);
    });
  }

  /**
   * Handle socket disconnection
   */
  async handleDisconnection(socket: AuthenticatedSocket): Promise<void> {
    const { userId, userType } = socket;

    if (userId && userType) {
      logger.info(`User disconnected: ${userId} (${userType})`);
      await presenceService.setUserOffline(userId, userType);
    } else {
      // Try to find user by socket ID
      await presenceService.setUserOfflineBySocketId(socket.id);
    }
  }

  /**
   * Emit an event to a specific user
   */
  async emitToUser(userId: string, userType: UserType, event: WebSocketEvent, data: any): Promise<boolean> {
    if (!this.io) {
      logger.warn('WebSocket service not initialized');
      return false;
    }

    const socketId = await presenceService.getUserSocketId(userId, userType);
    if (!socketId) {
      logger.debug(`User ${userId} is offline, cannot emit ${event}`);
      return false;
    }

    this.io.to(`user:${userId}`).emit(event, data);
    return true;
  }

  /**
   * Emit an event to all users in an agency
   */
  emitToAgency(agencyId: string, event: WebSocketEvent, data: any): void {
    if (!this.io) {
      logger.warn('WebSocket service not initialized');
      return;
    }

    this.io.to(`agency:${agencyId}`).emit(event, data);
  }

  /**
   * Emit an event to a specific room
   */
  emitToRoom(room: string, event: WebSocketEvent, data: any): void {
    if (!this.io) {
      logger.warn('WebSocket service not initialized');
      return;
    }

    this.io.to(room).emit(event, data);
  }

  /**
   * Check if a user is currently connected
   */
  async isUserConnected(userId: string, userType: UserType): Promise<boolean> {
    return presenceService.isUserOnline(userId, userType);
  }

  /**
   * Get user type from role
   */
  private getUserTypeFromRole(role: string): UserType {
    if (role === 'CLIENT_USER' || role === 'CLIENT_OWNER' || role === 'CLIENT_TEAM') {
      return 'client_user';
    }
    return 'agency_user';
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
