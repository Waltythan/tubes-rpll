import express, { NextFunction, Request, Response } from 'express';
import { authService } from '../services/authService';
import { sendResponse } from '../utils/apiResponse';
import { loginRateLimit } from '../middleware/rateLimit';
import { extractClientIp } from '../utils/ipCheck';
import { loginSchema, parseWithSchema, forgotPasswordSchema, resetPasswordSchema } from '../utils/requestValidation';

const router = express.Router();

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
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

    // Do not reveal whether the email exists; service will silently return if not found
    await authService.forgotPassword(email);

    sendResponse(res, 200, 'Jika email terdaftar, instruksi untuk mereset password telah dikirim');
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

