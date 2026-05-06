import crypto from 'crypto';
import { PoolClient } from 'pg';
import { ApiError } from '../utils/apiError';
import { isOfficeIp } from '../utils/ipCheck';
import { UserRole } from '../utils/jwtHelper';
import { enrichWithUserAndApprover } from '../utils/userEnricher';
import pool from './db';

const QR_TOKEN_TTL_MS = 600_000; // 10 minutes - allows time for scan + navigate + confirm workflow
const CLIENT_URL = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
const ATTENDANCE_LATE_TIME = process.env.ATTENDANCE_LATE_TIME || '09:05';

function buildLateBoundary(dateKey: string): Date {
  const [hourPart, minutePart] = ATTENDANCE_LATE_TIME.split(':').map((value) => Number(value));
  const hours = Number.isFinite(hourPart) ? hourPart : 9;
  const minutes = Number.isFinite(minutePart) ? minutePart : 5;
  const normalizedHours = String(Math.max(0, Math.min(23, hours))).padStart(2, '0');
  const normalizedMinutes = String(Math.max(0, Math.min(59, minutes))).padStart(2, '0');

  return new Date(`${dateKey}T${normalizedHours}:${normalizedMinutes}:00.000Z`);
}

type AttendanceRow = {
  id: number;
  user_id: number;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  status: string;
};

async function writeLog(client: PoolClient, params: {
  userId: number;
  action: string;
  targetTable?: string;
  targetId?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  await client.query(
    `INSERT INTO activity_logs (user_id, action, target_table, target_id, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      params.userId,
      params.action,
      params.targetTable || null,
      params.targetId || null,
      params.ipAddress || null,
      params.userAgent || null,
    ]
  );
}

export const attendanceService = {
  async generateQrToken(userId: number, baseUrl?: string) {
    if (!Number.isFinite(userId)) {
      throw new ApiError(400, 'Invalid user id');
    }

    const resolvedBaseUrl = (baseUrl || CLIENT_URL).replace(/\/$/, '');
    const token = crypto.randomBytes(24).toString('hex');
    const ttlSeconds = Math.floor(QR_TOKEN_TTL_MS / 1000);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      console.log('[attendance] Generating QR token:', {
        userId,
        ttlSeconds,
        baseUrl: resolvedBaseUrl,
        token: token.substring(0, 8),
      });

      // Revoke old unused tokens for this user
      const revokeRes = await client.query(
        'UPDATE qr_tokens SET revoked = TRUE WHERE user_id = $1 AND used = FALSE',
        [userId]
      );
      console.log('[attendance] Revoked old tokens:', revokeRes.rowCount);
      
      // Insert new token with expiry calculated by database
      const insertRes = await client.query(
        `INSERT INTO qr_tokens (user_id, token, expires_at, revoked, used, "createdAt", "updatedAt")
         VALUES ($1, $2, NOW() + INTERVAL '1 second' * $3, FALSE, FALSE, NOW(), NOW())
         RETURNING id, token, expires_at`,
        [userId, token, ttlSeconds]
      );

      const createdToken = insertRes.rows[0];
      console.log('[attendance] Token created:', {
        id: createdToken.id,
        token: createdToken.token.substring(0, 8),
        expiresAt: createdToken.expires_at,
      });

      const expiresAt = createdToken.expires_at;

      await client.query('COMMIT');

      return {
        qrToken: token,
        qrUrl: `${resolvedBaseUrl}/attendance/confirm?token=${encodeURIComponent(token)}`,
        expiresIn: ttlSeconds,
        expiresAt: typeof expiresAt === 'string' ? expiresAt : new Date(expiresAt).toISOString(),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[attendance] Error generating QR token:', error);
      throw error;
    } finally {
      client.release();
    }
  },

  async checkIn(params: {
    userId: number;
    qrToken: string;
    clientIp: string;
    deviceId?: string;
    now?: Date;
    userAgent?: string;
  }) {
    const now = params.now || new Date();
    if (!isOfficeIp(params.clientIp)) {
      throw new ApiError(403, 'Check-in only allowed from office network');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Query token with database-side expiry check
      const tokenRes = await client.query(
        `SELECT token, user_id, expires_at, used, revoked,
                CAST(EXTRACT(EPOCH FROM (expires_at - NOW())) AS INTEGER) AS seconds_remaining
         FROM qr_tokens
         WHERE token = $1
         LIMIT 1`,
        [params.qrToken]
      );

      console.log('[attendance] Token query result:', {
        rowCount: tokenRes.rowCount,
        token: params.qrToken.substring(0, 8),
        userId: params.userId,
        clientIp: params.clientIp,
      });

      if (tokenRes.rowCount !== 1) {
        console.log('[attendance] Token not found in DB');
        await writeLog(client, {
          userId: params.userId,
          action: 'attendance.checkin.failed.invalid_token',
          ipAddress: params.clientIp,
          userAgent: params.userAgent,
        });
        throw new ApiError(400, 'QR token tidak valid atau sudah tidak berlaku.');
      }

      const token = tokenRes.rows[0] as {
        token: string;
        user_id: number;
        expires_at: string;
        used: boolean;
        revoked: boolean;
        seconds_remaining: number | null;
      };

      console.log('[attendance] Token found:', {
        used: token.used,
        revoked: token.revoked,
        secondsRemaining: token.seconds_remaining,
        tokenUserId: token.user_id,
        paramUserId: params.userId,
      });

      if (token.user_id !== params.userId) {
        console.log('[attendance] User ID mismatch');
        throw new ApiError(403, 'QR token tidak sesuai dengan pengguna yang login.');
      }

      if (token.revoked || token.used) {
        console.log('[attendance] Token already used or revoked');
        throw new ApiError(400, 'QR token sudah digunakan atau diganti token baru.');
      }

      if (!token.seconds_remaining || token.seconds_remaining <= 0) {
        console.log('[attendance] Token expired, seconds_remaining:', token.seconds_remaining);
        await client.query('UPDATE qr_tokens SET revoked = TRUE WHERE token = $1', [params.qrToken]);
        throw new ApiError(400, 'QR token sudah kedaluwarsa.');
      }

      // Get server time for consistent timestamp across all attendances
      const serverTimeRes = await client.query('SELECT NOW() AT TIME ZONE \'UTC\' as server_now');
      const serverNow = new Date(serverTimeRes.rows[0].server_now);
      const dateKey = serverNow.toISOString().slice(0, 10);
      const lateBoundary = buildLateBoundary(dateKey);
      const status = serverNow > lateBoundary ? 'late' : 'present';

      let attendanceRow: AttendanceRow;
      try {
        const inserted = await client.query(
          `INSERT INTO attendances
            (user_id, date, clock_in, clock_in_location, qr_token, device_id, status)
           VALUES ($1, $2, NOW(), $3, $4, $5, $6)
           RETURNING id, user_id, date, clock_in, clock_out, status`,
          [params.userId, dateKey, params.clientIp, params.qrToken, params.deviceId || null, status]
        );
        attendanceRow = inserted.rows[0] as AttendanceRow;
      } catch (error: any) {
        if (error && error.code === '23505') {
          throw new ApiError(409, 'Anda sudah melakukan check-in hari ini.');
        }
        throw error;
      }

      await client.query('UPDATE qr_tokens SET used = TRUE WHERE token = $1', [params.qrToken]);
      await writeLog(client, {
        userId: params.userId,
        action: 'attendance.checkin.success',
        targetTable: 'attendances',
        targetId: String(attendanceRow.id),
        ipAddress: params.clientIp,
        userAgent: params.userAgent,
      });

      await client.query('COMMIT');
      return attendanceRow;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async checkOut(params: {
    userId: number;
    clientIp: string;
    now?: Date;
    userAgent?: string;
  }) {
    if (!isOfficeIp(params.clientIp)) {
      throw new ApiError(403, 'Check-out only allowed from office network');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get server time for consistent timestamp
      const serverTimeRes = await client.query('SELECT NOW() AT TIME ZONE \'UTC\' as server_now');
      const serverNow = new Date(serverTimeRes.rows[0].server_now);
      const dateKey = serverNow.toISOString().slice(0, 10);

      const existing = await client.query(
        `SELECT id, clock_in, clock_out
         FROM attendances
         WHERE user_id = $1
           AND date = $2
         LIMIT 1`,
        [params.userId, dateKey]
      );

      if (existing.rowCount !== 1) {
        throw new ApiError(404, 'Data check-in hari ini tidak ditemukan.');
      }

      const existingRow = existing.rows[0] as {
        id: number;
        clock_in: string | null;
        clock_out: string | null;
      };

      if (!existingRow.clock_in) {
        throw new ApiError(404, 'Data check-in hari ini tidak ditemukan.');
      }

      if (existingRow.clock_out) {
        throw new ApiError(409, 'Anda sudah melakukan check-out hari ini.');
      }

      const updated = await client.query(
        `UPDATE attendances
         SET clock_out = NOW(),
             clock_out_location = $3,
             updated_at = NOW()
         WHERE user_id = $1
           AND date = $2
           AND clock_in IS NOT NULL
           AND clock_out IS NULL
         RETURNING id, user_id, date, clock_in, clock_out, status`,
        [params.userId, dateKey, params.clientIp]
      );

      if (updated.rowCount !== 1) {
        throw new ApiError(409, 'Anda sudah melakukan check-out hari ini.');
      }

      const row = updated.rows[0] as AttendanceRow;
      await writeLog(client, {
        userId: params.userId,
        action: 'attendance.checkout.success',
        targetTable: 'attendances',
        targetId: String(row.id),
        ipAddress: params.clientIp,
        userAgent: params.userAgent,
      });

      await client.query('COMMIT');
      return row;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async listOwn(userId: number, from?: string, to?: string) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT id, user_id, date, clock_in, clock_out, status
         FROM attendances
         WHERE user_id = $1
           AND ($2::date IS NULL OR date >= $2::date)
           AND ($3::date IS NULL OR date <= $3::date)
         ORDER BY date DESC`,
        [userId, from || null, to || null]
      );
      return enrichWithUserAndApprover(result.rows) as Promise<AttendanceRow[]>;
    } finally {
      client.release();
    }
  },

  async listByTeam(requester: { id: number; role: UserRole }) {
    const client = await pool.connect();
    try {
      if (requester.role === 'admin') {
        const allRows = await client.query(
          `SELECT id, user_id, date, clock_in, clock_out, status
           FROM attendances
           ORDER BY date DESC`
        );
        return enrichWithUserAndApprover(allRows.rows) as Promise<AttendanceRow[]>;
      }

      if (requester.role !== 'manager') {
        throw new ApiError(403, 'Hanya manager atau admin yang bisa melihat attendance tim.');
      }

      const rows = await client.query(
        `SELECT a.id, a.user_id, a.date, a.clock_in, a.clock_out, a.status
         FROM attendances a
         JOIN users u ON u.user_id = a.user_id
         WHERE u.manager_id = $1
         ORDER BY a.date DESC`,
        [requester.id]
      );

      return enrichWithUserAndApprover(rows.rows) as Promise<AttendanceRow[]>;
    } finally {
      client.release();
    }
  },

  async updateAttendance(params: {
    attendanceId: number;
    updates: { clock_in?: string | null; clock_out?: string | null; status?: string | null };
    adminUserId: number;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existingRes = await client.query(
        `SELECT id, user_id, clock_in, clock_out, status
         FROM attendances
         WHERE id = $1
         LIMIT 1`,
        [params.attendanceId]
      );

      if (existingRes.rowCount !== 1) {
        throw new ApiError(404, 'Attendance record tidak ditemukan');
      }

      const row = existingRes.rows[0] as { id: number; user_id: number; clock_in: string | null; clock_out: string | null; status: string };

      const newClockIn = params.updates.clock_in ?? row.clock_in;
      const newClockOut = params.updates.clock_out ?? row.clock_out;

      if (newClockIn && newClockOut) {
        if (new Date(newClockOut).getTime() < new Date(newClockIn).getTime()) {
          throw new ApiError(400, 'clock_out tidak boleh lebih awal dari clock_in');
        }
      }

      const updated = await client.query(
        `UPDATE attendances
         SET clock_in = $2,
             clock_out = $3,
             status = COALESCE($4, status),
             "updatedAt" = NOW()
         WHERE id = $1
         RETURNING id, user_id, date, clock_in, clock_out, status`,
        [params.attendanceId, newClockIn, newClockOut, params.updates.status ?? null]
      );

      await writeLog(client, {
        userId: params.adminUserId,
        action: 'attendance.update',
        targetTable: 'attendances',
        targetId: String(params.attendanceId),
        ipAddress: params.ipAddress || undefined,
        userAgent: params.userAgent || undefined,
      });

      await client.query('COMMIT');
      return updated.rows[0] as AttendanceRow;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async debugCheckToken(token: string) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT id, user_id, token, used, revoked, expires_at,
                NOW() as server_now,
                CAST(EXTRACT(EPOCH FROM (expires_at - NOW())) AS INTEGER) AS seconds_remaining
         FROM qr_tokens
         WHERE token = $1
         LIMIT 1`,
        [token]
      );

      if (result.rowCount === 0) {
        return { found: false, message: 'Token tidak ditemukan di database' };
      }

      const row = result.rows[0];
      return {
        found: true,
        id: row.id,
        user_id: row.user_id,
        token_preview: token.substring(0, 8) + '...',
        used: row.used,
        revoked: row.revoked,
        expires_at: row.expires_at,
        server_now: row.server_now,
        seconds_remaining: row.seconds_remaining,
        status: row.revoked ? 'revoked' : row.used ? 'used' : row.seconds_remaining <= 0 ? 'expired' : 'valid',
      };
    } finally {
      client.release();
    }
  },
};
