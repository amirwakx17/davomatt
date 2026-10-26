import { isValidISODate, todayISO } from "../lib/date.js";
import { Attendance } from "../models/attendance.js";
import { Group } from "../models/group.js";
import { Student } from "../models/student.js";
import { renderAttendancePage } from "../views/attendance.js";
import { renderDashboard } from "../views/dashboard.js";

const scopeOf = (user) => (user.role === "admin" ? null : user.id);

async function accessibleGroup(ctx) {
  const group = await Group.find(ctx.params[0]);
  if (!group) return null;
  if (ctx.user.role !== "admin" && group.teacher_id !== ctx.user.id) return null;
  return group;
}

export async function dashboard(ctx) {
  const today = todayISO();
  const teacherId = scopeOf(ctx.user);
  const [groups, totals, studentTotal, recent] = await Promise.all([
    Group.withAttendance(today, teacherId),
    Attendance.totalsForDate(today, teacherId),
    Student.count(teacherId),
    Attendance.recentSessions(6, teacherId),
  ]);
  ctx.render(renderDashboard({ today, groups, totals, studentTotal, recent, user: ctx.user }));
}

export async function showSheet(ctx) {
  const group = await accessibleGroup(ctx);
  if (!group) return ctx.notFound();

  const requested = ctx.url.searchParams.get("date");
  const date = isValidISODate(requested) ? requested : todayISO();
  const [students, records] = await Promise.all([
    Student.allByGroup(group.id),
    Attendance.byGroupAndDate(group.id, date),
  ]);

  ctx.render(
    renderAttendancePage({
      group,
      students,
      date,
      statuses: new Map(records.map((row) => [row.student_id, row.status])),
      saved: ctx.url.searchParams.get("saved") === "1",
      error: ctx.url.searchParams.get("error"),
      csrf: ctx.csrf,
      isAdmin: ctx.user.role === "admin",
    })
  );
}

export async function saveSheet(ctx) {
  const group = await accessibleGroup(ctx);
  if (!group) return ctx.notFound();

  const base = `/groups/${group.id}/attendance`;
  const date = ctx.body.get("date");
  if (!isValidISODate(date)) return ctx.redirect(`${base}?error=date`);

  const students = await Student.allByGroup(group.id);
  if (students.length === 0) return ctx.redirect(`${base}?date=${date}&error=empty`);

  const entries = [];
  for (const student of students) {
    const status = ctx.body.get(`status-${student.id}`);
    if (status !== "present" && status !== "absent") {
      return ctx.redirect(`${base}?date=${date}&error=mark`);
    }
    entries.push({ studentId: student.id, status });
  }

  await Attendance.saveGroupDate(group.id, date, entries);
  ctx.redirect(`${base}?date=${date}&saved=1`);
}
