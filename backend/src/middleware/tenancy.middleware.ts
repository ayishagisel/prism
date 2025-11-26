import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Middleware to validate that the request's agency_id matches the authenticated user's agency_id
 * This prevents cross-tenant data leakage
 */
export const tenancyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.auth) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const requestAgencyId = req.params.agencyId || req.query.agencyId || req.body?.agencyId;

  // Allow requests where agency_id is inferred from auth context
  if (!requestAgencyId) {
    next();
    return;
  }

  if (requestAgencyId !== req.auth.agencyId) {
    logger.warn('Tenancy violation attempt', {
      userId: req.auth.userId,
      requestedAgency: requestAgencyId,
      userAgency: req.auth.agencyId,
      path: req.path,
    });
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  next();
};
