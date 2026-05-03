import pool from './db';
import { ApiError } from '../utils/apiError';

type ProfileUpdate = {
  address?: string | null;
  phone_number?: string | null;
  profile_picture_url?: string | null;
};

async function ensureProfilesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE NOT NULL,
      address TEXT,
      phone_number VARCHAR(64),
      profile_picture_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export const profileService = {
  async getByUserId(userId: number) {
    await ensureProfilesTable();
    const result = await pool.query('SELECT * FROM profiles WHERE user_id = $1 LIMIT 1', [userId]);
    return result.rowCount === 1 ? result.rows[0] : null;
  },

  async upsertProfile(userId: number, data: ProfileUpdate) {
    await ensureProfilesTable();

    // If profile exists, update; otherwise insert
    const existing = await pool.query('SELECT id FROM profiles WHERE user_id = $1 LIMIT 1', [userId]);
    if (existing.rowCount === 1) {
      const result = await pool.query(
        `UPDATE profiles
         SET address = COALESCE($2, address),
             phone_number = COALESCE($3, phone_number),
             profile_picture_url = COALESCE($4, profile_picture_url),
             updated_at = NOW()
         WHERE user_id = $1
         RETURNING *`,
        [userId, data.address ?? null, data.phone_number ?? null, data.profile_picture_url ?? null]
      );
      return result.rows[0];
    }

    const result = await pool.query(
      `INSERT INTO profiles (user_id, address, phone_number, profile_picture_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, data.address ?? null, data.phone_number ?? null, data.profile_picture_url ?? null]
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
