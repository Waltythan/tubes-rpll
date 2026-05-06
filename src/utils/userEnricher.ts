import pool from '../services/db';

export async function enrichWithUserAndApprover(rows: any[]) {
  if (!rows || rows.length === 0) return rows;
  
  const userIds = new Set<number>();
  rows.forEach(r => {
    if (r.user_id) userIds.add(r.user_id);
    if (r.approved_by) userIds.add(r.approved_by);
    if (r.manager_id) userIds.add(r.manager_id);
  });

  if (userIds.size === 0) return rows;

  const users = await pool.query(
    `SELECT u.user_id, u.email, p.full_name, d.name as department_name
     FROM users u
     LEFT JOIN profiles p ON p.user_id = u.user_id
     LEFT JOIN departments d ON d.dep_id = u.department_id
     WHERE u.user_id = ANY($1::int[])`,
    [Array.from(userIds)]
  );

  const userMap = new Map();
  users.rows.forEach(u => {
    userMap.set(u.user_id, {
      id: u.user_id,
      name: u.full_name || u.email || 'Unknown User',
      email: u.email,
      department: u.department_name || null
    });
  });

  return rows.map(r => {
    const enriched = { ...r };
    if (r.user_id) enriched.user = userMap.get(r.user_id);
    if (r.approved_by) enriched.approvedBy = userMap.get(r.approved_by);
    if (r.manager_id) enriched.manager = userMap.get(r.manager_id);
    return enriched;
  });
}
