import { db } from "../db.js";

export class Student {
  static allByGroup(groupId) {
    return db
      .prepare(
        `SELECT id, group_id, full_name
         FROM students
         WHERE group_id = ?
         ORDER BY full_name COLLATE NOCASE`
      )
      .all(groupId);
  }

  static count() {
    return db.prepare("SELECT COUNT(*) AS count FROM students").get().count;
  }
}
