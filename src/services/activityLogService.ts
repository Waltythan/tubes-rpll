import pool from './db';

async function ensureActivityLogsTable() {
  await pool.query(`
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

export const activityLogService = {
  async list(opts: { limit?: number; offset?: number; userId?: number; action?: string }) {
    await ensureActivityLogsTable();

    const clauses: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (opts.userId) {
      clauses.push(`user_id = $${idx++}`);
      params.push(opts.userId);
    }

    if (opts.action) {
      clauses.push(`action = $${idx++}`);
      params.push(opts.action);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const limit = Number.isFinite(opts.limit as number) ? opts.limit : 50;
    const offset = Number.isFinite(opts.offset as number) ? opts.offset : 0;

    const query = `
      SELECT user_id, action, target_table, target_id, ip_address, created_at
      FROM activity_logs
      ${where}
      ORDER BY created_at DESC
      LIMIT $${idx++}
      OFFSET $${idx++}
    `;

    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  },
};
