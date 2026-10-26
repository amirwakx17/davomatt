import { query } from "../db.js";

export class User {
  static async findByUsername(username) {
    const rows = await query(
      "SELECT id, username, full_name, role, password_hash FROM users WHERE username = $1",
      [username]
    );
    return rows[0] ?? null;
  }

  static async findById(id) {
    const rows = await query(
      "SELECT id, username, full_name, role, password_hash FROM users WHERE id = $1",
      [id]
    );
    return rows[0] ?? null;
  }

  static all() {
    return query(
      `SELECT
         u.id,
         u.username,
         u.full_name,
         u.role,
         (SELECT COUNT(*)::int FROM groups g WHERE g.teacher_id = u.id) AS group_count
       FROM users u
       ORDER BY u.role, lower(u.full_name)`
    );
  }

  static options() {
    return query("SELECT id, full_name, role FROM users ORDER BY lower(full_name)");
  }

  static async usernameTaken(username) {
    const rows = await query("SELECT 1 FROM users WHERE username = $1", [username]);
    return rows.length > 0;
  }

  static async create({ username, fullName, passwordHash, role }) {
    const rows = await query(
      `INSERT INTO users (username, full_name, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [username, fullName, passwordHash, role]
    );
    return rows[0].id;
  }

  static setPasswordHash(id, passwordHash) {
    return query("UPDATE users SET password_hash = $2 WHERE id = $1", [id, passwordHash]);
  }

  static remove(id) {
    return query("DELETE FROM users WHERE id = $1", [id]);
  }
}
