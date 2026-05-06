import express, { NextFunction, Request, Response } from 'express';
import { jwtAuth } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';
import { profileService } from '../services/profileService';
import { ApiError } from '../utils/apiError';
import { sendResponse } from '../utils/apiResponse';
import { extractClientIp } from '../utils/ipCheck';
import { parseWithSchema, positiveIntSchema, profileUpdateSchema } from '../utils/requestValidation';

const router = express.Router();

// Get own profile
router.get('/me', jwtAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as any;
    const user = authReq.user;
    if (!user) throw new ApiError(401, 'Unauthorized');

    const profile = await profileService.getByUserId(parseWithSchema(positiveIntSchema, user.id));
    if (!profile) {
      return sendResponse(res, 200, 'Profile not found', null);
    }
    sendResponse(res, 200, 'Profile retrieved', profile);
  } catch (err) {
    next(err);
  }
});

// Update own profile (staff/manager/admin)
router.patch('/me', jwtAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as any;
    const user = authReq.user;
    if (!user) throw new ApiError(401, 'Unauthorized');

    const payload = parseWithSchema(profileUpdateSchema, req.body || {});
    const clientIp = extractClientIp(req);
    const userAgent = req.headers['user-agent'] as string | undefined;

    const updated = await profileService.upsertProfile(
      parseWithSchema(positiveIntSchema, user.id),
      payload,
      { ipAddress: clientIp, userAgent: userAgent }
    );
    sendResponse(res, 200, 'Profile updated', updated);
  } catch (err) {
    next(err);
  }
});

// Get any user's profile for admin edit screens
router.get('/:userId', jwtAuth, requireRoles('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetId = parseWithSchema(positiveIntSchema, req.params.userId);
    const profile = await profileService.getByUserId(targetId);

    if (!profile) {
      return sendResponse(res, 200, 'Profile not found', null);
    }

    sendResponse(res, 200, 'Profile retrieved', profile);
  } catch (err) {
    next(err);
  }
});

// Admin update any user's profile
router.patch('/:userId', jwtAuth, requireRoles('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetId = parseWithSchema(positiveIntSchema, req.params.userId);
    const authReq = req as any;
    const adminId = parseWithSchema(positiveIntSchema, authReq.user?.id);

    const payload = parseWithSchema(profileUpdateSchema, req.body || {});
    const clientIp = extractClientIp(req);
    const userAgent = req.headers['user-agent'] as string | undefined;

    const updated = await profileService.adminUpdateProfile(
      targetId,
      payload,
      { adminUserId: adminId, ipAddress: clientIp, userAgent: userAgent }
    );
    sendResponse(res, 200, 'Profile updated by admin', updated);
  } catch (err) {
    next(err);
  }
});

export default router;
