import pool from './db';
import { ApiError } from '../utils/apiError';

type ProfileUpdate = {
  address?: string | null;
  phone_number?: string | null;
  profile_picture_url?: string | null;
};

export const profileService = {
  async getByUserId(userId: number) {
    const result = await pool.query('SELECT * FROM profiles WHERE user_id = $1 LIMIT 1', [userId]);
    return result.rowCount === 1 ? result.rows[0] : null;
  },

  async upsertProfile(userId: number, data: ProfileUpdate) {
    // If profile exists, update; otherwise insert
    const existing = await pool.query('SELECT user_id FROM profiles WHERE user_id = $1 LIMIT 1', [userId]);
    if (existing.rowCount === 1) {
      const result = await pool.query(
        `UPDATE profiles
         SET address = COALESCE($2, address),
             phone_number = COALESCE($3, phone_number),
             profile_picture_url = COALESCE($4, profile_picture_url),
             "updatedAt" = NOW()
         WHERE user_id = $1
         RETURNING *`,
        [userId, data.address ?? null, data.phone_number ?? null, data.profile_picture_url ?? null]
      );
      return result.rows[0];
    }

    // Get user's full name for new profile
    const userResult = await pool.query('SELECT email FROM users WHERE user_id = $1 LIMIT 1', [userId]);
    if (userResult.rowCount !== 1) {
      throw new Error('User not found');
    }

    const result = await pool.query(
      `INSERT INTO profiles (user_id, full_name, address, phone_number, profile_picture_url, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [userId, userResult.rows[0].email, data.address ?? null, data.phone_number ?? null, data.profile_picture_url ?? null]
    );

    return result.rows[0];
  },

  async adminUpdateProfile(targetUserId: number, data: ProfileUpdate) {
    // verify user exists
    const userResult = await pool.query('SELECT user_id FROM users WHERE user_id = $1 LIMIT 1', [targetUserId]);
    if (userResult.rowCount !== 1) {
      throw new ApiError(404, 'User tidak ditemukan');
    }

    return this.upsertProfile(targetUserId, data);
  },
};
