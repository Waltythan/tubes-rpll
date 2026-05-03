import pool from './db';
import { ApiError } from '../utils/apiError';
import bcrypt from 'bcrypt';

type UserCreateInput = {
  departmentId?: number | null;
  email: string;
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
  if (manager.role !== 'manager') {
    throw new ApiError(400, 'Manager harus memiliki role manager');
  }
}

export const userService = {
  async listUsers() {
    const result = await pool.query(
      `SELECT user_id, department_id, email, role, base_salary, manager_id, "createdAt" AS created_at
       FROM users
       ORDER BY user_id ASC`
    );
    return result.rows;
  },

  async createUser(input: UserCreateInput) {
    await validateManagerAssignment(null, input.managerId ?? null);

    const hashedPassword = await bcrypt.hash(input.password, 10);

    const result = await pool.query(
      `INSERT INTO users (department_id, email, password, role, base_salary, manager_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING user_id, department_id, email, role, base_salary, manager_id, "createdAt"`,
      [
        input.departmentId || null,
        input.email,
        hashedPassword,
        input.role,
        Number.isFinite(input.baseSalary) ? input.baseSalary : 0,
        input.managerId || null,
      ]
    );

    const row = result.rows[0] as { createdAt?: string };
    return {
      ...result.rows[0],
      created_at: row.createdAt,
    };
  },

  async updateUser(userId: number, input: Partial<UserCreateInput>) {
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
           manager_id = COALESCE($7, manager_id)
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

    const row = result.rows[0] as { createdAt?: string };
    return {
      ...result.rows[0],
      created_at: row.createdAt,
    };
  },

  async removeUser(userId: number) {
    const result = await pool.query('DELETE FROM users WHERE user_id = $1 RETURNING user_id', [userId]);
    if (result.rowCount !== 1) {
      throw new ApiError(404, 'User tidak ditemukan');
    }
    return { userId };
  },
};
