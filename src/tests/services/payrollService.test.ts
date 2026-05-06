import pool from '../../services/db';
import { payrollService } from '../../services/payrollService';

jest.mock('../../services/db', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

jest.mock('../../services/activityLogService', () => ({
  __esModule: true,
  activityLogService: {
    create: jest.fn(),
  },
}));

import { activityLogService } from '../../services/activityLogService';

const mockedPool = pool as unknown as { query: jest.Mock; connect: jest.Mock };
const mockedActivityLogService = activityLogService as unknown as { create: jest.Mock };

describe('payrollService', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedPool.connect.mockResolvedValue(mockClient as any);
  });

  describe('generateMonthlyPayroll', () => {
    it('should generate payroll totals for each eligible user', async () => {
      mockedPool.query.mockResolvedValueOnce({
        rows: [{ user_id: 1, base_salary: 5000 }],
      });

      mockClient.query
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [{ id: 10, net_salary: 5000 }] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [{ total: 200 }] })
        .mockResolvedValueOnce({ rows: [{ total: 300 }] })
        .mockResolvedValueOnce({ rows: [{ total: 100 }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 10,
              user_id: 1,
              total_allowance: 500,
              total_deduction: 100,
              net_salary: 5400,
            },
          ],
        })
        .mockResolvedValueOnce({});
      mockedActivityLogService.create.mockResolvedValueOnce({ id: 1 });

      const result = await payrollService.generateMonthlyPayroll(new Date('2026-05-15T00:00:00.000Z'), 9);

      expect(result).toEqual({
        periodStart: '2026-05-01',
        periodEnd: '2026-05-31',
        payrollCount: 1,
        generatedPayrolls: [{ userId: 1, payrollId: 10, netSalary: 5400 }],
      });
      expect(mockedActivityLogService.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 9,
        action: 'payroll.generated',
        targetTable: 'payrolls',
      }));
    });
  });

  describe('addAdjustment', () => {
    it('should fail when payroll does not exist', async () => {
      mockedPool.connect.mockResolvedValueOnce(mockClient as any);
      mockClient.query
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rowCount: 0, rows: [] });

      await expect(
        payrollService.addAdjustment({
          payrollId: 999,
          type: 'allowance',
          amount: 25000,
        })
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Payroll tidak ditemukan',
      });
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });
});