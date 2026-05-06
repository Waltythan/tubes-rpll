import pool from './db';
import { ApiError } from '../utils/apiError';
import { activityLogService } from './activityLogService';
import { enrichWithUserAndApprover } from '../utils/userEnricher';

const strictDepartmentApproval = String(process.env.STRICT_DEPARTMENT_APPROVAL || '').toLowerCase() === 'true';

async function canManagerApprove(managerId: number, staffUserId: number): Promise<boolean> {
  const result = await pool.query(
    `SELECT requester.user_id,
            requester.manager_id AS requester_manager_id,
            requester.department_id AS requester_department_id,
            manager.user_id AS manager_user_id,
            manager.department_id AS manager_department_id
     FROM users requester
     JOIN users manager ON manager.user_id = $2
     WHERE requester.user_id = $1
     LIMIT 1`,
    [staffUserId, managerId]
  );

  if (result.rowCount !== 1) {
    return false;
  }

  const row = result.rows[0] as {
    requester_manager_id: number | null;
    requester_department_id: number | null;
    manager_user_id: number;
    manager_department_id: number | null;
  };

  const sameDepartment = row.requester_department_id != null
    && row.manager_department_id != null
    && row.requester_department_id === row.manager_department_id;

  // Enforce manager approval only within same department. Admins bypass handled by caller.
  return sameDepartment;
}

export const reimbursementService = {
  async submit(params: {
    userId: number;
    title: string;
    description?: string;
    amount: number;
    attachmentUrl?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const result = await pool.query(
      `INSERT INTO reimbursements (user_id, title, description, amount, attachment_url, status, request_date)
       VALUES ($1, $2, $3, $4, $5, 'pending', CURRENT_DATE)
       RETURNING id, user_id, approved_by, payroll_id, title, description, amount, attachment_url, status, request_date`,
      [params.userId, params.title, params.description || null, params.amount, params.attachmentUrl || null]
    );

    const reimbursementRecord = result.rows[0];

    // Log activity
    await activityLogService.create({
      userId: params.userId,
      action: 'reimbursement.submitted',
      targetTable: 'reimbursements',
      targetId: String(reimbursementRecord.id),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return reimbursementRecord;
  },

  async decide(params: {
    reimbursementId: number;
    approverId: number;
    decision: 'approved' | 'rejected';
    role: 'admin' | 'manager' | 'staff';
    ipAddress?: string;
    userAgent?: string;
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
      const allowed = await canManagerApprove(params.approverId, row.user_id);
      if (!allowed) {
        throw new ApiError(403, 'Manager hanya boleh approve reimbursement subordinate langsung atau 1 departemen');
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

    const updatedRecord = updated.rows[0];

    // Log activity
    await activityLogService.create({
      userId: params.approverId,
      action: `reimbursement.${params.decision}`,
      targetTable: 'reimbursements',
      targetId: String(params.reimbursementId),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return updatedRecord;
  },

  async listOwn(userId: number) {
    const result = await pool.query(
      `SELECT id, user_id, approved_by, payroll_id, title, description, amount, attachment_url, status, request_date
       FROM reimbursements
       WHERE user_id = $1
       ORDER BY request_date DESC`,
      [userId]
    );
    return enrichWithUserAndApprover(result.rows);
  },

  async listTeam(managerId: number, role: 'admin' | 'manager' | 'staff') {
    if (role === 'admin') {
      const all = await pool.query(
        `SELECT r.id, r.user_id, r.approved_by, r.payroll_id, r.title, r.description, r.amount, r.attachment_url, r.status, r.request_date, u.department_id
         FROM reimbursements r
         JOIN users u ON u.user_id = r.user_id
         ORDER BY request_date DESC`
      );
      return enrichWithUserAndApprover(all.rows);
    }

    if (role !== 'manager') {
      throw new ApiError(403, 'Forbidden');
    }

    const team = await pool.query(
      `SELECT r.id, r.user_id, r.approved_by, r.payroll_id, r.title, r.description, r.amount, r.attachment_url, r.status, r.request_date, u.department_id
       FROM reimbursements r
       JOIN users u ON u.user_id = r.user_id
       JOIN users manager ON manager.user_id = $1
       WHERE u.user_id <> $1
         AND (
           u.manager_id = $1
           OR (
             u.department_id IS NOT NULL
             AND manager.department_id IS NOT NULL
             AND u.department_id = manager.department_id
           )
         )
       ORDER BY r.request_date DESC`,
      [managerId]
    );

    return enrichWithUserAndApprover(team.rows);
  },
};
