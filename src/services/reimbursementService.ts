import pool from './db';
import { ApiError } from '../utils/apiError';

async function isSubordinate(managerId: number, staffUserId: number): Promise<boolean> {
  const result = await pool.query(
    'SELECT 1 FROM users WHERE user_id = $1 AND manager_id = $2 LIMIT 1',
    [staffUserId, managerId]
  );
  return result.rowCount === 1;
}

export const reimbursementService = {
  async submit(params: {
    userId: number;
    title: string;
    description?: string;
    amount: number;
    attachmentUrl?: string;
  }) {
    const result = await pool.query(
      `INSERT INTO reimbursements (user_id, title, description, amount, attachment_url, status, request_date)
       VALUES ($1, $2, $3, $4, $5, 'pending', CURRENT_DATE)
       RETURNING id, user_id, approved_by, payroll_id, title, description, amount, attachment_url, status, request_date`,
      [params.userId, params.title, params.description || null, params.amount, params.attachmentUrl || null]
    );

    return result.rows[0];
  },

  async decide(params: {
    reimbursementId: number;
    approverId: number;
    decision: 'approved' | 'rejected';
    role: 'admin' | 'manager' | 'staff';
  }) {
    const existing = await pool.query(
      'SELECT id, user_id, status FROM reimbursements WHERE id = $1 LIMIT 1',
      [params.reimbursementId]
    );

    if (existing.rowCount !== 1) {
      throw new ApiError(404, 'Reimbursement tidak ditemukan');
    }

    const row = existing.rows[0] as { id: number; user_id: number; status: string };
    if (row.status !== 'pending') {
      throw new ApiError(409, 'Reimbursement sudah diproses');
    }

    if (row.user_id === params.approverId) {
      throw new ApiError(403, 'Request tidak boleh diproses oleh pemilik request sendiri');
    }

    if (params.role === 'manager') {
      const allowed = await isSubordinate(params.approverId, row.user_id);
      if (!allowed) {
        throw new ApiError(403, 'Manager hanya boleh approve reimbursement subordinate sendiri');
      }
    } else if (params.role !== 'admin') {
      throw new ApiError(403, 'Forbidden');
    }

    const updated = await pool.query(
      `UPDATE reimbursements
       SET status = $2, approved_by = $3
       WHERE id = $1
       RETURNING id, user_id, approved_by, payroll_id, title, description, amount, attachment_url, status, request_date`,
      [params.reimbursementId, params.decision, params.approverId]
    );

    return updated.rows[0];
  },

  async listOwn(userId: number) {
    const result = await pool.query(
      `SELECT id, user_id, approved_by, payroll_id, title, description, amount, attachment_url, status, request_date
       FROM reimbursements
       WHERE user_id = $1
       ORDER BY request_date DESC`,
      [userId]
    );
    return result.rows;
  },

  async listTeam(managerId: number, role: 'admin' | 'manager' | 'staff') {
    if (role === 'admin') {
      const all = await pool.query(
        `SELECT id, user_id, approved_by, payroll_id, title, description, amount, attachment_url, status, request_date
         FROM reimbursements
         ORDER BY request_date DESC`
      );
      return all.rows;
    }

    if (role !== 'manager') {
      throw new ApiError(403, 'Forbidden');
    }

    const team = await pool.query(
      `SELECT r.id, r.user_id, r.approved_by, r.payroll_id, r.title, r.description, r.amount, r.attachment_url, r.status, r.request_date
       FROM reimbursements r
       JOIN users u ON u.user_id = r.user_id
       WHERE u.manager_id = $1
       ORDER BY r.request_date DESC`,
      [managerId]
    );

    return team.rows;
  },
};
