import { query } from "../db.js";

export class Group {
  static async find(id) {
    const rows = await query(
      `SELECT g.id, g.name, g.course, g.schedule, g.teacher_id, u.full_name AS teacher_name
       FROM groups g
       LEFT JOIN users u ON u.id = g.teacher_id
       WHERE g.id = $1`,
      [id]
    );
    return rows[0] ?? null;
  }

  static withAttendance(date, teacherId) {
    return query(
      `SELECT
         g.id,
         g.name,
         g.course,
         g.schedule,
         (SELECT COUNT(*)::int FROM students s WHERE s.group_id = g.id) AS student_count,
         (SELECT COUNT(*)::int FROM attendance a
           WHERE a.group_id = g.id AND a.date = $1 AND a.status = 'present') AS present_today,
         (SELECT COUNT(*)::int FROM attendance a
           WHERE a.group_id = g.id AND a.date = $1 AND a.status = 'absent') AS absent_today
       FROM groups g
       WHERE $2::int IS NULL OR g.teacher_id = $2
       ORDER BY lower(g.name)`,
      [date, teacherId]
    );
  }

  static all() {
    return query(
      `SELECT
         g.id,
         g.name,
         g.course,
         g.schedule,
         u.full_name AS teacher_name,
         (SELECT COUNT(*)::int FROM students s WHERE s.group_id = g.id) AS student_count
       FROM groups g
       LEFT JOIN users u ON u.id = g.teacher_id
       ORDER BY lower(g.name)`
    );
  }

  static async nameTaken(name, exceptId = null) {
    const rows = await query(
      "SELECT 1 FROM groups WHERE lower(name) = lower($1) AND ($2::int IS NULL OR id <> $2)",
      [name, exceptId]
    );
    return rows.length > 0;
  }

  static async create({ name, course, schedule, teacherId }) {
    const rows = await query(
      `INSERT INTO groups (name, course, schedule, teacher_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [name, course, schedule, teacherId]
    );
    return rows[0].id;
  }

  static update(id, { name, course, schedule, teacherId }) {
    return query(
      "UPDATE groups SET name = $2, course = $3, schedule = $4, teacher_id = $5 WHERE id = $1",
      [id, name, course, schedule, teacherId]
    );
  }

  static remove(id) {
    return query("DELETE FROM groups WHERE id = $1", [id]);
  }
}
