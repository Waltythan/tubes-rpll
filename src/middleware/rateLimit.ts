import rateLimit from 'express-rate-limit';
import { extractClientIp } from '../utils/ipCheck';

const rateLimitMessage = {
  status: 'error',
  message: 'Terlalu banyak percobaan. Coba lagi nanti.',
  code: 429,
};

export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => extractClientIp(req),
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