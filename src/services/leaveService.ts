import pool from './db';
import { ApiError } from '../utils/apiError';

type LeaveInput = {
  userId: number;
  startDate: string;
  endDate: string;
  type: string;
  attachmentUrl?: string;
};

async function isSubordinate(managerId: number, staffUserId: number): Promise<boolean> {
  const result = await pool.query(
    'SELECT 1 FROM users WHERE user_id = $1 AND manager_id = $2 LIMIT 1',
    [staffUserId, managerId]
  );
  return result.rowCount === 1;
}

export const leaveService = {
  async requestLeave(input: LeaveInput) {
    const overlap = await pool.query(
      `SELECT 1
       FROM leave_requests
       WHERE user_id = $1
         AND status IN ('pending', 'approved')
         AND (start_date <= $3::date)
         AND (end_date >= $2::date)
       LIMIT 1`,
      [input.userId, input.startDate, input.endDate]
    );

    if ((overlap.rowCount ?? 0) > 0) {
      throw new ApiError(409, 'Leave request overlap dengan cuti yang sudah ada');
    }

    const result = await pool.query(
      `INSERT INTO leave_requests (user_id, start_date, end_date, type, status, attachment_url)
       VALUES ($1, $2, $3, $4, 'pending', $5)
       RETURNING id, user_id, approved_by, start_date, end_date, type, status, attachment_url, created_at`,
      [input.userId, input.startDate, input.endDate, input.type, input.attachmentUrl || null]
    );

    return result.rows[0];
  },

  async decideLeave(params: {
    requestId: number;
    managerId: number;
    decision: 'approved' | 'declined';
    role: 'admin' | 'manager' | 'staff';
  }) {
    const req = await pool.query(
      'SELECT id, user_id, status FROM leave_requests WHERE id = $1 LIMIT 1',
      [params.requestId]
    );

    if (req.rowCount !== 1) {
      throw new ApiError(404, 'Leave request tidak ditemukan');
    }

    const row = req.rows[0] as { id: number; user_id: number; status: string };
    if (row.status !== 'pending') {
      throw new ApiError(409, 'Leave request sudah diproses');
    }

    if (row.user_id === params.managerId) {
      throw new ApiError(403, 'Request tidak boleh diproses oleh pemilik request sendiri');
    }

    if (params.role === 'manager') {
      const allowed = await isSubordinate(params.managerId, row.user_id);
      if (!allowed) {
        throw new ApiError(403, 'Manager hanya boleh approve request subordinate sendiri');
      }
    } else if (params.role !== 'admin') {
      throw new ApiError(403, 'Forbidden');
    }

    const updated = await pool.query(
      `UPDATE leave_requests
       SET status = $2, approved_by = $3
       WHERE id = $1
       RETURNING id, user_id, approved_by, start_date, end_date, type, status, attachment_url, created_at`,
      [params.requestId, params.decision, params.managerId]
    );

    return updated.rows[0];
  },

  async listOwn(userId: number) {
    const result = await pool.query(
      `SELECT id, user_id, approved_by, start_date, end_date, type, status, attachment_url, created_at
       FROM leave_requests
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async listTeam(managerId: number, role: 'admin' | 'manager' | 'staff') {
    if (role === 'admin') {
      const all = await pool.query(
        `SELECT id, user_id, approved_by, start_date, end_date, type, status, attachment_url, created_at
         FROM leave_requests
         ORDER BY created_at DESC`
      );
      return all.rows;
    }

    if (role !== 'manager') {
      throw new ApiError(403, 'Forbidden');
    }

    const team = await pool.query(
      `SELECT lr.id, lr.user_id, lr.approved_by, lr.start_date, lr.end_date, lr.type, lr.status, lr.attachment_url, lr.created_at
       FROM leave_requests lr
       JOIN users u ON u.user_id = lr.user_id
       WHERE u.manager_id = $1
       ORDER BY lr.created_at DESC`,
      [managerId]
    );

    return team.rows;
  },
};
