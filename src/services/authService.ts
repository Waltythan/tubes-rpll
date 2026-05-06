import bcrypt from 'bcrypt';
import { ApiError } from '../utils/apiError';
import { generateAccessToken, generatePasswordResetToken, UserRole, verifyPasswordResetToken } from '../utils/jwtHelper';
import pool from './db';

type LoginResult = {
  accessToken: string;
  user: {
    id: number;
    email: string;
    role: UserRole;
    managerId: number | null;
    departmentId: number | null;
  };
};

async function logFailedLoginAttempt(email: string, clientIp?: string) {
  const userResult = await pool.query(
    'SELECT user_id FROM users WHERE email = $1 LIMIT 1',
    [email]
  );

  const userId = userResult.rowCount === 1 ? userResult.rows[0].user_id : null;

  await pool.query(
    `INSERT INTO activity_logs (user_id, action, ip_address)
     VALUES ($1, $2, $3)`,
    [userId, 'login_failed', clientIp || null]
  );
}

export const authService = {
  async login(email: string, password: string, clientIp?: string): Promise<LoginResult> {
    const result = await pool.query(
      `SELECT user_id, email, password, role, manager_id, department_id
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [email]
    );

    if (result.rowCount !== 1) {
      await logFailedLoginAttempt(email, clientIp);
      throw new ApiError(401, 'Email atau password salah');
    }

    const user = result.rows[0] as {
      user_id: number;
      email: string;
      password: string;
      role: UserRole;
      manager_id: number | null;
      department_id: number | null;
    };

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      await logFailedLoginAttempt(email, clientIp);
      throw new ApiError(401, 'Email atau password salah');
    }

    const accessToken = generateAccessToken({
      id: String(user.user_id),
      role: user.role,
      managerId: user.manager_id ? String(user.manager_id) : null,
      departmentId: user.department_id ? String(user.department_id) : null,
    });

    return {
      accessToken,
      user: {
        id: user.user_id,
        email: user.email,
        role: user.role,
        managerId: user.manager_id,
        departmentId: user.department_id,
      },
    };
  },

  async forgotPassword(email: string) {
    const userResult = await pool.query(
      `SELECT user_id, email FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );

    if (userResult.rowCount !== 1) {
      // Do not reveal whether the email exists — return silently
      return;
    }

    const user = userResult.rows[0] as { user_id: number; email: string };

    const token = generatePasswordResetToken(String(user.user_id), 15);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, used, expires_at)
       VALUES ($1, $2, FALSE, $3)`,
      [user.user_id, token, expiresAt.toISOString()]
    );

    // Demo-friendly: expose token only in development and always log it for local testing.
    console.log('RESET TOKEN:', token);

    if ((process.env.NODE_ENV || 'development') === 'development') {
      return {
        resetToken: token,
      };
    }

    return {};
  },

  async resetPassword(token: string, newPassword: string) {
    // Verify JWT signature & payload first
    let payload: any;
    try {
      payload = verifyPasswordResetToken(token);
    } catch (err) {
      throw new ApiError(400, 'Token tidak valid atau sudah kedaluwarsa');
    }

    const userId = payload.sub;
    if (!userId) {
      throw new ApiError(400, 'Token reset tidak valid');
    }

    // Find token record
    const tokenResult = await pool.query(
      `SELECT id, user_id, used, expires_at FROM password_reset_tokens WHERE token = $1 LIMIT 1`,
      [token]
    );

    if (tokenResult.rowCount !== 1) {
      throw new ApiError(400, 'Token tidak ditemukan atau tidak valid');
    }

    const tokenRow = tokenResult.rows[0] as { id: number; user_id: number; used: boolean; expires_at: string };

    if (tokenRow.used) {
      throw new ApiError(400, 'Token sudah digunakan');
    }

    if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
      throw new ApiError(400, 'Token sudah kedaluwarsa');
    }

    if (String(tokenRow.user_id) !== String(userId)) {
      throw new ApiError(400, 'Token tidak valid untuk user ini');
    }

    // Hash new password and update
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query(`UPDATE users SET password = $1 WHERE user_id = $2`, [hashed, tokenRow.user_id]);

    // Mark token as used
    await pool.query(`UPDATE password_reset_tokens SET used = TRUE WHERE id = $1`, [tokenRow.id]);

    return;
  },
};

