import rateLimit from 'express-rate-limit';
import type { Request } from 'express';
import { extractClientIp } from '../utils/ipCheck';

const rateLimitMessage = {
  status: 'error',
  message: 'Terlalu banyak percobaan. Coba lagi nanti.',
  code: 429,
};

export const loginRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return `${extractClientIp(req)}:${email || 'unknown'}`;
  },
  message: rateLimitMessage,
});

export const attendanceRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => extractClientIp(req),
  message: rateLimitMessage,
});