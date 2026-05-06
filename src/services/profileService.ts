import pool from './db';
import { ApiError } from '../utils/apiError';
import { activityLogService } from './activityLogService';

type ProfileUpdate = {
  full_name?: string | null;
  address?: string | null;
  phone_number?: string | null;
  profile_picture_url?: string | null;
};

type LoggingOptions = {
  ipAddress?: string;
  userAgent?: string;
  adminUserId?: number;
};

export const profileService = {
  async getByUserId(userId: number) {
    const result = await pool.query('SELECT * FROM profiles WHERE user_id = $1 LIMIT 1', [userId]);
    return result.rowCount === 1 ? result.rows[0] : null;
  },

  async upsertProfile(userId: number, data: ProfileUpdate, loggingOptions?: LoggingOptions) {
    // If profile exists, update; otherwise insert
    const existing = await pool.query('SELECT * FROM profiles WHERE user_id = $1 LIMIT 1', [userId]);
    let result;
    
    if (existing.rowCount === 1) {
      // Build dynamic UPDATE query - only update fields that are provided by user
      const updates: string[] = [];
      const params: any[] = [userId];
      let paramIndex = 2;

      // Check if field exists in the data object (user actually sent it)
      if ('full_name' in data) {
        updates.push(`full_name = $${paramIndex++}`);
        params.push(data.full_name);
      }
      if ('address' in data) {
        updates.push(`address = $${paramIndex++}`);
        params.push(data.address);
      }
      if ('phone_number' in data) {
        updates.push(`phone_number = $${paramIndex++}`);
        params.push(data.phone_number);
      }
      if ('profile_picture_url' in data) {
        updates.push(`profile_picture_url = $${paramIndex++}`);
        params.push(data.profile_picture_url);
      }

      // Only update if there are actual changes
      if (updates.length > 0) {
        updates.push(`"updatedAt" = NOW()`);
        const updateClause = updates.join(', ');
        result = await pool.query(
          `UPDATE profiles
           SET ${updateClause}
           WHERE user_id = $1
           RETURNING *`,
          params
        );
      } else {
        // No changes provided, just return existing
        result = { rows: [existing.rows[0]] };
      }
    } else {
      // Prefer the submitted display name; fall back to email only if no name was provided.
      const userResult = await pool.query('SELECT email FROM users WHERE user_id = $1 LIMIT 1', [userId]);
      if (userResult.rowCount !== 1) {
        throw new ApiError(404, 'User tidak ditemukan');
      }

      const fullName = data.full_name ?? userResult.rows[0].email;

      result = await pool.query(
        `INSERT INTO profiles (user_id, full_name, address, phone_number, profile_picture_url, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING *`,
        [userId, fullName, data.address ?? null, data.phone_number ?? null, data.profile_picture_url ?? null]
      );
    }

    // Log activity
    await activityLogService.create({
      userId: userId,
      action: 'profile.updated',
      targetTable: 'profiles',
      targetId: String(userId),
      ipAddress: loggingOptions?.ipAddress,
      userAgent: loggingOptions?.userAgent,
    });

    return result.rows[0];
  },

  async adminUpdateProfile(targetUserId: number, data: ProfileUpdate, loggingOptions?: LoggingOptions) {
    // verify user exists
    const userResult = await pool.query('SELECT user_id FROM users WHERE user_id = $1 LIMIT 1', [targetUserId]);
    if (userResult.rowCount !== 1) {
      throw new ApiError(404, 'User tidak ditemukan');
    }

    const profileResult = await this.upsertProfile(targetUserId, data, loggingOptions);

    return profileResult;
  },
};
