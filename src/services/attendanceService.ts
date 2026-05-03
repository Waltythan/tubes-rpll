import crypto from 'crypto';
import { PoolClient } from 'pg';
import pool from './db';
import { ApiError } from '../utils/apiError';
import { isOfficeIp } from '../utils/ipCheck';
import { UserRole } from '../utils/jwtHelper';

const QR_TOKEN_TTL_MS = 30_000;

type AttendanceRow = {
  id: number;
  user_id: number;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  status: string;
};

async function ensureAttendanceTables(client: PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS qr_tokens (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      token VARCHAR(200) UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      revoked BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS attendances (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      date DATE NOT NULL,
      clock_in TIMESTAMPTZ,
      clock_out TIMESTAMPTZ,
      clock_in_location VARCHAR(100),
      clock_out_location VARCHAR(100),
      qr_token VARCHAR(200),
      device_id VARCHAR(120),
      status VARCHAR(20) NOT NULL DEFAULT 'present',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT attendances_user_date_unique UNIQUE (user_id, date)
    );
  `);
}

async function ensureActivityLogsTable(client: PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER,
      action VARCHAR(120) NOT NULL,
      target_table VARCHAR(80),
      target_id VARCHAR(80),
      ip_address VARCHAR(64),
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function writeLog(client: PoolClient, params: {
  userId: number;
  action: string;
  targetTable?: string;
  targetId?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  await ensureActivityLogsTable(client);
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
  async generateQrToken(userId: number) {
    if (!Number.isFinite(userId)) {
      throw new ApiError(400, 'Invalid user id');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + QR_TOKEN_TTL_MS);
    const token = crypto.randomBytes(24).toString('hex');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await ensureAttendanceTables(client);

      await client.query('UPDATE qr_tokens SET revoked = TRUE WHERE user_id = $1 AND used_at IS NULL', [userId]);
      await client.query(
        'INSERT INTO qr_tokens (user_id, token, expires_at, revoked) VALUES ($1, $2, $3, FALSE)',
        [userId, token, expiresAt.toISOString()]
      );

      await client.query('COMMIT');

      return {
        qrToken: token,
        expiresIn: Math.floor(QR_TOKEN_TTL_MS / 1000),
        expiresAt: expiresAt.toISOString(),
      };
    } catch (error) {
      await client.query('ROLLBACK');
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
      throw new ApiError(403, `Akses ditolak. IP Anda (${params.clientIp}) tidak terdaftar dalam jaringan kantor.`);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await ensureAttendanceTables(client);

      const tokenRes = await client.query(
        `SELECT token, user_id, expires_at, used_at, revoked
         FROM qr_tokens
         WHERE token = $1
         LIMIT 1`,
        [params.qrToken]
      );

      if (tokenRes.rowCount !== 1) {
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
        used_at: string | null;
        revoked: boolean;
      };

      if (token.user_id !== params.userId) {
        throw new ApiError(403, 'QR token tidak sesuai dengan pengguna yang login.');
      }

      if (token.revoked || token.used_at) {
        throw new ApiError(400, 'QR token sudah digunakan atau diganti token baru.');
      }

      if (new Date(token.expires_at).getTime() <= now.getTime()) {
        await client.query('UPDATE qr_tokens SET revoked = TRUE WHERE token = $1', [params.qrToken]);
        throw new ApiError(400, 'QR token sudah kedaluwarsa.');
      }

      const dateKey = now.toISOString().slice(0, 10);
      const lateBoundary = new Date(`${dateKey}T09:05:00.000Z`);
      const status = now > lateBoundary ? 'late' : 'present';

      let attendanceRow: AttendanceRow;
      try {
        const inserted = await client.query(
          `INSERT INTO attendances
            (user_id, date, clock_in, clock_in_location, qr_token, device_id, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, user_id, date, clock_in, clock_out, status`,
          [params.userId, dateKey, now.toISOString(), params.clientIp, params.qrToken, params.deviceId || null, status]
        );
        attendanceRow = inserted.rows[0] as AttendanceRow;
      } catch (error: any) {
        if (error && error.code === '23505') {
          throw new ApiError(409, 'Anda sudah melakukan check-in hari ini.');
        }
        throw error;
      }

      await client.query('UPDATE qr_tokens SET used_at = $2 WHERE token = $1', [params.qrToken, now.toISOString()]);
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
    const now = params.now || new Date();
    if (!isOfficeIp(params.clientIp)) {
      throw new ApiError(403, `Akses ditolak. IP Anda (${params.clientIp}) tidak terdaftar dalam jaringan kantor.`);
    }

    const dateKey = now.toISOString().slice(0, 10);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await ensureAttendanceTables(client);

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
         SET clock_out = $3,
             clock_out_location = $4,
             updated_at = NOW()
         WHERE user_id = $1
           AND date = $2
           AND clock_in IS NOT NULL
           AND clock_out IS NULL
         RETURNING id, user_id, date, clock_in, clock_out, status`,
        [params.userId, dateKey, now.toISOString(), params.clientIp]
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
      await ensureAttendanceTables(client);
      const result = await client.query(
        `SELECT id, user_id, date, clock_in, clock_out, status
         FROM attendances
         WHERE user_id = $1
           AND ($2::date IS NULL OR date >= $2::date)
           AND ($3::date IS NULL OR date <= $3::date)
         ORDER BY date DESC`,
        [userId, from || null, to || null]
      );
      return result.rows as AttendanceRow[];
    } finally {
      client.release();
    }
  },

  async listByTeam(requester: { id: number; role: UserRole }) {
    const client = await pool.connect();
    try {
      await ensureAttendanceTables(client);

      if (requester.role === 'admin') {
        const allRows = await client.query(
          `SELECT id, user_id, date, clock_in, clock_out, status
           FROM attendances
           ORDER BY date DESC`
        );
        return allRows.rows as AttendanceRow[];
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

      return rows.rows as AttendanceRow[];
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
      await ensureAttendanceTables(client);

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

      if (newClockIn && isNaN(Date.parse(newClockIn))) {
        throw new ApiError(400, 'clock_in harus berupa datetime ISO yang valid');
      }

      if (newClockOut && isNaN(Date.parse(newClockOut))) {
        throw new ApiError(400, 'clock_out harus berupa datetime ISO yang valid');
      }

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
             updated_at = NOW()
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
};
