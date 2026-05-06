import pool from '../../services/db';
import { activityLogService } from '../../services/activityLogService';

jest.mock('../../services/db', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

const mockedPool = pool as unknown as { query: jest.Mock };

describe('activityLogService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should insert activity logs with null defaults for optional fields', async () => {
    mockedPool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 3,
          user_id: 12,
          action: 'profile.updated',
          target_table: 'profiles',
          target_id: '12',
        },
      ],
    });

    const result = await activityLogService.create({
      userId: 12,
      action: 'profile.updated',
      targetTable: 'profiles',
      targetId: '12',
    });

    expect(result.id).toBe(3);
    expect(mockedPool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO activity_logs'),
      [12, 'profile.updated', 'profiles', '12', null, null]
    );
  });

  it('should query logs with filters and default pagination', async () => {
    mockedPool.query.mockResolvedValueOnce({ rows: [] });

    await activityLogService.list({ userId: 8, action: 'login_failed' });

    expect(mockedPool.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = $1 AND action = $2'),
      [8, 'login_failed', 50, 0]
    );
  });
});