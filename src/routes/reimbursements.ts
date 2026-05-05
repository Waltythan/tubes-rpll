import express, { NextFunction, Request, Response } from 'express';
import { jwtAuth, AuthRequest } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';
import { reimbursementService } from '../services/reimbursementService';
import { sendResponse } from '../utils/apiResponse';
import { parseWithSchema, reimbursementSubmitSchema, positiveIntSchema } from '../utils/requestValidation';
import { extractClientIp } from '../utils/ipCheck';

const router = express.Router();

router.use(jwtAuth);

router.post('/', requireRoles('staff', 'manager', 'admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payload = parseWithSchema(reimbursementSubmitSchema, {
      title: typeof req.body?.title === 'string' ? req.body.title : undefined,
      description: typeof req.body?.description === 'string' ? req.body.description : undefined,
      amount: req.body?.amount,
      attachmentUrl: typeof req.body?.attachmentUrl === 'string' ? req.body.attachmentUrl : undefined,
    });

    const clientIp = extractClientIp(req as Request);
    const userAgent = req.headers['user-agent'] as string | undefined;

    const created = await reimbursementService.submit({
      userId: parseWithSchema(positiveIntSchema, req.user!.id),
      title: payload.title || payload.description.slice(0, 80) || 'Reimbursement request',
      description: payload.description,
      amount: payload.amount,
      attachmentUrl: payload.attachmentUrl,
      ipAddress: clientIp,
      userAgent: userAgent,
    });

    sendResponse(res, 201, 'Reimbursement submitted', created);
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireRoles('staff', 'manager', 'admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await reimbursementService.listOwn(parseWithSchema(positiveIntSchema, req.user!.id));
    sendResponse(res, 200, 'Own reimbursements fetched', rows);
  } catch (error) {
    next(error);
  }
});

router.get('/team', requireRoles('manager', 'admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await reimbursementService.listTeam(parseWithSchema(positiveIntSchema, req.user!.id), req.user!.role);
    sendResponse(res, 200, 'Team reimbursements fetched', rows);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/decision', requireRoles('manager', 'admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const clientIp = extractClientIp(req as Request);
    const userAgent = req.headers['user-agent'] as string | undefined;

    const updated = await reimbursementService.decide({
      reimbursementId: parseWithSchema(positiveIntSchema, req.params.id),
      approverId: parseWithSchema(positiveIntSchema, req.user!.id),
      decision: String(req.body?.decision) === 'approved' ? 'approved' : 'rejected',
      role: req.user!.role,
      ipAddress: clientIp,
      userAgent: userAgent,
    });

    sendResponse(res, 200, 'Reimbursement updated', updated);
  } catch (error) {
    next(error);
  }
});

export default router;
