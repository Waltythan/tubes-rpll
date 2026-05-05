import { Request, Response, NextFunction } from 'express';

const OFFICE_IP_PREFIX = process.env.OFFICE_IP_PREFIX || '192.168.';

export function extractClientIp(req: Partial<Pick<Request, 'headers' | 'socket' | 'ip'>>) {
  // Prioritas: req.ip (diatur oleh Express trust proxy) > x-forwarded-for > socket remoteAddress
  if (typeof req.ip === 'string' && req.ip.trim().length > 0) {
    return req.ip.replace(/^::ffff:/, '');
  }

  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim().length > 0) {
    return forwardedFor.split(',')[0].trim().replace(/^::ffff:/, '');
  }

  return (req.socket.remoteAddress || '').replace(/^::ffff:/, '');
}

export function isOfficeIp(ip: string, allowedPrefix = OFFICE_IP_PREFIX) {
  return ip.startsWith(allowedPrefix);
}

export const ipCheckMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const userIp = extractClientIp(req);

  if (!isOfficeIp(userIp)) {
    return res.status(403).json({
      status: 'error',
      message: `Akses ditolak. IP Anda (${userIp || 'unknown'}) tidak terdaftar dalam jaringan kantor.`,
      code: 403,
    });
  }

  next();
};