import { query, transaction } from "../db.js";

export class Student {
  static allByGroup(groupId) {
    return query(
      `SELECT id, group_id, full_name
       FROM students
       WHERE group_id = $1
       ORDER BY lower(full_name), id`,
      [groupId]
    );
  }

  static async find(id) {
    const rows = await query("SELECT id, group_id, full_name FROM students WHERE id = $1", [id]);
    return rows[0] ?? null;
  }

  static async count(teacherId) {
    const rows = await query(
      `SELECT COUNT(*)::int AS count
       FROM students s
       JOIN groups g ON g.id = s.group_id
       WHERE $1::int IS NULL OR g.teacher_id = $1`,
      [teacherId]
    );
    return rows[0].count;
  }

  static addMany(groupId, names) {
    return transaction(async (run) => {
      for (const name of names) {
        await run("INSERT INTO students (group_id, full_name) VALUES ($1, $2)", [groupId, name]);
      }
    });
  }

  static rename(id, fullName) {
    return query("UPDATE students SET full_name = $2 WHERE id = $1", [id, fullName]);
  }

  static remove(id) {
    return query("DELETE FROM students WHERE id = $1", [id]);
  }
}
