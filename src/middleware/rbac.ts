import { NextFunction, Response } from 'express';
import { ApiError } from '../utils/apiError';
import { AuthRequest } from './auth';
import { UserRole } from '../utils/jwtHelper';

export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(403, 'Forbidden: insufficient role');
    }

    next();
  };
}

export function requireSelfOrRoles(paramKey: string, ...allowedRoles: UserRole[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    const targetUserId = String(req.params[paramKey] || '');
    if (targetUserId.length === 0) {
      throw new ApiError(400, 'Target user id is required');
    }

    if (req.user.id === targetUserId || allowedRoles.includes(req.user.role)) {
      return next();
    }

    throw new ApiError(403, 'Forbidden: you cannot access this resource');
  };
}
