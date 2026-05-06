import { ApiError } from '../utils/apiError';
import { enrichWithUserAndApprover } from '../utils/userEnricher';
import { activityLogService } from './activityLogService';
import pool from './db';

async function recalculatePayrollTotals(client: { query: Function }, params: {
  payrollId: number;
  userId: number;
  baseSalary: number;
  periodStart: string;
  periodEnd: string;
}) {
  const reimbursements = await client.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM reimbursements
     WHERE user_id = $1
       AND status = 'approved'
       AND request_date >= $2::date
       AND request_date <= $3::date`,
    [params.userId, params.periodStart, params.periodEnd]
  );

  const allowances = await client.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM payroll_items
     WHERE payroll_id = $1
       AND type = 'allowance'`,
    [params.payrollId]
  );

  const deductions = await client.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM payroll_items
     WHERE payroll_id = $1
       AND type = 'deduction'`,
    [params.payrollId]
  );

  const reimbursementTotal = Number(reimbursements.rows[0]?.total || 0);
  const allowanceTotal = Number(allowances.rows[0]?.total || 0);
  const deductionTotal = Number(deductions.rows[0]?.total || 0);
  const totalAllowance = reimbursementTotal + allowanceTotal;
  const totalDeduction = deductionTotal;
  const netSalary = params.baseSalary + totalAllowance - totalDeduction;

  const payroll = await client.query(
    `UPDATE payrolls
     SET total_allowance = $2,
         total_deduction = $3,
         net_salary = $4,
         generated_at = NOW()
     WHERE id = $1
     RETURNING id, user_id, total_allowance, total_deduction, net_salary`,
    [params.payrollId, totalAllowance, totalDeduction, netSalary]
  );

  return payroll.rows[0] as {
    id: number;
    user_id: number;
    total_allowance: string | number;
    total_deduction: string | number;
    net_salary: string | number;
  };
}

function firstDayOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function lastDayOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

export const payrollService = {
  async generateMonthlyPayroll(period: Date, adminUserId?: number, loggingOptions?: { ipAddress?: string; userAgent?: string }) {
    const periodStart = firstDayOfMonth(period).toISOString().slice(0, 10);
    const periodEnd = lastDayOfMonth(period).toISOString().slice(0, 10);

    const users = await pool.query(
      `SELECT user_id, base_salary
       FROM users
       WHERE role IN ('staff', 'manager', 'admin')`
    );

    const results: Array<{ userId: number; payrollId: number; netSalary: number }> = [];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const row of users.rows as Array<{ user_id: number; base_salary: string | number }>) {
        const userId = row.user_id;
        const baseSalary = Number(row.base_salary || 0);

        const payroll = await client.query(
          `INSERT INTO payrolls
            (user_id, period_start, period_end, total_allowance, total_deduction, net_salary, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'generated')
           ON CONFLICT (user_id, period_start, period_end)
           DO UPDATE SET
             total_allowance = EXCLUDED.total_allowance,
             total_deduction = EXCLUDED.total_deduction,
             net_salary = EXCLUDED.net_salary,
             status = EXCLUDED.status,
             generated_at = NOW()
           RETURNING id, net_salary`,
          [userId, periodStart, periodEnd, 0, 0, baseSalary]
        );

        const payrollId = Number(payroll.rows[0].id);

        await client.query(
          `UPDATE reimbursements
           SET payroll_id = $2
           WHERE user_id = $1
             AND status = 'approved'
             AND request_date >= $3::date
             AND request_date <= $4::date`,
          [userId, payrollId, periodStart, periodEnd]
        );

        const recalculated = await recalculatePayrollTotals(client, {
          payrollId,
          userId,
          baseSalary,
          periodStart,
          periodEnd,
        });

        results.push({
          userId,
          payrollId,
          netSalary: Number(recalculated.net_salary),
        });
      }

      await client.query('COMMIT');

      // Log activity after successful transaction
      if (adminUserId) {
        await activityLogService.create({
          userId: adminUserId,
          action: 'payroll.generated',
          targetTable: 'payrolls',
          targetId: `${periodStart}_to_${periodEnd}`,
          ipAddress: loggingOptions?.ipAddress,
          userAgent: loggingOptions?.userAgent,
        });
      }

      return {
        periodStart,
        periodEnd,
        payrollCount: results.length,
        generatedPayrolls: results,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async listOwn(userId: number) {
    const result = await pool.query(
      `SELECT id, user_id, period_start, period_end, total_allowance, total_deduction, net_salary, status, generated_at
       FROM payrolls
       WHERE user_id = $1
       ORDER BY period_start DESC`,
      [userId]
    );

    return enrichWithUserAndApprover(result.rows);
  },

  async listAll() {
    const result = await pool.query(
      `SELECT id, user_id, period_start, period_end, total_allowance, total_deduction, net_salary, status, generated_at
       FROM payrolls
       ORDER BY period_start DESC, user_id ASC`
    );

    return enrichWithUserAndApprover(result.rows);
  },

  async addAdjustment(params: {
    payrollId: number;
    type: 'allowance' | 'deduction';
    amount: number;
    description?: string;
    referenceId?: string;
    adminUserId?: number;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const payrollResult = await client.query(
        `SELECT id, user_id, period_start, period_end, net_salary
         FROM payrolls
         WHERE id = $1
         LIMIT 1`,
        [params.payrollId]
      );

      if (payrollResult.rowCount !== 1) {
        throw new ApiError(404, 'Payroll tidak ditemukan');
      }

      const payroll = payrollResult.rows[0] as {
        id: number;
        user_id: number;
        period_start: string;
        period_end: string;
        net_salary: string | number;
      };

      const userResult = await client.query(
        `SELECT base_salary
         FROM users
         WHERE user_id = $1
         LIMIT 1`,
        [payroll.user_id]
      );

      if (userResult.rowCount !== 1) {
        throw new ApiError(404, 'User payroll tidak ditemukan');
      }

      const baseSalary = Number(userResult.rows[0].base_salary || 0);

      const itemResult = await client.query(
        `INSERT INTO payroll_items (payroll_id, type, amount, description, reference_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, payroll_id, type, amount, description, reference_id`,
        [
          params.payrollId,
          params.type,
          params.amount,
          params.description || null,
          params.referenceId || null,
        ]
      );

      const recalculated = await recalculatePayrollTotals(client, {
        payrollId: payroll.id,
        userId: payroll.user_id,
        baseSalary,
        periodStart: payroll.period_start,
        periodEnd: payroll.period_end,
      });

      await client.query('COMMIT');

      // Log activity after successful transaction
      if (params.adminUserId) {
        await activityLogService.create({
          userId: params.adminUserId,
          action: `payroll.adjustment.${params.type}.added`,
          targetTable: 'payroll_items',
          targetId: String(itemResult.rows[0].id),
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        });
      }

      return {
        item: itemResult.rows[0],
        payroll: recalculated,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
};
