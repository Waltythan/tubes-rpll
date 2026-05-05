import express, { NextFunction, Request, Response } from 'express';
import { AuthRequest, jwtAuth } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';
import { userService } from '../services/userService';
import { ApiError } from '../utils/apiError';
import { sendResponse } from '../utils/apiResponse';
import { extractClientIp } from '../utils/ipCheck';
import { parseWithSchema, positiveIntSchema, userCreateSchema, userUpdateSchema } from '../utils/requestValidation';

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
    console.log('POST /users body:', req.body);
    const body = req.body || {};
    const creatorId = req.user?.id;
    if (!creatorId) {
      throw new ApiError(401, 'Authenticated user id is missing');
    }
    const clientIp = extractClientIp(req as Request);
    const userAgent = req.headers['user-agent'] as string | undefined;

    const created = await userService.createUser(
      parseWithSchema(userCreateSchema, body),
      parseWithSchema(positiveIntSchema, creatorId),
      { ipAddress: clientIp, userAgent: userAgent }
    );
    sendResponse(res, 201, 'User created', created);
  } catch (error) {
    next(error);
  }
});

router.patch('/:userId', requireRoles('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = parseWithSchema(positiveIntSchema, req.params.userId);
    const clientIp = extractClientIp(req as Request);
    const userAgent = req.headers['user-agent'] as string | undefined;
    const body = req.body || {};
    const updaterId = req.user?.id;
    if (!updaterId) throw new ApiError(401, 'Authenticated user id is missing');

    const updated = await userService.updateUser(
      userId,
      parseWithSchema(userUpdateSchema, body),
      parseWithSchema(positiveIntSchema, updaterId),
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
