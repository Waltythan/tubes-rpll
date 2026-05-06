import express, { NextFunction, Request, Response } from 'express';
import { AuthRequest, jwtAuth } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';
import { payrollService } from '../services/payrollService';
import { sendResponse } from '../utils/apiResponse';
import { extractClientIp } from '../utils/ipCheck';
import { parseWithSchema, payrollAdjustmentSchema, payrollGenerateSchema, positiveIntSchema } from '../utils/requestValidation';

const router = express.Router();

router.use(jwtAuth);

router.post('/generate', requireRoles('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payload = parseWithSchema(payrollGenerateSchema, req.body || {});
    const period = payload.period ? new Date(`${payload.period}T00:00:00.000Z`) : new Date();
    const clientIp = extractClientIp(req as Request);
    const userAgent = req.headers['user-agent'] as string | undefined;

    const result = await payrollService.generateMonthlyPayroll(
      period,
      parseWithSchema(positiveIntSchema, req.user!.id),
      { ipAddress: clientIp, userAgent: userAgent }
    );
    sendResponse(res, 200, 'Payroll generated', result);
  } catch (error) {
    next(error);
  }
});

router.post('/:payrollId/items', requireRoles('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payrollId = parseWithSchema(positiveIntSchema, req.params.payrollId);
    const payload = parseWithSchema(payrollAdjustmentSchema, req.body);
    const clientIp = extractClientIp(req as Request);
    const userAgent = req.headers['user-agent'] as string | undefined;

    const result = await payrollService.addAdjustment({
      payrollId,
      type: payload.type,
      amount: payload.amount,
      description: payload.description,
      referenceId: payload.referenceId,
      adminUserId: parseWithSchema(positiveIntSchema, req.user!.id),
      ipAddress: clientIp,
      userAgent: userAgent,
    });

    sendResponse(res, 201, 'Payroll adjustment added', result);
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireRoles('staff', 'manager', 'admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await payrollService.listOwn(parseWithSchema(positiveIntSchema, req.user!.id));
    sendResponse(res, 200, 'Own payroll fetched', rows);
  } catch (error) {
    next(error);
  }
});

router.get('/all', requireRoles('admin'), async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await payrollService.listAll();
    sendResponse(res, 200, 'All payroll fetched', rows);
  } catch (error) {
    next(error);
  }
});

export default router;
