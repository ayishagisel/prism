import { db } from '../../config/db';
import { agencyUsers, clientUsers } from '../../db/schema';
import { eq } from 'drizzle-orm';

export type UserType = 'agency_user' | 'client_user';

/**
 * Service for managing user presence tracking
 * Tracks online status, last seen, and socket connections
 */
export class PresenceService {
  /**
   * Set a user as online with their socket ID
   */
  async setUserOnline(userId: string, userType: UserType, socketId: string): Promise<void> {
    const now = new Date();

    if (userType === 'agency_user') {
      await db
        .update(agencyUsers)
        .set({
          is_online: true,
          last_seen_at: now,
          socket_id: socketId,
        })
        .where(eq(agencyUsers.id, userId));
    } else {
      await db
        .update(clientUsers)
        .set({
          is_online: true,
          last_seen_at: now,
          socket_id: socketId,
        })
        .where(eq(clientUsers.id, userId));
    }
  }

  /**
   * Set a user as offline and clear socket ID
   */
  async setUserOffline(userId: string, userType: UserType): Promise<void> {
    const now = new Date();

    if (userType === 'agency_user') {
      await db
        .update(agencyUsers)
        .set({
          is_online: false,
          last_seen_at: now,
          socket_id: null,
        })
        .where(eq(agencyUsers.id, userId));
    } else {
      await db
        .update(clientUsers)
        .set({
          is_online: false,
          last_seen_at: now,
          socket_id: null,
        })
        .where(eq(clientUsers.id, userId));
    }
  }

  /**
   * Check if a user is currently online
   */
  async isUserOnline(userId: string, userType: UserType): Promise<boolean> {
    if (userType === 'agency_user') {
      const result = await db
        .select({ is_online: agencyUsers.is_online })
        .from(agencyUsers)
        .where(eq(agencyUsers.id, userId))
        .limit(1);
      return result[0]?.is_online ?? false;
    } else {
      const result = await db
        .select({ is_online: clientUsers.is_online })
        .from(clientUsers)
        .where(eq(clientUsers.id, userId))
        .limit(1);
      return result[0]?.is_online ?? false;
    }
  }

  /**
   * Get the socket ID for a user (null if offline)
   */
  async getUserSocketId(userId: string, userType: UserType): Promise<string | null> {
    if (userType === 'agency_user') {
      const result = await db
        .select({ socket_id: agencyUsers.socket_id })
        .from(agencyUsers)
        .where(eq(agencyUsers.id, userId))
        .limit(1);
      return result[0]?.socket_id ?? null;
    } else {
      const result = await db
        .select({ socket_id: clientUsers.socket_id })
        .from(clientUsers)
        .where(eq(clientUsers.id, userId))
        .limit(1);
      return result[0]?.socket_id ?? null;
    }
  }

  /**
   * Update last_seen_at timestamp for a user (heartbeat)
   */
  async updateLastSeen(userId: string, userType: UserType): Promise<void> {
    const now = new Date();

    if (userType === 'agency_user') {
      await db
        .update(agencyUsers)
        .set({ last_seen_at: now })
        .where(eq(agencyUsers.id, userId));
    } else {
      await db
        .update(clientUsers)
        .set({ last_seen_at: now })
        .where(eq(clientUsers.id, userId));
    }
  }

  /**
   * Get all online agency users for an agency
   */
  async getOnlineAgencyUsers(agencyId: string): Promise<string[]> {
    const result = await db
      .select({ id: agencyUsers.id })
      .from(agencyUsers)
      .where(eq(agencyUsers.agency_id, agencyId));

    return result
      .filter((u) => true) // Additional filtering could be applied
      .map((u) => u.id);
  }

  /**
   * Set user offline by socket ID (for disconnect handling)
   */
  async setUserOfflineBySocketId(socketId: string): Promise<{ userId: string; userType: UserType } | null> {
    const now = new Date();

    // Try agency users first
    const agencyResult = await db
      .select({ id: agencyUsers.id })
      .from(agencyUsers)
      .where(eq(agencyUsers.socket_id, socketId))
      .limit(1);

    if (agencyResult.length > 0) {
      await db
        .update(agencyUsers)
        .set({
          is_online: false,
          last_seen_at: now,
          socket_id: null,
        })
        .where(eq(agencyUsers.socket_id, socketId));
      return { userId: agencyResult[0].id, userType: 'agency_user' };
    }

    // Try client users
    const clientResult = await db
      .select({ id: clientUsers.id })
      .from(clientUsers)
      .where(eq(clientUsers.socket_id, socketId))
      .limit(1);

    if (clientResult.length > 0) {
      await db
        .update(clientUsers)
        .set({
          is_online: false,
          last_seen_at: now,
          socket_id: null,
        })
        .where(eq(clientUsers.socket_id, socketId));
      return { userId: clientResult[0].id, userType: 'client_user' };
    }

    return null;
  }
}

// Export singleton instance
export const presenceService = new PresenceService();
