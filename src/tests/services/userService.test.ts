import bcrypt from 'bcrypt';
import pool from '../../services/db';
import { userService } from '../../services/userService';

jest.mock('../../services/db', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

jest.mock('bcrypt', () => ({
  __esModule: true,
  default: {
    hash: jest.fn(),
  },
}));

jest.mock('../../services/profileService', () => ({
  __esModule: true,
  profileService: {
    upsertProfile: jest.fn(),
  },
}));

jest.mock('../../services/activityLogService', () => ({
  __esModule: true,
  activityLogService: {
    create: jest.fn(),
  },
}));

import { activityLogService } from '../../services/activityLogService';
import { profileService } from '../../services/profileService';

const mockedPool = pool as unknown as { query: jest.Mock };
const mockedBcrypt = bcrypt as unknown as { hash: jest.Mock };
const mockedProfileService = profileService as unknown as { upsertProfile: jest.Mock };
const mockedActivityLogService = activityLogService as unknown as { create: jest.Mock };

describe('userService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a user and write the profile full name when provided', async () => {
      mockedBcrypt.hash.mockResolvedValueOnce('hashed-password');
      mockedPool.query.mockResolvedValueOnce({
        rows: [
          {
            user_id: 21,
            department_id: 4,
            email: 'new.staff@example.com',
            role: 'staff',
            base_salary: 0,
            manager_id: null,
            createdAt: '2026-05-06T00:00:00.000Z',
          },
        ],
      });
      mockedProfileService.upsertProfile.mockResolvedValueOnce({ user_id: 21 });
      mockedActivityLogService.create.mockResolvedValueOnce({ id: 1 });

      const result = await userService.createUser(
        {
          email: 'new.staff@example.com',
          password: 'secret123',
          role: 'staff',
          full_name: 'New Staff',
          departmentId: 4,
        },
        99,
        { ipAddress: '127.0.0.1', userAgent: 'jest' }
      );

      expect(result.user_id).toBe(21);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('secret123', 10);
      expect(mockedProfileService.upsertProfile).toHaveBeenCalledWith(
        21,
        { full_name: 'New Staff' },
        { ipAddress: '127.0.0.1', userAgent: 'jest' }
      );
      expect(mockedActivityLogService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 99,
          action: 'user.created',
          targetTable: 'users',
          targetId: '21',
        })
      );
    });
  });

  describe('updateUser', () => {
    it('should reject a self-manager assignment', async () => {
      mockedPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ user_id: 5 }] });

      await expect(userService.updateUser(5, { managerId: 5 })).rejects.toMatchObject({
        statusCode: 400,
        message: 'manager_id tidak boleh sama dengan user_id',
      });
      expect(mockedPool.query).toHaveBeenCalledTimes(1);
    });

    it('should fail when target user does not exist', async () => {
      mockedPool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await expect(userService.updateUser(999, { email: 'missing@example.com' })).rejects.toMatchObject({
        statusCode: 404,
        message: 'User tidak ditemukan',
      });
    });
  });
});