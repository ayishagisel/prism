import { db } from '../../config/db';
import { followUpTasks } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { logger } from '../../utils/logger';
import { CreateFollowUpTaskInput } from '../../types';

export class FollowUpTaskService {
  async createTask(agencyId: string, input: CreateFollowUpTaskInput, createdByUserId?: string) {
    try {
      const id = `task_${uuid()}`;

      const task = await db
        .insert(followUpTasks)
        .values({
          id,
          agency_id: agencyId,
          opportunity_id: input.opportunity_id,
          client_id: input.client_id,
          assigned_to_user_id: input.assigned_to_user_id || null,
          title: input.title,
          description: input.description,
          due_at: input.due_at ? new Date(input.due_at) : null,
          status: 'pending' as any,
          task_type: (input.task_type || 'other') as any,
          priority: input.priority || 'normal',
          created_by_user_id: createdByUserId || 'system_auto',
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      logger.info('Task created', { taskId: id });
      return task[0];
    } catch (err) {
      logger.error('Create task error', err);
      throw err;
    }
  }

  /**
   * Auto-create follow-up tasks when client accepts or expresses interest
   */
  async createAutoTasks(
    agencyId: string,
    opportunityId: string,
    clientId: string,
    responseState: 'accepted' | 'interested'
  ) {
    try {
      const autoTasks: CreateFollowUpTaskInput[] = [];

      if (responseState === 'accepted') {
        // Create briefing task
        autoTasks.push({
          opportunity_id: opportunityId,
          client_id: clientId,
          title: 'Schedule pre-interview briefing',
          description:
            'Align talking points, confirm availability, and share relevant guidelines.',
          task_type: 'briefing',
          priority: 'high',
          due_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
        });

        // Create asset collection task
        autoTasks.push({
          opportunity_id: opportunityId,
          client_id: clientId,
          title: 'Collect client assets',
          description: 'Gather headshots, bio, company materials as needed.',
          task_type: 'asset_collection',
          priority: 'normal',
          due_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        });

        // Create follow-up task
        autoTasks.push({
          opportunity_id: opportunityId,
          client_id: clientId,
          title: 'Schedule media appearance',
          description: 'Coordinate with outlet and confirm all details.',
          task_type: 'scheduling',
          priority: 'high',
          due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        });
      } else if (responseState === 'interested') {
        // Create follow-up task for interested responses
        autoTasks.push({
          opportunity_id: opportunityId,
          client_id: clientId,
          title: 'Follow up on interest',
          description: 'Check in with client about opportunity details and next steps.',
          task_type: 'follow_up',
          priority: 'normal',
          due_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
        });
      }

      // Create all tasks
      for (const taskInput of autoTasks) {
        await this.createTask(agencyId, taskInput, 'system_auto');
      }

      logger.info('Auto tasks created', {
        opportunityId,
        clientId,
        responseState,
        taskCount: autoTasks.length,
      });

      return autoTasks.length;
    } catch (err) {
      logger.error('Create auto tasks error', err);
      throw err;
    }
  }

  async getTaskById(agencyId: string, taskId: string) {
    try {
      return await db.query.followUpTasks.findFirst({
        where: and(eq(followUpTasks.agency_id, agencyId), eq(followUpTasks.id, taskId)),
      });
    } catch (err) {
      logger.error('Get task error', err);
      throw err;
    }
  }

  async listTasks(
    agencyId: string,
    filters?: {
      status?: string;
      clientId?: string;
      opportunityId?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    try {
      return await db.query.followUpTasks.findMany({
        where: eq(followUpTasks.agency_id, agencyId),
        orderBy: desc(followUpTasks.due_at),
        limit: filters?.limit || 50,
        offset: filters?.offset || 0,
      });
    } catch (err) {
      logger.error('List tasks error', err);
      throw err;
    }
  }

  async updateTask(
    agencyId: string,
    taskId: string,
    data: Partial<CreateFollowUpTaskInput & { status: string }>
  ) {
    try {
      const updated = await db
        .update(followUpTasks)
        .set({
          ...(data.title && { title: data.title }),
          ...(data.description && { description: data.description }),
          ...(data.status && { status: data.status as any }),
          ...(data.priority && { priority: data.priority }),
          updated_at: new Date(),
        })
        .where(and(eq(followUpTasks.agency_id, agencyId), eq(followUpTasks.id, taskId)))
        .returning();

      logger.info('Task updated', { taskId });
      return updated[0] || null;
    } catch (err) {
      logger.error('Update task error', err);
      throw err;
    }
  }

  async getTasksByOpportunity(agencyId: string, opportunityId: string) {
    try {
      return await db.query.followUpTasks.findMany({
        where: and(
          eq(followUpTasks.agency_id, agencyId),
          eq(followUpTasks.opportunity_id, opportunityId)
        ),
        orderBy: desc(followUpTasks.due_at),
      });
    } catch (err) {
      logger.error('Get tasks by opportunity error', err);
      throw err;
    }
  }

  async getTasksByClient(agencyId: string, clientId: string) {
    try {
      return await db.query.followUpTasks.findMany({
        where: and(
          eq(followUpTasks.agency_id, agencyId),
          eq(followUpTasks.client_id, clientId)
        ),
        orderBy: desc(followUpTasks.due_at),
      });
    } catch (err) {
      logger.error('Get tasks by client error', err);
      throw err;
    }
  }
}

export const followUpTaskService = new FollowUpTaskService();
