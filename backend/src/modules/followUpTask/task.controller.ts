import { Request, Response } from 'express';
import { followUpTaskService } from './task.service';
import { logger } from '../../utils/logger';
import { validate, required } from '../../utils/validation';

export class TaskController {
  async create(req: Request, res: Response) {
    try {
      if (!req.auth) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      validate(req.body, {
        opportunity_id: [required],
        client_id: [required],
        title: [required],
      });

      const task = await followUpTaskService.createTask(req.auth.agencyId, req.body, req.auth.userId);

      res.status(201).json({ success: true, data: task });
    } catch (err: any) {
      logger.error('Create task error', err);

      if (err.errors) {
        return res.status(400).json({ success: false, errors: err.errors });
      }

      res.status(500).json({ success: false, error: 'Failed to create task' });
    }
  }

  async list(req: Request, res: Response) {
    try {
      if (!req.auth) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const tasks = await followUpTaskService.listTasks(req.auth.agencyId, {
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      });

      res.json({ success: true, data: tasks });
    } catch (err) {
      logger.error('List tasks error', err);
      res.status(500).json({ success: false, error: 'Failed to list tasks' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      if (!req.auth) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const task = await followUpTaskService.getTaskById(req.auth.agencyId, req.params.id);

      if (!task) {
        return res.status(404).json({ success: false, error: 'Task not found' });
      }

      res.json({ success: true, data: task });
    } catch (err) {
      logger.error('Get task error', err);
      res.status(500).json({ success: false, error: 'Failed to get task' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      if (!req.auth) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const task = await followUpTaskService.updateTask(req.auth.agencyId, req.params.id, req.body);

      if (!task) {
        return res.status(404).json({ success: false, error: 'Task not found' });
      }

      res.json({ success: true, data: task });
    } catch (err) {
      logger.error('Update task error', err);
      res.status(500).json({ success: false, error: 'Failed to update task' });
    }
  }

  async getByOpportunity(req: Request, res: Response) {
    try {
      if (!req.auth) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const tasks = await followUpTaskService.getTasksByOpportunity(
        req.auth.agencyId,
        req.params.opportunityId
      );

      res.json({ success: true, data: tasks });
    } catch (err) {
      logger.error('Get tasks by opportunity error', err);
      res.status(500).json({ success: false, error: 'Failed to get tasks' });
    }
  }

  async getByClient(req: Request, res: Response) {
    try {
      if (!req.auth) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const tasks = await followUpTaskService.getTasksByClient(req.auth.agencyId, req.params.clientId);

      res.json({ success: true, data: tasks });
    } catch (err) {
      logger.error('Get tasks by client error', err);
      res.status(500).json({ success: false, error: 'Failed to get tasks' });
    }
  }
}

export const taskController = new TaskController();
