import express, { NextFunction, Response } from 'express';
import { jwtAuth, AuthRequest } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';
import { payrollService } from '../services/payrollService';
import { sendResponse } from '../utils/apiResponse';
import { parseWithSchema, payrollAdjustmentSchema } from '../utils/requestValidation';

const router = express.Router();

router.use(jwtAuth);

router.post('/generate', requireRoles('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const period = typeof req.body?.period === 'string' ? new Date(req.body.period) : new Date();
    const result = await payrollService.generateMonthlyPayroll(period);
    sendResponse(res, 200, 'Payroll generated', result);
  } catch (error) {
    next(error);
  }
});

router.post('/:payrollId/items', requireRoles('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payrollId = Number(req.params.payrollId);
    const payload = parseWithSchema(payrollAdjustmentSchema, req.body);

    const result = await payrollService.addAdjustment({
      payrollId,
      type: payload.type,
      amount: payload.amount,
      description: payload.description,
      referenceId: payload.referenceId,
    });

    sendResponse(res, 201, 'Payroll adjustment added', result);
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireRoles('staff', 'manager', 'admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await payrollService.listOwn(Number(req.user!.id));
    sendResponse(res, 200, 'Own payroll fetched', rows);
  } catch (error) {
    next(error);
  }
});

export default router;
