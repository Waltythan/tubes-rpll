import express, { NextFunction, Response } from 'express';
import { jwtAuth, AuthRequest } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';
import { leaveService } from '../services/leaveService';
import { sendResponse } from '../utils/apiResponse';
import { leaveRequestSchema, parseWithSchema, positiveIntSchema } from '../utils/requestValidation';

const router = express.Router();

router.use(jwtAuth);

router.post('/', requireRoles('staff', 'manager', 'admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payload = parseWithSchema(leaveRequestSchema, {
      startDate: req.body?.startDate,
      endDate: req.body?.endDate,
      type: req.body?.type || 'annual',
      attachmentUrl: typeof req.body?.attachmentUrl === 'string' ? req.body.attachmentUrl : undefined,
    });

    const created = await leaveService.requestLeave({
      userId: parseWithSchema(positiveIntSchema, req.user!.id),
      startDate: payload.startDate,
      endDate: payload.endDate,
      type: payload.type,
      attachmentUrl: payload.attachmentUrl,
    });

    sendResponse(res, 201, 'Leave request created', created);
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireRoles('staff', 'manager', 'admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await leaveService.listOwn(parseWithSchema(positiveIntSchema, req.user!.id));
    sendResponse(res, 200, 'Own leave requests fetched', rows);
  } catch (error) {
    next(error);
  }
});

router.get('/team', requireRoles('manager', 'admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await leaveService.listTeam(parseWithSchema(positiveIntSchema, req.user!.id), req.user!.role);
    sendResponse(res, 200, 'Team leave requests fetched', rows);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/decision', requireRoles('manager', 'admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const updated = await leaveService.decideLeave({
      requestId: parseWithSchema(positiveIntSchema, req.params.id),
      managerId: parseWithSchema(positiveIntSchema, req.user!.id),
      decision: String(req.body?.decision) === 'approved' ? 'approved' : 'declined',
      role: req.user!.role,
    });

    sendResponse(res, 200, 'Leave request updated', updated);
  } catch (error) {
    next(error);
  }
});

export default router;
