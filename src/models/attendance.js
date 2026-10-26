import { query, transaction } from "../db.js";

export class Attendance {
  static byGroupAndDate(groupId, date) {
    return query(
      `SELECT student_id, status
       FROM attendance
       WHERE group_id = $1 AND date = $2`,
      [groupId, date]
    );
  }

  static saveGroupDate(groupId, date, entries) {
    return transaction(async (run) => {
      for (const entry of entries) {
        await run(
          `INSERT INTO attendance (group_id, student_id, date, status)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (group_id, student_id, date)
           DO UPDATE SET status = EXCLUDED.status, recorded_at = now()`,
          [groupId, entry.studentId, date, entry.status]
        );
      }
    });
  }

  static async totalsForDate(date, teacherId) {
    const rows = await query(
      `SELECT a.status, COUNT(*)::int AS count
       FROM attendance a
       JOIN groups g ON g.id = a.group_id
       WHERE a.date = $1 AND ($2::int IS NULL OR g.teacher_id = $2)
       GROUP BY a.status`,
      [date, teacherId]
    );

    return {
      present: 0,
      absent: 0,
      ...Object.fromEntries(rows.map((row) => [row.status, row.count])),
    };
  }

  static recentSessions(limit, teacherId) {
    return query(
      `SELECT
         a.group_id,
         g.name AS group_name,
         a.date,
         COUNT(*)::int AS marked,
         SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END)::int AS present,
         SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END)::int AS absent
       FROM attendance a
       JOIN groups g ON g.id = a.group_id
       WHERE $2::int IS NULL OR g.teacher_id = $2
       GROUP BY a.group_id, g.name, a.date
       ORDER BY a.date DESC, lower(g.name)
       LIMIT $1`,
      [limit, teacherId]
    );
  }
}
