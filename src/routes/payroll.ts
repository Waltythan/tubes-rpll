import express, { NextFunction, Request, Response } from 'express';
import { AuthRequest, jwtAuth } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';
import { payrollService } from '../services/payrollService';
import { sendResponse } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import { parseWithSchema, payrollAdjustmentSchema, payrollGenerateSchema, positiveIntSchema } from '../utils/requestValidation';
import { extractClientIp } from '../utils/ipCheck';
import { parseWithSchema, payrollAdjustmentSchema, payrollGenerateSchema, positiveIntSchema } from '../utils/requestValidation';

const router = express.Router();

router.use(jwtAuth);

router.post('/generate', requireRoles('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payload = parseWithSchema(payrollGenerateSchema, req.body || {});
    // Construct first day of the requested month in UTC
    const period = new Date(Date.UTC(payload.year, payload.month - 1, 1));
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

router.post('/adjustment', requireRoles('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId, month, year, amount, type, description } = req.body as Record<string, unknown>;
    const parsedUserId = Number(userId);
    const parsedMonth = Number(month);
    const parsedYear = Number(year);
    const parsedAmount = Number(amount);
    const parsedType = String(type || '');

    if (!parsedUserId || parsedUserId <= 0) throw new ApiError(400, 'userId is required');
    if (!parsedMonth || parsedMonth < 1 || parsedMonth > 12) throw new ApiError(400, 'month must be 1-12');
    if (!parsedYear || parsedYear < 2000 || parsedYear > 2100) throw new ApiError(400, 'year is invalid');
    if (!parsedAmount || parsedAmount <= 0) throw new ApiError(400, 'amount must be greater than 0');
    if (parsedType !== 'allowance' && parsedType !== 'deduction') throw new ApiError(400, 'type must be allowance or deduction');

    const clientIp = extractClientIp(req as Request);
    const result = await payrollService.addManualAdjustment({
      userId: parsedUserId,
      month: parsedMonth,
      year: parsedYear,
      amount: parsedAmount,
      type: parsedType as 'allowance' | 'deduction',
      description: String(description || (parsedType === 'allowance' ? 'Manual allowance' : 'Manual penalty')),
      adminUserId: parseWithSchema(positiveIntSchema, req.user!.id),
      ipAddress: clientIp,
      userAgent: req.headers['user-agent'] as string | undefined,
    });
    sendResponse(res, 201, 'Adjustment added', result);
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

router.get('/all', requireRoles('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await payrollService.listAll();
    sendResponse(res, 200, 'All payrolls fetched', rows);
  } catch (error) {
    next(error);
  }
});

router.get('/:payrollId/breakdown', requireRoles('admin', 'manager', 'staff'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payrollId = parseWithSchema(positiveIntSchema, req.params.payrollId);
    
    const breakdown = await payrollService.getBreakdown(
      payrollId,
      parseWithSchema(positiveIntSchema, req.user!.id),
      req.user!.role
    );
    
    sendResponse(res, 200, 'Payroll breakdown fetched', breakdown);
  } catch (error) {
    next(error);
  }
});

export default router;
