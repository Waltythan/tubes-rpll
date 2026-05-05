import { Request, Response, NextFunction } from 'express';
import { UserRole, verifyToken } from '../utils/jwtHelper';

const JWT_REQUIRED_MSG = 'Missing or invalid authorization token';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
    managerId?: string | null;
    departmentId?: string | null;
  };
}

export function jwtAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: JWT_REQUIRED_MSG,
      code: 401,
    });
  }
  const token = auth.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({
      status: 'error',
      message: JWT_REQUIRED_MSG,
      code: 401,
    });
  }
  req.user = {
    id: String(payload.sub || payload.id),
    role: (payload.role || 'staff') as UserRole,
    managerId: payload.managerId ? String(payload.managerId) : null,
    departmentId: payload.departmentId ? String(payload.departmentId) : null,
  };
  next();
}
