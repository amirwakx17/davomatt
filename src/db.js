import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { addDaysISO, todayISO } from "./lib/date.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(projectRoot, "data");
mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, "attendance.db"));
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    course TEXT NOT NULL,
    schedule TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
    recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (group_id, student_id, date)
  );

  CREATE INDEX IF NOT EXISTS idx_students_group ON students(group_id);
  CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
`);

const SEED_GROUPS = [
  {
    name: "1-guruh",
    course: "Dasturlash",
    schedule: "9:00",
    students: [
      "Ali Valiyev",
      "Malika Karimova",
      "Sardor Toshmatov",
      "Nilufar Rahimova",
      "Javohir Usmonov",
      "Ziyoda Ergasheva",
      "Bekzod Ismoilov",
      "Shahzoda Yo'ldosheva",
    ],
  },
  {
    name: "2-guruh",
    course: "Veb-dasturlash",
    schedule: "11:00",
    students: [
      "Aziz Mahmudov",
      "Laylo Qodirova",
      "Temur Haydarov",
      "Gulnoza Sattorova",
      "Otabek Rasulov",
      "Madina Xolmatova",
      "Islom Norqulov",
    ],
  },
  {
    name: "3-guruh",
    course: "Ma'lumotlar tahlili",
    schedule: "14:00",
    students: [
      "Dilnoza Abdullayeva",
      "Sanjar Qosimov",
      "Mohira Yusupova",
      "Rustam To'rayev",
      "Kamola Mirzayeva",
      "Farrux Jo'rayev",
    ],
  },
];

function seedIfEmpty() {
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM groups").get();
  if (count > 0) return;

  const insertGroup = db.prepare(
    "INSERT INTO groups (name, course, schedule) VALUES (?, ?, ?)"
  );
  const insertStudent = db.prepare(
    "INSERT INTO students (group_id, full_name) VALUES (?, ?)"
  );
  const insertAttendance = db.prepare(
    "INSERT INTO attendance (group_id, student_id, date, status) VALUES (?, ?, ?, ?)"
  );
  const today = todayISO();
  const yesterday = addDaysISO(today, -1);

  db.exec("BEGIN");
  try {
    const groupIds = [];
    const studentIdsByGroup = [];

    for (const group of SEED_GROUPS) {
      const { lastInsertRowid } = insertGroup.run(
        group.name,
        group.course,
        group.schedule
      );
      const groupId = Number(lastInsertRowid);
      groupIds.push(groupId);

      const studentIds = group.students.map((fullName) =>
        Number(insertStudent.run(groupId, fullName).lastInsertRowid)
      );
      studentIdsByGroup.push(studentIds);
    }

    const seedSession = (groupIndex, date, absentIndexes) => {
      studentIdsByGroup[groupIndex].forEach((studentId, index) => {
        insertAttendance.run(
          groupIds[groupIndex],
          studentId,
          date,
          absentIndexes.includes(index) ? "absent" : "present"
        );
      });
    };

    seedSession(0, yesterday, [5]);
    seedSession(1, today, [5, 6]);
    seedSession(2, yesterday, [3, 4]);

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

seedIfEmpty();
