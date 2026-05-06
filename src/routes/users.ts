import express, { NextFunction, Request, Response } from 'express';
import { AuthRequest, jwtAuth } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';
import { userService } from '../services/userService';
import { ApiError } from '../utils/apiError';
import { sendResponse } from '../utils/apiResponse';
import { extractClientIp } from '../utils/ipCheck';
import {
  parseWithSchema,
  positiveIntSchema,
  sanitizeUserPayload,
  stripUndefinedFields,
  userCreateSchema,
  userUpdateSchema,
} from '../utils/requestValidation';

const router = express.Router();

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
    const body = req.body || {}
    const creatorId = req.user?.id
    if (!creatorId) throw new ApiError(401, 'Authenticated user id is missing')

    const clientIp = extractClientIp(req as Request)
    const userAgent = req.headers['user-agent'] as string | undefined

    const sanitized = stripUndefinedFields(sanitizeUserPayload(body))
    const validatedPayload = parseWithSchema(userCreateSchema, sanitized)

    const created = await userService.createUser(
      validatedPayload,
      parseWithSchema(positiveIntSchema, creatorId),
      { ipAddress: clientIp, userAgent }
    )

    sendResponse(res, 201, 'User created', created)
  } catch (error) {
    next(error)
  }
})

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
    next(error);
  }
});

router.delete('/:userId', requireRoles('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = parseWithSchema(positiveIntSchema, req.params.userId);
    const clientIp = extractClientIp(req as Request);
    const userAgent = req.headers['user-agent'] as string | undefined;
    const deleterId = req.user?.id;
    if (!deleterId) throw new ApiError(401, 'Authenticated user id is missing');

    const result = await userService.removeUser(
      userId,
      parseWithSchema(positiveIntSchema, deleterId),
      { ipAddress: clientIp, userAgent: userAgent }
    );
    sendResponse(res, 200, 'User deleted', result);
  } catch (error) {
    next(error);
  }
});

export default router;
