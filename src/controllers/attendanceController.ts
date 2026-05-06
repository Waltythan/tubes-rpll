import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { attendanceService } from '../services/attendanceService';
import { extractClientIp, isAllowedNetwork } from '../utils/ipCheck';
import { sendResponse } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import { attendanceHistoryQuerySchema, parseWithSchema, positiveIntSchema } from '../utils/requestValidation';

function toErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return {
      status: 'error',
      message: error.message,
      code: error.statusCode,
    };
  }

  return {
    status: 'error',
    message: 'Terjadi kesalahan pada server. Hubungi Admin IT.',
    code: 500,
  };
}

export async function getAttendanceQr(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new ApiError(401, 'Unauthorized');
    }

    const baseUrl = typeof req.headers.origin === 'string' && req.headers.origin.trim().length > 0
      ? req.headers.origin.trim()
      : undefined;

    const qrToken = await attendanceService.generateQrToken(
      parseWithSchema(positiveIntSchema, req.user.id),
      baseUrl
    );
    sendResponse(res, 200, 'QR attendance token generated', qrToken);
  } catch (error) {
    next(error);
  }
}

function mapConfirmAttendanceError(error: unknown): unknown {
  if (!(error instanceof ApiError)) {
    return error;
  }

  const normalized = error.message.toLowerCase();

  if (error.statusCode === 403 && normalized.includes('office')) {
    return new ApiError(403, 'Connect to office WiFi');
  }

  if (error.statusCode === 409 && normalized.includes('check-in hari ini')) {
    return new ApiError(409, 'Already checked in today');
  }

  if (normalized.includes('sudah digunakan')) {
    return new ApiError(400, 'QR already used');
  }

  if (
    normalized.includes('qr token') ||
    normalized.includes('kedaluwarsa') ||
    normalized.includes('tidak valid') ||
    normalized.includes('tidak berlaku') ||
    normalized.includes('sesuai dengan pengguna')
  ) {
    return new ApiError(400, 'QR expired or invalid');
  }

  return error;
}

export async function checkInAttendance(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new ApiError(401, 'Unauthorized');
    }

    const qrToken = req.body?.qrToken;
    if (typeof qrToken !== 'string' || qrToken.trim().length === 0) {
      throw new ApiError(400, 'QR token is required');
    }

    const clientIp = extractClientIp(req as Request);
    const result = await attendanceService.checkIn({
      userId: parseWithSchema(positiveIntSchema, req.user.id),
      qrToken: qrToken.trim(),
      clientIp,
      deviceId: typeof req.body?.deviceId === 'string' ? req.body.deviceId : undefined,
      userAgent: req.headers['user-agent'] || '',
    });

    sendResponse(res, 200, 'Check-in berhasil', result);
  } catch (error) {
    next(error);
  }
}

export async function confirmAttendance(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new ApiError(401, 'Unauthorized');
    }

    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    if (!token) {
      throw new ApiError(400, 'QR expired or invalid');
    }

    const clientIp = extractClientIp(req as Request);
    if (!isAllowedNetwork(clientIp)) {
      throw new ApiError(403, 'Connect to office WiFi');
    }

    try {
      const result = await attendanceService.checkIn({
        userId: parseWithSchema(positiveIntSchema, req.user.id),
        qrToken: token,
        clientIp,
        userAgent: req.headers['user-agent'] || '',
      });

      sendResponse(res, 200, 'Attendance recorded successfully', result);
    } catch (error) {
      throw mapConfirmAttendanceError(error);
    }
  } catch (error) {
    next(error);
  }
}

export async function checkOutAttendance(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new ApiError(401, 'Unauthorized');
    }

    const clientIp = extractClientIp(req as Request);
    const result = await attendanceService.checkOut({
      userId: parseWithSchema(positiveIntSchema, req.user.id),
      clientIp,
      userAgent: req.headers['user-agent'] || '',
    });

    sendResponse(res, 200, 'Check-out berhasil', result);
  } catch (error) {
    next(error);
  }
}

export async function getOwnAttendanceHistory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      throw new ApiError(401, 'Unauthorized');
    }

    const { from, to } = parseWithSchema(attendanceHistoryQuerySchema, {
      from: req.query.from,
      to: req.query.to,
    });
    const rows = await attendanceService.listOwn(parseWithSchema(positiveIntSchema, req.user.id), from, to);
    sendResponse(res, 200, 'Attendance history fetched', rows);
  } catch (error) {
    next(error);
  }
}

export async function getTeamAttendance(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id || !req.user.role) {
      throw new ApiError(401, 'Unauthorized');
    }

    const rows = await attendanceService.listByTeam({
      id: parseWithSchema(positiveIntSchema, req.user.id),
      role: req.user.role,
    });
    sendResponse(res, 200, 'Team attendance fetched', rows);
  } catch (error) {
    next(error);
  }
}

export function attendanceErrorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  const mapped = toErrorResponse(error);
  return res.status(mapped.code).json(mapped);
}