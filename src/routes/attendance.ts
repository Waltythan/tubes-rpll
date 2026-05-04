import express, { NextFunction, Request, Response } from 'express';
import { jwtAuth, AuthRequest } from '../middleware/auth';
import { ipCheckMiddleware } from '../utils/ipCheck';
import { requireRoles } from '../middleware/rbac';
import { attendanceRateLimit } from '../middleware/rateLimit';
import {
  attendanceErrorHandler,
  checkInAttendance,
  checkOutAttendance,
  getAttendanceQr,
  getOwnAttendanceHistory,
  getTeamAttendance,
} from '../controllers/attendanceController';
import { parseWithSchema, attendanceUpdateSchema, positiveIntSchema } from '../utils/requestValidation';
import { attendanceService } from '../services/attendanceService';
import { sendResponse } from '../utils/apiResponse';

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