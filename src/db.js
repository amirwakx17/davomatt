import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashPassword } from "./lib/password.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function connectPostgres(connectionString) {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString, max: 5 });
  // Without a listener, a dropped idle connection (common on hosted Postgres) crashes the process.
  pool.on("error", (error) => console.error("PostgreSQL ulanish xatosi:", error.message));

  return {
    query: async (sql, params) => (await pool.query(sql, params)).rows,
    exec: async (sql) => {
      await pool.query(sql);
    },
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await fn(async (sql, params) => (await client.query(sql, params)).rows);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

async function connectEmbedded() {
  const { PGlite } = await import("@electric-sql/pglite");
  const dataDir = path.join(projectRoot, "data", "pglite");
  mkdirSync(dataDir, { recursive: true });
  const db = new PGlite(dataDir);

  return {
    query: async (sql, params) => (await db.query(sql, params)).rows,
    exec: async (sql) => {
      await db.exec(sql);
    },
    transaction: (fn) =>
      db.transaction((tx) => fn(async (sql, params) => (await tx.query(sql, params)).rows)),
  };
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl && process.env.NODE_ENV === "production") {
  console.warn(
    "DIQQAT: DATABASE_URL o'rnatilmagan. Ma'lumotlar vaqtinchalik saqlanadi va qayta ishga tushganda yo'qoladi."
  );
}

const driver = databaseUrl ? await connectPostgres(databaseUrl) : await connectEmbedded();

export const query = driver.query;
export const transaction = driver.transaction;

await driver.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'teacher')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    csrf_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
  );

  CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    course TEXT NOT NULL,
    schedule TEXT NOT NULL DEFAULT '',
    teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (group_id, student_id, date)
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_groups_teacher ON groups(teacher_id);
  CREATE INDEX IF NOT EXISTS idx_students_group ON students(group_id);
  CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
`);

async function ensureAdmin() {
  const [{ count }] = await query("SELECT COUNT(*)::int AS count FROM users");
  if (count > 0) return;

  const username = (process.env.ADMIN_USERNAME || "admin").trim().toLowerCase();
  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    password = randomBytes(9).toString("base64url");
    console.log(
      `Birinchi administrator yaratildi. Login: ${username}  Parol: ${password}  (kirgandan so'ng parolni almashtiring)`
    );
  } else {
    console.log(`Birinchi administrator yaratildi. Login: ${username}`);
  }

  await query(
    `INSERT INTO users (username, full_name, password_hash, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (username) DO NOTHING`,
    [username, "Administrator", await hashPassword(password)]
  );
}

await ensureAdmin();
