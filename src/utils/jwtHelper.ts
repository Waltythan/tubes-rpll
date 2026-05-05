import jwt from 'jsonwebtoken';
import { ApiError } from './apiError';

const SECRET_KEY = process.env.JWT_SECRET || 'fallback_secret_untuk_dev';
export type UserRole = 'admin' | 'manager' | 'staff';

export type AccessTokenPayload = {
  id: string;
  role: UserRole;
  managerId?: string | null;
  departmentId?: string | null;
};

export const generateToken = (userId: string) => {
  return jwt.sign({ id: userId }, SECRET_KEY, {
    expiresIn: '24h',
  });
};

export const generateAccessToken = (payload: AccessTokenPayload) => {
  return jwt.sign(payload, SECRET_KEY, { expiresIn: '24h' });
};

export const verifyToken = (token: string): any | null => {
  try {
    return jwt.verify(token, SECRET_KEY) as any;
  } catch (err) {
    return null;
  }
};

// Attendance-specific short-lived token helpers
export const generateAttendanceToken = (userId: string, expiresInSeconds = 30) => {
  return jwt.sign({ type: 'attendance' }, SECRET_KEY, { subject: userId, expiresIn: expiresInSeconds });
};

export const verifyAttendanceToken = (token: string) => {
  const payload = jwt.verify(token, SECRET_KEY) as any;
  if (payload.type !== 'attendance') throw new ApiError(400, 'Invalid token type');
  return payload;
};

// Password-reset token helpers
export const generatePasswordResetToken = (userId: string, expiresInMinutes = 15) => {
  return jwt.sign({ type: 'password_reset' }, SECRET_KEY, { subject: userId, expiresIn: `${expiresInMinutes}m` });
};

export const verifyPasswordResetToken = (token: string) => {
  const payload = jwt.verify(token, SECRET_KEY) as any;
  if (payload.type !== 'password_reset') throw new ApiError(400, 'Invalid token type');
  return payload;
};