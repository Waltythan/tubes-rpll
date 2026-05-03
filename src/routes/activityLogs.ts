import express, { NextFunction, Request, Response } from 'express';
import { jwtAuth } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';
import { parseWithSchema, activityLogsQuerySchema } from '../utils/requestValidation';
import { activityLogService } from '../services/activityLogService';
import { sendResponse } from '../utils/apiResponse';

const router = express.Router();

// GET /activity-logs?limit=50&offset=0&userId=1&action=login_failed
router.get('/', jwtAuth, requireRoles('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = parseWithSchema(activityLogsQuerySchema, {
      limit: req.query.limit,
      offset: req.query.offset,
      userId: req.query.userId,
      action: req.query.action,
    });

    const rows = await activityLogService.list({
      limit: q.limit,
      offset: q.offset,
      userId: q.userId,
      action: q.action,
    });

    sendResponse(res, 200, 'Activity logs fetched', { rows });
  } catch (err) {
    next(err);
  }
});

export default router;
