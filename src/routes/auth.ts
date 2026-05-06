import express, { NextFunction, Request, Response } from 'express';
import { AuthRequest, jwtAuth } from '../middleware/auth';
import { loginRateLimit } from '../middleware/rateLimit';
import { requireRoles } from '../middleware/rbac';
import { authService } from '../services/authService';
import { passwordResetService } from '../services/passwordResetService';
import { sendResponse } from '../utils/apiResponse';
import { extractClientIp } from '../utils/ipCheck';
import {
    forgotPasswordSchema,
    loginSchema,
    parseWithSchema,
    positiveIntSchema,
    requestResetSchema,
    resetPasswordSchema,
} from '../utils/requestValidation';

const router = express.Router();

router.post('/login', loginRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = parseWithSchema(loginSchema, {
      email: req.body?.email,
      password: req.body?.password,
    });
    const clientIp = extractClientIp(req);

    const result = await authService.login(email, password, clientIp);
    sendResponse(res, 200, 'Login berhasil', result);
  } catch (error) {
    next(error);
  }
});

router.post('/forgot', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = parseWithSchema(forgotPasswordSchema, { email: req.body?.email });

    // Legacy endpoint kept for compatibility, now mapped to admin-approval request flow.
    await passwordResetService.requestReset(email);

    sendResponse(res, 200, 'If the account exists, a reset request has been submitted');
  } catch (error) {
    next(error);
  }
});

router.post('/request-reset', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = parseWithSchema(requestResetSchema, { email: req.body?.email });

    await passwordResetService.requestReset(email);

    sendResponse(res, 200, 'If the account exists, a reset request has been submitted');
  } catch (error) {
    next(error);
  }
});

router.get('/reset-requests', jwtAuth, requireRoles('admin'), async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await passwordResetService.getPendingRequests();
    sendResponse(res, 200, 'Pending reset requests fetched', rows);
  } catch (error) {
    next(error);
  }
});

router.patch('/reset-requests/:id/approve', jwtAuth, requireRoles('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const requestId = parseWithSchema(positiveIntSchema, req.params.id);
    const result = await passwordResetService.approveRequest(requestId);
    sendResponse(res, 200, 'Reset request approved', result);
  } catch (error) {
    next(error);
  }
});

router.patch('/reset-requests/:id/reject', jwtAuth, requireRoles('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const requestId = parseWithSchema(positiveIntSchema, req.params.id);
    const result = await passwordResetService.rejectRequest(requestId);
    sendResponse(res, 200, 'Reset request rejected', result);
  } catch (error) {
    next(error);
  }
});

router.get('/dev/reset-token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if ((process.env.NODE_ENV || 'development') !== 'development') {
      sendResponse(res, 404, 'Not found');
      return;
    }

    const { email } = parseWithSchema(forgotPasswordSchema, { email: req.query?.email });
    const tokenInfo = authService.getLatestResetToken(email);

    sendResponse(res, 200, 'Reset token fetched', tokenInfo);
  } catch (error) {
    next(error);
  }
});

router.post('/reset', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, newPassword } = parseWithSchema(resetPasswordSchema, {
      token: req.body?.token,
      newPassword: req.body?.newPassword,
    });

    await authService.resetPassword(token, newPassword);

    sendResponse(res, 200, 'Password berhasil direset');
  } catch (error) {
    next(error);
  }
});

export default router;

