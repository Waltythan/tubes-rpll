import express, { NextFunction, Response } from 'express';
import { jwtAuth, AuthRequest } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';
import { userService } from '../services/userService';
import { sendResponse } from '../utils/apiResponse';
import { parseWithSchema, userCreateSchema, userUpdateSchema } from '../utils/requestValidation';

const router = express.Router();

router.use(jwtAuth, requireRoles('admin'));

router.get('/', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await userService.listUsers();
    sendResponse(res, 200, 'Users fetched', rows);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const created = await userService.createUser(parseWithSchema(userCreateSchema, req.body));
    sendResponse(res, 201, 'User created', created);
  } catch (error) {
    next(error);
  }
});

router.patch('/:userId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = Number(req.params.userId);
    const updated = await userService.updateUser(userId, parseWithSchema(userUpdateSchema, req.body));

    sendResponse(res, 200, 'User updated', updated);
  } catch (error) {
    next(error);
  }
});

router.delete('/:userId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = Number(req.params.userId);
    const result = await userService.removeUser(userId);
    sendResponse(res, 200, 'User deleted', result);
  } catch (error) {
    next(error);
  }
});

export default router;
