import pool from './db';
import { ApiError } from '../utils/apiError';
import { activityLogService } from './activityLogService';

type LeaveInput = {
  userId: number;
  startDate: string;
  endDate: string;
  type: string;
  attachmentUrl?: string;
  ipAddress?: string;
  userAgent?: string;
};

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

  const directSubordinate = row.requester_manager_id === row.manager_user_id;
  const sameDepartment = row.requester_department_id != null
    && row.manager_department_id != null
    && row.requester_department_id === row.manager_department_id;

  if (strictDepartmentApproval) {
    return sameDepartment;
  }

  return directSubordinate || sameDepartment;
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
      `INSERT INTO leave_requests (user_id, start_date, end_date, type, status, attachment_url, "createdAt")
       VALUES ($1, $2, $3, $4, 'pending', $5, NOW())
       RETURNING id, user_id, approved_by, start_date, end_date, type, status, attachment_url, "createdAt"`,
      [input.userId, input.startDate, input.endDate, input.type, input.attachmentUrl || null]
    );

    const leaveRecord = result.rows[0];

    // Log activity
    await activityLogService.create({
      userId: input.userId,
      action: 'leave.request.submitted',
      targetTable: 'leave_requests',
      targetId: String(leaveRecord.id),
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    return leaveRecord;
  },

  async decideLeave(params: {
    requestId: number;
    managerId: number;
    decision: 'approved' | 'declined';
    role: 'admin' | 'manager' | 'staff';
    ipAddress?: string;
    userAgent?: string;
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
      const allowed = await canManagerApprove(params.managerId, row.user_id);
      if (!allowed) {
        throw new ApiError(403, 'Manager hanya boleh approve request subordinate langsung atau 1 departemen');
      }
    } else if (params.role !== 'admin') {
      throw new ApiError(403, 'Forbidden');
    }

    const updated = await pool.query(
      `UPDATE leave_requests
       SET status = $2, approved_by = $3
       WHERE id = $1
       RETURNING id, user_id, approved_by, start_date, end_date, type, status, attachment_url, "createdAt"`,
      [params.requestId, params.decision, params.managerId]
    );

    const updatedRecord = updated.rows[0];

    // Log activity
    await activityLogService.create({
      userId: params.managerId,
      action: `leave.request.${params.decision}`,
      targetTable: 'leave_requests',
      targetId: String(params.requestId),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return updatedRecord;
  },

  async listOwn(userId: number) {
    const result = await pool.query(
      `SELECT id, user_id, approved_by, start_date, end_date, type, status, attachment_url, "createdAt"
       FROM leave_requests
       WHERE user_id = $1
       ORDER BY "createdAt" DESC`,
      [userId]
    );
    return result.rows;
  },

  async listTeam(managerId: number, role: 'admin' | 'manager' | 'staff') {
    if (role === 'admin') {
      const all = await pool.query(
        `SELECT lr.id, lr.user_id, lr.approved_by, lr.start_date, lr.end_date, lr.type, lr.status, lr.attachment_url, lr."createdAt", u.department_id
         FROM leave_requests lr
         JOIN users u ON u.user_id = lr.user_id
         ORDER BY "createdAt" DESC`
      );
      return all.rows;
    }

    if (role !== 'manager') {
      throw new ApiError(403, 'Forbidden');
    }

    const team = await pool.query(
      `SELECT lr.id, lr.user_id, lr.approved_by, lr.start_date, lr.end_date, lr.type, lr.status, lr.attachment_url, lr."createdAt", u.department_id
       FROM leave_requests lr
       JOIN users u ON u.user_id = lr.user_id
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
       ORDER BY lr."createdAt" DESC`,
      [managerId]
    );

    return team.rows;
  },
};
