import { db } from "../db.js";

export class Group {
  static find(id) {
    return db
      .prepare("SELECT id, name, course, schedule FROM groups WHERE id = ?")
      .get(id);
  }

  static withAttendance(date) {
    return db
      .prepare(
        `SELECT
           g.id,
           g.name,
           g.course,
           g.schedule,
           (SELECT COUNT(*) FROM students s WHERE s.group_id = g.id) AS student_count,
           (SELECT COUNT(*) FROM attendance a
             WHERE a.group_id = g.id AND a.date = ? AND a.status = 'present') AS present_today,
           (SELECT COUNT(*) FROM attendance a
             WHERE a.group_id = g.id AND a.date = ? AND a.status = 'absent') AS absent_today
         FROM groups g
         ORDER BY g.name`
      )
      .all(date, date);
  }
}
