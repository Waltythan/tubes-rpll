import bcrypt from 'bcrypt';
import { ApiError } from '../utils/apiError';
import pool from './db';

const DEFAULT_RESET_PASSWORD = 'password123';

type PendingResetRequest = {
  id: number;
  user_id: number;
  user_name: string | null;
  email: string;
  created_at: string;
};

async function findUserByEmail(email: string): Promise<{ user_id: number } | null> {
  const result = await pool.query(
    `SELECT user_id
     FROM users
     WHERE LOWER(email) = LOWER($1)
     LIMIT 1`,
    [email]
  );

  if (result.rowCount !== 1) {
    return null;
  }

  return result.rows[0] as { user_id: number };
}

export const passwordResetService = {
  async requestReset(email: string): Promise<void> {
    const user = await findUserByEmail(email);

    // Keep response generic to avoid user enumeration.
    if (!user) {
      return;
    }

    await pool.query(
      `INSERT INTO password_reset_requests (user_id, status, created_at)
       SELECT $1, 'PENDING', NOW()
       WHERE NOT EXISTS (
         SELECT 1
         FROM password_reset_requests
         WHERE user_id = $1
           AND status = 'PENDING'
       )`,
      [user.user_id]
    );
  },

  async getPendingRequests(): Promise<PendingResetRequest[]> {
    const result = await pool.query(
      `SELECT prr.id,
              prr.user_id,
              COALESCE(p.full_name, u.email) AS user_name,
              u.email,
              prr.created_at
       FROM password_reset_requests prr
       JOIN users u ON u.user_id = prr.user_id
       LEFT JOIN profiles p ON p.user_id = u.user_id
       WHERE prr.status = 'PENDING'
       ORDER BY prr.created_at ASC`
    );

    return result.rows as PendingResetRequest[];
  },

  async approveRequest(id: number): Promise<{ id: number; status: 'APPROVED' }> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const requestResult = await client.query(
        `SELECT id, user_id, status
         FROM password_reset_requests
         WHERE id = $1
         FOR UPDATE`,
        [id]
      );

      if (requestResult.rowCount !== 1) {
        throw new ApiError(404, 'Reset request tidak ditemukan');
      }

      const requestRow = requestResult.rows[0] as { id: number; user_id: number; status: 'PENDING' | 'APPROVED' | 'REJECTED' };
      if (requestRow.status !== 'PENDING') {
        throw new ApiError(409, 'Reset request sudah diproses');
      }

      const hashedPassword = await bcrypt.hash(DEFAULT_RESET_PASSWORD, 10);

      const userUpdate = await client.query(
        `UPDATE users
         SET password = $1
         WHERE user_id = $2`,
        [hashedPassword, requestRow.user_id]
      );

      if (userUpdate.rowCount !== 1) {
        throw new ApiError(404, 'User tidak ditemukan untuk reset request ini');
      }

      await client.query(
        `UPDATE password_reset_requests
         SET status = 'APPROVED', approved_at = NOW()
         WHERE id = $1`,
        [id]
      );

      await client.query('COMMIT');

      return { id, status: 'APPROVED' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async rejectRequest(id: number): Promise<{ id: number; status: 'REJECTED' }> {
    const result = await pool.query(
      `UPDATE password_reset_requests
       SET status = 'REJECTED', approved_at = NULL
       WHERE id = $1
         AND status = 'PENDING'
       RETURNING id`,
      [id]
    );

    if (result.rowCount !== 1) {
      const exists = await pool.query(
        `SELECT id, status
         FROM password_reset_requests
         WHERE id = $1
         LIMIT 1`,
        [id]
      );

      if (exists.rowCount !== 1) {
        throw new ApiError(404, 'Reset request tidak ditemukan');
      }

      throw new ApiError(409, 'Reset request sudah diproses');
    }

    return { id, status: 'REJECTED' };
  },
};
