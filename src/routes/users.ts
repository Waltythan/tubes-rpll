import express, { NextFunction, Request, Response } from 'express';
import { jwtAuth, AuthRequest } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';
import { userService } from '../services/userService';
import { sendResponse } from '../utils/apiResponse';
import { parseWithSchema, userCreateSchema, userUpdateSchema, positiveIntSchema } from '../utils/requestValidation';
import { extractClientIp } from '../utils/ipCheck';
import { ApiError } from '../utils/apiError';

const router = express.Router();

type UserPayload = {
  full_name?: string | null;
  name?: string | null;
  email?: string;
  password?: string;
  role?: string;
  managerId?: number | null;
  departmentId?: number | null;
  baseSalary?: number;
};

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asNumberOrNull(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function sanitizeUserPayload(body: unknown): UserPayload {
  const raw = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;

  return {
    full_name: asNonEmptyString(raw.full_name) ?? null,
    name: asNonEmptyString(raw.name),
    email: asNonEmptyString(raw.email),
    password: asNonEmptyString(raw.password),
    role: asNonEmptyString(raw.role),
    managerId: asNumberOrNull(raw.managerId),
    departmentId: asNumberOrNull(raw.departmentId),
    baseSalary: raw.baseSalary === undefined || raw.baseSalary === null || raw.baseSalary === ''
      ? undefined
      : Number(raw.baseSalary),
  };
}

function stripUndefinedFields<T extends Record<string, unknown>>(payload: T): Partial<T> {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined)) as Partial<T>;
}

function sendValidationErrorIfPresent(error: unknown, res: Response): boolean {
  if (error instanceof ApiError && error.statusCode === 400 && Array.isArray(error.details)) {
    res.status(400).json({
      message: 'Invalid user input',
      errors: error.details,
    });
    return true;
  }

  return false;
}

router.use(jwtAuth);

router.get('/', requireRoles('admin', 'manager'), async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await userService.listUsers();
    sendResponse(res, 200, 'Users fetched', rows);
  } catch (error) {
    next(error);
  }
});

router.get('/managers', requireRoles('admin', 'manager'), async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await userService.listManagers();
    sendResponse(res, 200, 'Managers fetched', rows);
  } catch (error) {
    next(error);
  }
});

router.get('/departments', requireRoles('admin', 'manager'), async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await userService.listDepartments();
    sendResponse(res, 200, 'Departments fetched', rows);
  } catch (error) {
    next(error);
  }
});

router.post('/', requireRoles('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const clientIp = extractClientIp(req as Request);
    const userAgent = req.headers['user-agent'] as string | undefined;
    const isDev = process.env.NODE_ENV !== 'production';

    if (isDev) {
      console.log('Incoming user payload:', req.body);
    }

    const sanitizedPayload = stripUndefinedFields(sanitizeUserPayload(req.body));

    if (isDev) {
      console.log('Sanitized payload:', sanitizedPayload);
    }

    const validatedPayload = parseWithSchema(userCreateSchema, sanitizedPayload);

    const created = await userService.createUser(
      validatedPayload,
      parseWithSchema(positiveIntSchema, req.user!.id),
      { ipAddress: clientIp, userAgent: userAgent }
    );
    sendResponse(res, 201, 'User created', created);
  } catch (error) {
    if (sendValidationErrorIfPresent(error, res)) {
      return;
    }
    next(error);
  }
});

router.patch('/:userId', requireRoles('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = parseWithSchema(positiveIntSchema, req.params.userId);
    const clientIp = extractClientIp(req as Request);
    const userAgent = req.headers['user-agent'] as string | undefined;
    const isDev = process.env.NODE_ENV !== 'production';

    if (isDev) {
      console.log('Incoming user payload:', req.body);
    }

    const sanitizedPayload = stripUndefinedFields(sanitizeUserPayload(req.body));

    if (isDev) {
      console.log('Sanitized payload:', sanitizedPayload);
    }

    const validatedPayload = parseWithSchema(userUpdateSchema, sanitizedPayload);

    const updated = await userService.updateUser(
      userId,
      validatedPayload,
      parseWithSchema(positiveIntSchema, req.user!.id),
      { ipAddress: clientIp, userAgent: userAgent }
    );

    sendResponse(res, 200, 'User updated', updated);
  } catch (error) {
    if (sendValidationErrorIfPresent(error, res)) {
      return;
    }
    next(error);
  }
});

router.delete('/:userId', requireRoles('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = parseWithSchema(positiveIntSchema, req.params.userId);
    const clientIp = extractClientIp(req as Request);
    const userAgent = req.headers['user-agent'] as string | undefined;

    const result = await userService.removeUser(
      userId,
      parseWithSchema(positiveIntSchema, req.user!.id),
      { ipAddress: clientIp, userAgent: userAgent }
    );
    sendResponse(res, 200, 'User deleted', result);
  } catch (error) {
    next(error);
  }
});

export default router;
