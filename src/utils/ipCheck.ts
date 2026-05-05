import { NextFunction, Request, Response } from 'express';

const OFFICE_IP_PREFIX = process.env.OFFICE_IP_PREFIX || '192.168.';
const OFFICE_IP = process.env.OFFICE_IP || '';

function normalizeIp(ip: string): string {
  return ip.trim().replace(/^::ffff:/, '').replace(/^\[|\]$/g, '');
}

export function getClientIp(req: Partial<Pick<Request, 'headers' | 'socket' | 'ip'>>) {
  const forwardedFor = req.headers?.['x-forwarded-for'];
  const forwardedIp = typeof forwardedFor === 'string' ? forwardedFor.split(',')[0].trim() : '';
  const socketIp = req.socket?.remoteAddress || '';
  const expressIp = req.ip || '';

  return normalizeIp(forwardedIp || socketIp || expressIp);
}

export function extractClientIp(req: Partial<Pick<Request, 'headers' | 'socket' | 'ip'>>) {
  return getClientIp(req);
}

function isLocalhostIp(ip: string): boolean {
  const normalized = normalizeIp(ip);
  return normalized === '127.0.0.1' || normalized === '::1' || normalized === 'localhost';
}

export function isOfficeIp(ip: string, env = process.env.NODE_ENV || 'development') {
  const normalized = normalizeIp(ip);

  if (!normalized) {
    return false;
  }

  if (env === 'development') {
    return true;
  }

  const exactOfficeIps = OFFICE_IP.split(',').map((value) => normalizeIp(value)).filter(Boolean);
  if (exactOfficeIps.includes(normalized)) {
    return true;
  }

  if (OFFICE_IP_PREFIX) {
    return normalized.startsWith(OFFICE_IP_PREFIX) || isLocalhostIp(normalized);
  }

  return false;
}

function getAttendanceActionLabel(req: Request): 'check-in' | 'check-out' {
  return req.path.includes('check-out') ? 'check-out' : 'check-in';
}

export const ipCheckMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const userIp = getClientIp(req);

  if (process.env.NODE_ENV !== 'development' && !isOfficeIp(userIp)) {
    const action = getAttendanceActionLabel(req);
    return res.status(403).json({
      status: 'error',
      message: `${action === 'check-in' ? 'Check-in' : 'Check-out'} only allowed from office network`,
      code: 403,
    });
  }

  next();
};