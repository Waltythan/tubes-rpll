import express, { NextFunction, Request, Response } from 'express';
import { jwtAuth, AuthRequest } from '../middleware/auth';
import { ipCheckMiddleware, extractClientIp } from '../utils/ipCheck';
import { requireRoles } from '../middleware/rbac';
import { attendanceRateLimit } from '../middleware/rateLimit';
import {
  attendanceErrorHandler,
  checkInAttendance,
  checkOutAttendance,
  confirmAttendance,
  getAttendanceQr,
  getOwnAttendanceHistory,
  getTeamAttendance,
} from '../controllers/attendanceController';
import { parseWithSchema, attendanceUpdateSchema, positiveIntSchema } from '../utils/requestValidation';
import { attendanceService } from '../services/attendanceService';
import { sendResponse } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import pool from '../services/db';

const router = express.Router();

router.use(attendanceRateLimit);

// GET /attendance/qr
// Generates a short-lived random token that can be rendered as a QR code by the client.
router.get(
  '/qr',
  jwtAuth,
  (req: AuthRequest, res: Response, next: NextFunction) => getAttendanceQr(req, res, next)
);

// POST /attendance/check-in
// Validates JWT-authenticated user, office IP, QR token freshness, token ownership, and duplicate attendance.
router.post(
  '/check-in',
  jwtAuth,
  requireRoles('staff', 'manager', 'admin'),
  ipCheckMiddleware,
  (req: AuthRequest, res: Response, next: NextFunction) => checkInAttendance(req, res, next)
);

router.post(
  '/confirm',
  (req: Request, res: Response, next: NextFunction) => {
    // Custom middleware: Check for JWT auth OR QR token
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    const hasJwt = req.headers.authorization?.startsWith('Bearer ');

    if (!hasJwt && !token) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized',
        code: 401,
      });
    }

    // If JWT present, use standard JWT auth
    if (hasJwt) {
      jwtAuth(req as AuthRequest, res, (err) => {
        if (err) return next(err);
        requireRoles('staff', 'manager', 'admin')(req as AuthRequest, res, (err) => {
          if (err) return next(err);
          confirmAttendance(req as AuthRequest, res, next);
        });
      });
    } else {
      // Use QR token authentication
      (async () => {
        try {
          const clientIp = extractClientIp(req);
          const result = await confirmAttendanceWithQrToken(
            token,
            clientIp,
            req.headers['user-agent'] as string | undefined
          );
          sendResponse(res, 200, 'Attendance recorded successfully', result);
        } catch (error) {
          next(error);
        }
      })();
    }
  }
);

async function confirmAttendanceWithQrToken(
  token: string,
  clientIp: string,
  userAgent: string | undefined
): Promise<any> {
  if (!token) {
    throw new ApiError(400, 'QR expired or invalid');
  }

  const tokenRes = await pool.query(
    `SELECT user_id FROM qr_tokens WHERE token = $1 AND used = FALSE AND revoked = FALSE LIMIT 1`,
    [token]
  );

  if (tokenRes.rowCount !== 1) {
    throw new ApiError(400, 'QR expired or invalid');
  }

  const userId = tokenRes.rows[0].user_id;
  const { attendanceService } = await import('../services/attendanceService');
  return attendanceService.checkIn({
    userId,
    qrToken: token,
    clientIp,
    userAgent,
  });
}

router.post(
  '/check-out',
  jwtAuth,
  requireRoles('staff', 'manager', 'admin'),
  ipCheckMiddleware,
  (req: AuthRequest, res: Response, next: NextFunction) => checkOutAttendance(req, res, next)
);

router.get(
  '/me',
  jwtAuth,
  requireRoles('staff', 'manager', 'admin'),
  (req: AuthRequest, res: Response, next: NextFunction) => getOwnAttendanceHistory(req, res, next)
);

router.get(
  '/history',
  jwtAuth,
  requireRoles('staff', 'manager', 'admin'),
  (req: AuthRequest, res: Response, next: NextFunction) => getOwnAttendanceHistory(req, res, next)
);

router.get(
  '/team',
  jwtAuth,
  requireRoles('manager', 'admin'),
  (req: AuthRequest, res: Response, next: NextFunction) => getTeamAttendance(req, res, next)
);

// DEBUG: Check token status
router.get(
  '/debug/token/:token',
  jwtAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const tokenStr = req.params.token;
      const result = await attendanceService.debugCheckToken?.(tokenStr);
      sendResponse(res, 200, 'Token debug info', result || { error: 'No debug method' });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /attendance/:id - Admin only: edit attendance record
router.patch('/:id', jwtAuth, requireRoles('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const attendanceId = parseWithSchema(positiveIntSchema, req.params.id);

    const payload = parseWithSchema(attendanceUpdateSchema, req.body || {});

    // additional datetime validation and ordering performed inside service
    const adminUserId = parseWithSchema(positiveIntSchema, req.user?.id);

    const updated = await attendanceService.updateAttendance({
      attendanceId,
      updates: {
        clock_in: payload.clock_in ?? null,
        clock_out: payload.clock_out ?? null,
        status: payload.status ?? null,
      },
      adminUserId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });

    sendResponse(res, 200, 'Attendance updated', updated);
  } catch (err) {
    next(err);
  }
});

// Centralized error mapping for this route only.
router.use(attendanceErrorHandler);

export default router;