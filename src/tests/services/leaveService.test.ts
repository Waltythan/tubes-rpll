import pool from '../../services/db';
import { leaveService } from '../../services/leaveService';

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

describe('leaveService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestLeave', () => {
    it('should reject overlapping leave requests', async () => {
      mockedPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ 1: 1 }] });

      await expect(
        leaveService.requestLeave({
          userId: 5,
          startDate: '2026-05-10',
          endDate: '2026-05-12',
          type: 'annual',
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        message: 'Leave request overlap dengan cuti yang sudah ada',
      });
    });
  });

  describe('decideLeave', () => {
    it('should allow admin to approve pending leave requests', async () => {
      mockedPool.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 44, user_id: 5, status: 'pending' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 44,
              user_id: 5,
              approved_by: 2,
              start_date: '2026-05-10',
              end_date: '2026-05-12',
              type: 'annual',
              status: 'approved',
              attachment_url: null,
              createdAt: '2026-05-06T00:00:00.000Z',
            },
          ],
        });
      mockedActivityLogService.create.mockResolvedValueOnce({ id: 1 });

      const result = await leaveService.decideLeave({
        requestId: 44,
        managerId: 2,
        decision: 'approved',
        role: 'admin',
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      });

      expect(result.status).toBe('approved');
      expect(mockedActivityLogService.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 2,
        action: 'leave.request.approved',
        targetTable: 'leave_requests',
        targetId: '44',
      }));
    });
  });
});