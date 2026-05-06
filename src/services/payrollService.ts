import pool from './db';
import { ApiError } from '../utils/apiError';
import { activityLogService } from './activityLogService';
import { enrichWithUserAndApprover } from '../utils/userEnricher';

async function recalculatePayrollTotals(client: { query: Function }, params: {
  payrollId: number;
  userId: number;
  baseSalary: number;
  periodStart: string;
  periodEnd: string;
}) {
  const periodDate = new Date(params.periodStart);
  const month = periodDate.getMonth() + 1;
  const year = periodDate.getFullYear();

  const details = await payrollService.calculatePayroll(params.userId, month, year, client, params.payrollId);

  const totalAllowance = details.summary.totalIncentives;
  const totalDeduction = details.summary.totalPenalties;
  const netSalary = details.totalSalary;

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
  async calculatePayroll(userId: number, month: number, year: number, dbClient?: any, knownPayrollId?: number) {
    const isExternalClient = !!dbClient;
    const client = isExternalClient ? dbClient : await pool.connect();
    try {
      // 1. Base Salary
      const userRes = await client.query('SELECT base_salary FROM users WHERE user_id = $1', [userId]);
      if ((userRes?.rowCount ?? 0) === 0) throw new ApiError(404, 'User not found');
      const baseSalary = Number(userRes.rows[0].base_salary || 0);

      // 2. Dates
      const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const periodEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      let workingDays = Number(process.env.PAYROLL_WORKING_DAYS);
      if (isNaN(workingDays) || workingDays <= 0) workingDays = 22;

      // 3. Find Payroll ID if not provided
      let payrollId = knownPayrollId;
      if (!payrollId) {
        const payrollRes = await client.query(
          'SELECT id FROM payrolls WHERE user_id = $1 AND period_start = $2 AND period_end = $3 LIMIT 1',
          [userId, periodStart, periodEnd]
        );
        payrollId = (payrollRes?.rowCount ?? 0) > 0 ? payrollRes.rows[0].id : null;
      }

      // 4. Manual incentives & penalties
      const manualIncentives: any[] = [];
      const manualPenalties: any[] = [];
      
      if (payrollId) {
        const itemsRes = await client.query(
          'SELECT type, amount, description, created_at FROM payroll_items WHERE payroll_id = $1',
          [payrollId]
        );
        for (const row of itemsRes.rows) {
          const item = {
            amount: Number(row.amount),
            description: row.description || (row.type === 'allowance' ? 'Manual Allowance' : 'Manual Penalty'),
            date: row.created_at
          };
          if (row.type === 'allowance' || row.type === 'INCENTIVE') manualIncentives.push(item);
          if (row.type === 'deduction' || row.type === 'PENALTY') manualPenalties.push(item);
        }
      }

      // 5. Reimbursements (Auto Incentive)
      const reimbRes = await client.query(
        `SELECT amount, description, request_date FROM reimbursements 
         WHERE user_id = $1 AND status = 'approved' 
         AND EXTRACT(MONTH FROM request_date) = $2 
         AND EXTRACT(YEAR FROM request_date) = $3`,
        [userId, month, year]
      );
      const reimbursementList = reimbRes.rows.map((r: any) => ({
        amount: Number(r.amount),
        description: `Reimbursement: ${r.description}`,
        date: r.request_date
      }));

      // 6. Unpaid Leave Penalty
      const leaveRes = await client.query(
        `SELECT start_date, end_date, (end_date::date - start_date::date + 1) as days 
         FROM leave_requests 
         WHERE user_id = $1 AND type = 'unpaid' AND status = 'approved'
         AND EXTRACT(MONTH FROM start_date) = $2
         AND EXTRACT(YEAR FROM start_date) = $3`,
        [userId, month, year]
      );
      
      const dailySalary = baseSalary / workingDays;
      const unpaidLeaveList = leaveRes.rows.map((l: any) => ({
        amount: Math.round(Number(l.days) * dailySalary),
        description: `Unpaid Leave (${l.days} days: ${new Date(l.start_date).toLocaleDateString()})`,
        date: l.start_date
      }));

      // 7. Late Attendance Penalty
      const attRes = await client.query(
        `SELECT date FROM attendances 
         WHERE user_id = $1 AND status = 'late'
         AND EXTRACT(MONTH FROM date) = $2
         AND EXTRACT(YEAR FROM date) = $3`,
        [userId, month, year]
      );
      
      let fixedLatePenalty = Number(process.env.PAYROLL_LATE_PENALTY);
      if (isNaN(fixedLatePenalty) || fixedLatePenalty < 0) fixedLatePenalty = 50000;
      
      const latePenaltyList = attRes.rows.map((a: any) => ({
        amount: fixedLatePenalty,
        description: `Late Attendance (${new Date(a.date).toLocaleDateString()})`,
        date: a.date
      }));

      // 8. Calculations
      const allIncentives = [...manualIncentives, ...reimbursementList];
      const allPenalties = [...manualPenalties, ...unpaidLeaveList, ...latePenaltyList];
      
      const totalIncentives = allIncentives.reduce((sum, item) => sum + item.amount, 0);
      const totalPenalties = allPenalties.reduce((sum, item) => sum + item.amount, 0);
      const totalSalary = Math.round(baseSalary + totalIncentives - totalPenalties);

      const result = {
        baseSalary,
        incentives: allIncentives,
        penalties: allPenalties,
        summary: {
          totalIncentives: Math.round(totalIncentives),
          totalPenalties: Math.round(totalPenalties)
        },
        totalSalary
      };

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[PAYROLL CALC] userId=${userId} month=${month} year=${year}`, result);
      }

      return result;
    } finally {
      if (!isExternalClient) client.release();
    }
  },

  async addManualAdjustment(params: {
    userId: number;
    month: number;
    year: number;
    amount: number;
    type: 'allowance' | 'deduction';
    description: string;
    adminUserId?: number;
    ipAddress?: string;
    userAgent?: string;
  }) {
    if (!params.userId || params.amount <= 0) {
      throw new ApiError(400, 'userId is required and amount must be greater than 0');
    }
    if (params.type !== 'allowance' && params.type !== 'deduction') {
      throw new ApiError(400, 'type must be allowance or deduction');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Validate user exists and get base salary
      const userRes = await client.query(
        'SELECT user_id, base_salary FROM users WHERE user_id = $1 LIMIT 1',
        [params.userId]
      );
      if ((userRes.rowCount ?? 0) === 0) throw new ApiError(404, 'User not found');
      const baseSalary = Number(userRes.rows[0].base_salary || 0);

      // 2. Build period dates
      const periodStart = `${params.year}-${String(params.month).padStart(2, '0')}-01`;
      const lastDay = new Date(params.year, params.month, 0).getDate();
      const periodEnd = `${params.year}-${String(params.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      // 3. Find or create payroll for this user+period (upsert)
      const upsertRes = await client.query(
        `INSERT INTO payrolls (user_id, period_start, period_end, total_allowance, total_deduction, net_salary, status)
         VALUES ($1, $2, $3, 0, 0, $4, 'generated')
         ON CONFLICT (user_id, period_start, period_end)
         DO UPDATE SET status = EXCLUDED.status
         RETURNING id`,
        [params.userId, periodStart, periodEnd, baseSalary]
      );
      const payrollId = Number(upsertRes.rows[0].id);

      // 4. Insert the adjustment item
      const defaultDesc = params.type === 'allowance' ? 'Manual allowance' : 'Manual penalty';
      const itemRes = await client.query(
        `INSERT INTO payroll_items (payroll_id, type, amount, description)
         VALUES ($1, $2, $3, $4)
         RETURNING id, payroll_id, type, amount, description`,
        [payrollId, params.type, params.amount, params.description || defaultDesc]
      );

      // 5. Recalculate totals so net_salary is accurate immediately
      const recalculated = await recalculatePayrollTotals(client, {
        payrollId,
        userId: params.userId,
        baseSalary,
        periodStart,
        periodEnd,
      });

      await client.query('COMMIT');

      if (params.adminUserId) {
        await activityLogService.create({
          userId: params.adminUserId,
          action: `payroll.${params.type}.manual.added`,
          targetTable: 'payroll_items',
          targetId: String(itemRes.rows[0].id),
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        });
      }

      return { item: itemRes.rows[0], payroll: recalculated };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async getBreakdown(payrollId: number, requesterId: number, requesterRole: string) {
    const client = await pool.connect();
    try {
      const payrollRes = await client.query(
        'SELECT user_id, period_start FROM payrolls WHERE id = $1 LIMIT 1',
        [payrollId]
      );
      if (payrollRes.rowCount === 0) throw new ApiError(404, 'Payroll not found');
      
      const targetUserId = payrollRes.rows[0].user_id;

      if (requesterRole === 'staff' && targetUserId !== requesterId) {
        throw new ApiError(403, 'Anda tidak berhak melihat detail payroll ini');
      }
      
      if (requesterRole === 'manager') {
        // Optionally verify if targetUserId belongs to the manager's team
        const checkRes = await client.query('SELECT manager_id FROM users WHERE user_id = $1 LIMIT 1', [targetUserId]);
        if ((checkRes?.rowCount ?? 0) > 0 && checkRes.rows[0].manager_id !== requesterId && targetUserId !== requesterId) {
           throw new ApiError(403, 'Anda tidak berhak melihat detail payroll ini');
        }
      }
      
      const periodDate = new Date(payrollRes.rows[0].period_start);
      // Use local date methods to avoid UTC shift for DATE columns
      const month = periodDate.getMonth() + 1;
      const year = periodDate.getFullYear();
      
      return await this.calculatePayroll(targetUserId, month, year, client, payrollId);
    } finally {
      client.release();
    }
  },

  async generateMonthlyPayroll(period: Date, adminUserId?: number, loggingOptions?: { ipAddress?: string; userAgent?: string }) {
    const periodStart = firstDayOfMonth(period).toISOString().slice(0, 10);
    const periodEnd = lastDayOfMonth(period).toISOString().slice(0, 10);

    const users = await pool.query(
      `SELECT user_id, base_salary
       FROM users
       WHERE role IN ('staff', 'manager')`
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
      `SELECT p.id, p.user_id, p.period_start, p.period_end, p.total_allowance, p.total_deduction, p.net_salary, p.status, p.generated_at, u.base_salary
       FROM payrolls p
       JOIN users u ON u.user_id = p.user_id
       WHERE p.user_id = $1
       ORDER BY p.period_start DESC`,
      [userId]
    );

    return enrichWithUserAndApprover(result.rows);
  },

  async listAll() {
    const result = await pool.query(
      `SELECT p.id, p.user_id, p.period_start, p.period_end, p.total_allowance, p.total_deduction, p.net_salary, p.status, p.generated_at, u.base_salary
       FROM payrolls p
       JOIN users u ON u.user_id = p.user_id
       WHERE u.role IN ('staff', 'manager')
       ORDER BY p.period_start DESC, p.id DESC`
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
