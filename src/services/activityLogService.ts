import { PoolClient } from 'pg';
import pool from './db';
import { enrichWithUserAndApprover } from '../utils/userEnricher';

type LogParams = {
  userId: number;
  action: string;
  targetTable?: string | null;
  targetId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  client?: PoolClient;
};

export const activityLogService = {
  async create(params: LogParams) {
    const client = params.client || pool;
    
    const result = await client.query(
      `INSERT INTO activity_logs (user_id, action, target_table, target_id, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, action, target_table, target_id, ip_address, user_agent, "createdAt"`,
      [
        params.userId,
        params.action,
        params.targetTable || null,
        params.targetId || null,
        params.ipAddress || null,
        params.userAgent || null,
      ]
    );

    return result.rows[0];
  },

  async list(opts: { limit?: number; offset?: number; userId?: number; action?: string }) {
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
      SELECT user_id, action, target_table, target_id, ip_address, "createdAt" AS created_at
      FROM activity_logs
      ${where}
      ORDER BY "createdAt" DESC
      LIMIT $${idx++}
      OFFSET $${idx++}
    `;

    params.push(limit, offset);

    const result = await pool.query(query, params);
    return enrichWithUserAndApprover(result.rows);
  },
};
