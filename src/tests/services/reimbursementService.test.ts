import pool from '../../services/db';
import { reimbursementService } from '../../services/reimbursementService';

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

describe('reimbursementService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('submit', () => {
    it('should create a reimbursement request and log it', async () => {
      mockedPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 77,
            user_id: 5,
            title: 'Travel reimbursement',
            description: 'Taxi after client visit',
            amount: 125000,
            attachment_url: null,
            status: 'pending',
            request_date: '2026-05-06',
          },
        ],
      });
      mockedActivityLogService.create.mockResolvedValueOnce({ id: 1 });

      const result = await reimbursementService.submit({
        userId: 5,
        title: 'Travel reimbursement',
        description: 'Taxi after client visit',
        amount: 125000,
        ipAddress: '127.0.0.1',
      });

      expect(result.status).toBe('pending');
      expect(mockedActivityLogService.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 5,
        action: 'reimbursement.submitted',
        targetTable: 'reimbursements',
        targetId: '77',
      }));
    });
  });

  describe('decide', () => {
    it('should prevent managers from approving requests outside their scope', async () => {
      mockedPool.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 77, user_id: 5, status: 'pending' }] })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              requester_department_id: 10,
              manager_department_id: 20,
            },
          ],
        });

      await expect(
        reimbursementService.decide({
          reimbursementId: 77,
          approverId: 9,
          decision: 'approved',
          role: 'manager',
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'Manager hanya boleh approve reimbursement subordinate langsung atau 1 departemen',
      });
    });
  });
});