import { db } from "../db.js";

export class Attendance {
  static byGroupAndDate(groupId, date) {
    return db
      .prepare(
        `SELECT student_id, status
         FROM attendance
         WHERE group_id = ? AND date = ?`
      )
      .all(groupId, date);
  }

  static saveGroupDate(groupId, date, entries) {
    const upsert = db.prepare(
      `INSERT INTO attendance (group_id, student_id, date, status)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (group_id, student_id, date)
       DO UPDATE SET status = excluded.status, recorded_at = datetime('now')`
    );

    db.exec("BEGIN IMMEDIATE");
    try {
      for (const entry of entries) {
        upsert.run(groupId, entry.studentId, date, entry.status);
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  static totalsForDate(date) {
    const rows = db
      .prepare(
        `SELECT status, COUNT(*) AS count
         FROM attendance
         WHERE date = ?
         GROUP BY status`
      )
      .all(date);

    return {
      present: 0,
      absent: 0,
      ...Object.fromEntries(rows.map((row) => [row.status, row.count])),
    };
  }

  static recentSessions(limit = 6) {
    return db
      .prepare(
        `SELECT
           a.group_id,
           g.name AS group_name,
           a.date,
           COUNT(*) AS marked,
           SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS present,
           SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS absent
         FROM attendance a
         JOIN groups g ON g.id = a.group_id
         GROUP BY a.group_id, a.date
         ORDER BY a.date DESC, g.name
         LIMIT ?`
      )
      .all(limit);
  }
}
