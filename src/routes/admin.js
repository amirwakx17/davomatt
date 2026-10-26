import { destroyUserSessions } from "../lib/auth.js";
import { cleanText } from "../lib/http.js";
import { hashPassword } from "../lib/password.js";
import { Group } from "../models/group.js";
import { Student } from "../models/student.js";
import { User } from "../models/user.js";
import { renderGroupAdmin, renderGroupsAdmin, renderUsersAdmin } from "../views/admin.js";
import { PASSWORD_MAX, PASSWORD_MIN } from "./auth.js";

const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;
const MAX_STUDENTS_PER_ADD = 200;

async function readGroupForm(body, exceptId = null) {
  const group = {
    name: cleanText(body.get("name")),
    course: cleanText(body.get("course")),
    schedule: cleanText(body.get("schedule")),
    teacherId: null,
  };

  if (!group.name || !group.course) return { error: "required" };
  if (group.name.length > 60 || group.course.length > 80 || group.schedule.length > 40) {
    return { error: "long" };
  }

  const rawTeacher = String(body.get("teacher_id") ?? "");
  if (rawTeacher) {
    const teacher = /^\d{1,9}$/.test(rawTeacher) ? await User.findById(Number(rawTeacher)) : null;
    if (!teacher) return { error: "teacher" };
    group.teacherId = teacher.id;
  }

  if (await Group.nameTaken(group.name, exceptId)) return { error: "exists" };
  return { group };
}

function isUniqueViolation(error) {
  return error?.code === "23505";
}

export async function listGroups(ctx) {
  const [groups, teachers] = await Promise.all([Group.all(), User.options()]);
  ctx.render(renderGroupsAdmin({ groups, teachers, csrf: ctx.csrf, url: ctx.url }));
}

export async function createGroup(ctx) {
  const { group, error } = await readGroupForm(ctx.body);
  if (error) return ctx.redirect(`/admin/groups?error=${error}`);

  try {
    const id = await Group.create(group);
    ctx.redirect(`/admin/groups/${id}?ok=created`);
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    ctx.redirect("/admin/groups?error=exists");
  }
}

export async function showGroup(ctx) {
  const group = await Group.find(ctx.params[0]);
  if (!group) return ctx.notFound();

  const [students, teachers] = await Promise.all([Student.allByGroup(group.id), User.options()]);
  ctx.render(renderGroupAdmin({ group, students, teachers, csrf: ctx.csrf, url: ctx.url }));
}

export async function updateGroup(ctx) {
  const existing = await Group.find(ctx.params[0]);
  if (!existing) return ctx.notFound();

  const base = `/admin/groups/${existing.id}`;
  const { group, error } = await readGroupForm(ctx.body, existing.id);
  if (error) return ctx.redirect(`${base}?error=${error}`);

  try {
    await Group.update(existing.id, group);
    ctx.redirect(`${base}?ok=updated`);
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    ctx.redirect(`${base}?error=exists`);
  }
}

export async function deleteGroup(ctx) {
  const group = await Group.find(ctx.params[0]);
  if (!group) return ctx.notFound();

  await Group.remove(group.id);
  ctx.redirect("/admin/groups?ok=deleted");
}

export async function addStudents(ctx) {
  const group = await Group.find(ctx.params[0]);
  if (!group) return ctx.notFound();

  const base = `/admin/groups/${group.id}`;
  const names = String(ctx.body.get("names") ?? "")
    .split(/\r?\n/)
    .map(cleanText)
    .filter(Boolean);

  if (names.length === 0) return ctx.redirect(`${base}?error=names`);
  if (names.length > MAX_STUDENTS_PER_ADD) return ctx.redirect(`${base}?error=many`);
  if (names.some((name) => name.length > 80)) return ctx.redirect(`${base}?error=student`);

  await Student.addMany(group.id, names);
  ctx.redirect(`${base}?ok=added&n=${names.length}`);
}

export async function renameStudent(ctx) {
  const student = await Student.find(ctx.params[0]);
  if (!student) return ctx.notFound();

  const base = `/admin/groups/${student.group_id}`;
  const fullName = cleanText(ctx.body.get("full_name"));
  if (!fullName || fullName.length > 80) return ctx.redirect(`${base}?error=student`);

  await Student.rename(student.id, fullName);
  ctx.redirect(`${base}?ok=renamed`);
}

export async function deleteStudent(ctx) {
  const student = await Student.find(ctx.params[0]);
  if (!student) return ctx.notFound();

  await Student.remove(student.id);
  ctx.redirect(`/admin/groups/${student.group_id}?ok=removed`);
}

export async function listUsers(ctx) {
  const users = await User.all();
  ctx.render(renderUsersAdmin({ users, currentUser: ctx.user, csrf: ctx.csrf, url: ctx.url }));
}

export async function createUser(ctx) {
  const fullName = cleanText(ctx.body.get("full_name"));
  const username = String(ctx.body.get("username") ?? "").trim().toLowerCase();
  const password = String(ctx.body.get("password") ?? "");
  const role = ctx.body.get("role");

  if (!fullName || fullName.length > 80) return ctx.redirect("/admin/users?error=name");
  if (!USERNAME_PATTERN.test(username)) return ctx.redirect("/admin/users?error=username");
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return ctx.redirect("/admin/users?error=password");
  }
  if (role !== "admin" && role !== "teacher") return ctx.redirect("/admin/users?error=role");
  if (await User.usernameTaken(username)) return ctx.redirect("/admin/users?error=exists");

  try {
    await User.create({ username, fullName, passwordHash: await hashPassword(password), role });
    ctx.redirect("/admin/users?ok=created");
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    ctx.redirect("/admin/users?error=exists");
  }
}

export async function resetPassword(ctx) {
  const target = await User.findById(ctx.params[0]);
  if (!target) return ctx.notFound();
  if (target.id === ctx.user.id) return ctx.redirect("/admin/users?error=self");

  const password = String(ctx.body.get("password") ?? "");
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return ctx.redirect("/admin/users?error=password");
  }

  await User.setPasswordHash(target.id, await hashPassword(password));
  await destroyUserSessions(target.id);
  ctx.redirect("/admin/users?ok=password");
}

export async function deleteUser(ctx) {
  const target = await User.findById(ctx.params[0]);
  if (!target) return ctx.notFound();
  if (target.id === ctx.user.id) return ctx.redirect("/admin/users?error=self");

  await User.remove(target.id);
  ctx.redirect("/admin/users?ok=deleted");
}
