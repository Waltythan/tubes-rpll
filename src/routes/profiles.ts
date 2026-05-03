import express, { NextFunction, Request, Response } from 'express';
import { jwtAuth } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';
import { profileService } from '../services/profileService';
import { sendResponse } from '../utils/apiResponse';
import { parseWithSchema, profileUpdateSchema } from '../utils/requestValidation';

const router = express.Router();

// Update own profile (staff/manager/admin)
router.patch('/me', jwtAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as any;
    const user = authReq.user;
    if (!user) throw new Error('Unauthorized');

    const payload = parseWithSchema(profileUpdateSchema, req.body || {});

    const updated = await profileService.upsertProfile(Number(user.id), payload);
    sendResponse(res, 200, 'Profile updated', updated);
  } catch (err) {
    next(err);
  }
});

// Admin update any user's profile
router.patch('/:userId', jwtAuth, requireRoles('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetId = Number(req.params.userId);
    if (!Number.isFinite(targetId) || targetId <= 0) {
      throw new Error('Invalid user id');
    }

    const payload = parseWithSchema(profileUpdateSchema, req.body || {});

    const updated = await profileService.adminUpdateProfile(targetId, payload);
    sendResponse(res, 200, 'Profile updated by admin', updated);
  } catch (err) {
    next(err);
  }
});

export default router;
