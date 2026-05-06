import pool from '../../services/db';
import { profileService } from '../../services/profileService';

jest.mock('../../services/db', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

jest.mock('../../services/activityLogService', () => ({
  __esModule: true,
  activityLogService: {
    create: jest.fn(),
  },
}));

import { activityLogService } from '../../services/activityLogService';

const mockedPool = pool as unknown as { query: jest.Mock };
const mockedActivityLogService = activityLogService as unknown as { create: jest.Mock };

describe('profileService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('upsertProfile', () => {
    it('should update only provided profile fields', async () => {
      mockedPool.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ user_id: 8, full_name: 'Old Name' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              user_id: 8,
              full_name: 'New Name',
              address: 'New Address',
            },
          ],
        });
      mockedActivityLogService.create.mockResolvedValueOnce({ id: 1 });

      const result = await profileService.upsertProfile(8, { full_name: 'New Name', address: 'New Address' });

      expect(result.full_name).toBe('New Name');
      expect(mockedPool.query).toHaveBeenNthCalledWith(2, expect.stringContaining('UPDATE profiles'), [8, 'New Name', 'New Address']);
      expect(mockedActivityLogService.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 8,
        action: 'profile.updated',
        targetTable: 'profiles',
        targetId: '8',
      }));
    });

    it('should create a new profile and fall back to email when full name is missing', async () => {
      mockedPool.query
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ email: 'profileless@example.com' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              user_id: 33,
              full_name: 'profileless@example.com',
            },
          ],
        });
      mockedActivityLogService.create.mockResolvedValueOnce({ id: 2 });

      const result = await profileService.upsertProfile(33, {});

      expect(result.full_name).toBe('profileless@example.com');
      expect(mockedPool.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('INSERT INTO profiles'),
        [33, 'profileless@example.com', null, null, null]
      );
    });
  });

  describe('adminUpdateProfile', () => {
    it('should reject updates for missing users', async () => {
      mockedPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await expect(profileService.adminUpdateProfile(404, { full_name: 'Missing' })).rejects.toMatchObject({
        statusCode: 404,
        message: 'User tidak ditemukan',
      });
    });
  });
});