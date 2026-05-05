import pool from './db';
import { ApiError } from '../utils/apiError';
import bcrypt from 'bcrypt';
import { activityLogService } from './activityLogService';
import { profileService } from './profileService';

type UserCreateInput = {
  departmentId?: number | null;
  email: string;
  full_name?: string | null;
  name?: string | null;
  password: string;
  role: 'admin' | 'manager' | 'staff';
  baseSalary?: number;
  managerId?: number | null;
};

async function validateManagerAssignment(userId: number | null | undefined, managerId: number | null | undefined) {
  if (managerId == null) {
    return;
  }

  if (userId != null && managerId === userId) {
    throw new ApiError(400, 'manager_id tidak boleh sama dengan user_id');
  }

  const managerResult = await pool.query(
    `SELECT user_id, role
     FROM users
     WHERE user_id = $1
     LIMIT 1`,
    [managerId]
  );

  if (managerResult.rowCount !== 1) {
    throw new ApiError(404, 'Manager tidak ditemukan');
  }

  const manager = managerResult.rows[0] as { user_id: number; role: string };
  if (!['manager', 'admin'].includes(manager.role)) {
    throw new ApiError(400, 'Manager harus memiliki role manager atau admin');
  }

  if (userId != null) {
    const cycleCheck = await pool.query(
      `WITH RECURSIVE manager_chain AS (
         SELECT user_id, manager_id
         FROM users
         WHERE user_id = $1

         UNION ALL

         SELECT u.user_id, u.manager_id
         FROM users u
         JOIN manager_chain c ON c.manager_id = u.user_id
       )
       SELECT 1
       FROM manager_chain
       WHERE user_id = $2
       LIMIT 1`,
      [managerId, userId]
    );

    if (cycleCheck.rowCount === 1) {
      throw new ApiError(400, 'Manager assignment tidak valid: menyebabkan siklus hirarki');
    }
  }
}

export const userService = {
  async listUsers() {
    const result = await pool.query(
      `SELECT u.user_id,
              u.department_id,
              d.name AS department_name,
              d.code AS department_code,
              u.email,
              p.full_name,
              u.role,
              u.base_salary,
              u.manager_id,
              m.email AS manager_email,
              u."createdAt" AS created_at
       FROM users u
       LEFT JOIN departments d ON d.dep_id = u.department_id
       LEFT JOIN profiles p ON p.user_id = u.user_id
       LEFT JOIN users m ON m.user_id = u.manager_id
       ORDER BY u.user_id ASC`
    );
    return result.rows;
  },

  async listManagers() {
    const result = await pool.query(
      `SELECT u.user_id,
              u.department_id,
              d.name AS department_name,
              u.email,
              p.full_name,
              u.role
       FROM users u
       LEFT JOIN departments d ON d.dep_id = u.department_id
       LEFT JOIN profiles p ON p.user_id = u.user_id
       WHERE u.role IN ('manager', 'admin')
       ORDER BY u.user_id ASC`
    );

    return result.rows;
  },

  async listDepartments() {
    const result = await pool.query(
      `SELECT dep_id, name, code
       FROM departments
       ORDER BY name ASC`
    );

    return result.rows;
  },

  async createUser(input: UserCreateInput, adminUserId?: number, loggingOptions?: { ipAddress?: string; userAgent?: string }) {
    await validateManagerAssignment(null, input.managerId ?? null);

    const hashedPassword = await bcrypt.hash(input.password, 10);
    const displayName = input.full_name || input.name || null;

    const result = await pool.query(
      `INSERT INTO users (department_id, email, password, role, base_salary, manager_id, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING user_id, department_id, email, role, base_salary, manager_id, "createdAt"`,
      [
        input.departmentId || null,
        input.email,
        hashedPassword,
        input.role,
        Number.isFinite(input.baseSalary) ? input.baseSalary : 0,
        input.managerId || null,
        new Date(),
        new Date(),
      ]
    );

    const row = result.rows[0] as { user_id: number; createdAt?: string };

    if (displayName) {
      await profileService.upsertProfile(row.user_id, { full_name: displayName }, loggingOptions);
    }

    // Log activity
    if (adminUserId) {
      await activityLogService.create({
        userId: adminUserId,
        action: 'user.created',
        targetTable: 'users',
        targetId: String(row.user_id),
        ipAddress: loggingOptions?.ipAddress,
        userAgent: loggingOptions?.userAgent,
      });
    }

    return {
      ...result.rows[0],
      created_at: row.createdAt,
    };
  },

  async updateUser(userId: number, input: Partial<UserCreateInput>, adminUserId?: number, loggingOptions?: { ipAddress?: string; userAgent?: string }) {
    const existing = await pool.query('SELECT user_id FROM users WHERE user_id = $1 LIMIT 1', [userId]);
    if (existing.rowCount !== 1) {
      throw new ApiError(404, 'User tidak ditemukan');
    }

    await validateManagerAssignment(userId, input.managerId ?? null);

    const passwordValue = typeof input.password === 'string'
      ? await bcrypt.hash(input.password, 10)
      : null;

    const result = await pool.query(
      `UPDATE users
       SET department_id = COALESCE($2, department_id),
           email = COALESCE($3, email),
           password = COALESCE($4, password),
           role = COALESCE($5, role),
           base_salary = COALESCE($6, base_salary),
           manager_id = COALESCE($7, manager_id),
           "updatedAt" = NOW()
       WHERE user_id = $1
       RETURNING user_id, department_id, email, role, base_salary, manager_id, "createdAt"`,
      [
        userId,
        input.departmentId ?? null,
        input.email ?? null,
        passwordValue,
        input.role ?? null,
        typeof input.baseSalary === 'number' ? input.baseSalary : null,
        input.managerId ?? null,
      ]
    );

    const displayName = input.full_name || input.name || null;
    if (displayName) {
      await profileService.upsertProfile(userId, { full_name: displayName }, loggingOptions);
    }

    // Log activity
    if (adminUserId) {
      await activityLogService.create({
        userId: adminUserId,
        action: 'user.updated',
        targetTable: 'users',
        targetId: String(userId),
        ipAddress: loggingOptions?.ipAddress,
        userAgent: loggingOptions?.userAgent,
      });
    }

    const row = result.rows[0] as { createdAt?: string };
    return {
      ...result.rows[0],
      created_at: row.createdAt,
    };
  },

  async removeUser(userId: number, adminUserId?: number, loggingOptions?: { ipAddress?: string; userAgent?: string }) {
    const result = await pool.query('DELETE FROM users WHERE user_id = $1 RETURNING user_id', [userId]);
    if (result.rowCount !== 1) {
      throw new ApiError(404, 'User tidak ditemukan');
    }

    // Log activity
    if (adminUserId) {
      await activityLogService.create({
        userId: adminUserId,
        action: 'user.deleted',
        targetTable: 'users',
        targetId: String(userId),
        ipAddress: loggingOptions?.ipAddress,
        userAgent: loggingOptions?.userAgent,
      });
    }

    return { userId };
  },
};
