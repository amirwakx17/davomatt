import { escapeHtml, initials, toneFor } from "../lib/html.js";
import { icon } from "../lib/icons.js";
import { ROLE_LABELS } from "./account.js";
import { csrfField, flashFromQuery } from "./layout.js";

const GROUP_ERRORS = {
  required: "Guruh nomi va kurs nomini kiriting.",
  long: "Matn juda uzun. Nom 60, kurs 80, dars vaqti 40 belgidan oshmasin.",
  exists: "Bunday nomli guruh allaqachon mavjud.",
  teacher: "Tanlangan o'qituvchi topilmadi.",
};

function teacherSelect(teachers, selectedId, id) {
  const options = teachers
    .map(
      (t) =>
        `<option value="${t.id}"${t.id === selectedId ? " selected" : ""}>${escapeHtml(t.full_name)}${
          t.role === "admin" ? " (admin)" : ""
        }</option>`
    )
    .join("");
  return `<select class="input" id="${id}" name="teacher_id">
            <option value="">— Biriktirilmagan —</option>
            ${options}
          </select>`;
}

function groupFields(group, teachers, prefix) {
  return `
          <div class="field">
            <label for="${prefix}-name">Guruh nomi</label>
            <input class="input" id="${prefix}-name" name="name" maxlength="60" required value="${escapeHtml(group?.name ?? "")}" placeholder="Masalan: Frontend 12">
          </div>
          <div class="field">
            <label for="${prefix}-course">Kurs</label>
            <input class="input" id="${prefix}-course" name="course" maxlength="80" required value="${escapeHtml(group?.course ?? "")}" placeholder="Masalan: JavaScript asoslari">
          </div>
          <div class="field">
            <label for="${prefix}-schedule">Dars vaqti</label>
            <input class="input" id="${prefix}-schedule" name="schedule" maxlength="40" value="${escapeHtml(group?.schedule ?? "")}" placeholder="Masalan: Du, Cho, Ju · 14:00">
            <span class="hint">Ixtiyoriy.</span>
          </div>
          <div class="field">
            <label for="${prefix}-teacher">O'qituvchi</label>
            ${teacherSelect(teachers, group?.teacher_id ?? null, `${prefix}-teacher`)}
          </div>`;
}

export function renderGroupsAdmin({ groups, teachers, csrf, url }) {
  const rows = groups
    .map(
      (g) => `
          <tr>
            <td>
              <div class="table-group">
                <span class="avatar avatar-sm ${toneFor(g.name)}">${escapeHtml(initials(g.name))}</span>
                <div class="cell-stack">
                  <span>${escapeHtml(g.name)}</span>
                  <small class="muted">${escapeHtml(g.course)}</small>
                </div>
              </div>
            </td>
            <td>${g.teacher_name ? escapeHtml(g.teacher_name) : `<span class="muted">Biriktirilmagan</span>`}</td>
            <td class="hide-sm">${escapeHtml(g.schedule || "—")}</td>
            <td>${g.student_count}</td>
            <td class="cell-action">
              <a class="icon-link" href="/admin/groups/${g.id}" aria-label="${escapeHtml(g.name)} guruhini boshqarish">${icon("settings")}</a>
            </td>
          </tr>`
    )
    .join("");

  const table =
    groups.length > 0
      ? `<table class="table">
          <thead>
            <tr>
              <th scope="col">Guruh</th>
              <th scope="col">O'qituvchi</th>
              <th scope="col" class="hide-sm">Dars vaqti</th>
              <th scope="col">Talabalar</th>
              <th scope="col"><span class="visually-hidden">Boshqarish</span></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`
      : `<div class="empty-state">Hali guruh yo'q. O'ngdagi forma orqali birinchi guruhni qo'shing.</div>`;

  return {
    title: "Guruhlar",
    active: "groups",
    body: `
    <section class="hero">
      <div>
        <p class="eyebrow">Boshqaruv paneli</p>
        <h1>Guruhlar</h1>
        <p class="lede">Guruhlarni yarating, o'qituvchi biriktiring va talabalar ro'yxatini yuriting.</p>
      </div>
      <span class="chip chip-soft">${groups.length} ta guruh</span>
    </section>

    ${flashFromQuery(url, { deleted: "Guruh o'chirildi." }, GROUP_ERRORS)}

    <div class="sheet-layout">
      <section class="panel table-panel">${table}</section>

      <aside class="sheet-aside">
        <section class="panel form-panel">
          <h2>Yangi guruh</h2>
          <form class="form-stack" method="post" action="/admin/groups">
            ${csrfField(csrf)}
            ${groupFields(null, teachers, "new")}
            <button class="btn btn-primary" type="submit">${icon("plus")}Guruh qo'shish</button>
          </form>
        </section>
      </aside>
    </div>`,
  };
}

export function renderGroupAdmin({ group, students, teachers, csrf, url }) {
  const ok = {
    created: "Guruh yaratildi. Endi talabalarni qo'shing.",
    updated: "Guruh ma'lumotlari saqlandi.",
    added: (params) => `${Number(params.get("n")) || 0} ta talaba qo'shildi.`,
    renamed: "Talaba ismi yangilandi.",
    removed: "Talaba o'chirildi.",
  };
  const errors = {
    ...GROUP_ERRORS,
    names: "Kamida bitta talaba ismini kiriting.",
    many: "Bir martada ko'pi bilan 200 ta talaba qo'shish mumkin.",
    student: "Talaba ismi 1–80 belgidan iborat bo'lishi kerak.",
  };

  const rows = students
    .map(
      (s, index) => `
        <div class="student-row">
          <span class="avatar ${toneFor(s.full_name)}">${escapeHtml(initials(s.full_name))}</span>
          <form class="inline-form" method="post" action="/admin/students/${s.id}">
            ${csrfField(csrf)}
            <label class="visually-hidden" for="student-${s.id}">${index + 1}-talaba ismi</label>
            <input class="input" id="student-${s.id}" name="full_name" maxlength="80" required value="${escapeHtml(s.full_name)}">
            <button class="btn btn-secondary btn-sm" type="submit">Saqlash</button>
          </form>
          <form method="post" action="/admin/students/${s.id}/delete" data-confirm="${escapeHtml(s.full_name)} o'chirilsinmi? Uning davomat tarixi ham o'chadi.">
            ${csrfField(csrf)}
            <button class="btn btn-ghost btn-sm btn-icon" type="submit" aria-label="${escapeHtml(s.full_name)}ni o'chirish">${icon("trash")}</button>
          </form>
        </div>`
    )
    .join("");

  return {
    title: `${group.name} · Boshqarish`,
    active: "groups",
    body: `
    <nav class="breadcrumb" aria-label="Navigatsiya">
      <a href="/admin/groups">${icon("arrowLeft")}Guruhlar</a>
      <span aria-hidden="true">/</span>
      <span>${escapeHtml(group.name)}</span>
    </nav>

    <section class="sheet-head">
      <div>
        <p class="eyebrow">Guruhni boshqarish</p>
        <h1>${escapeHtml(group.name)}</h1>
        <p class="lede">${escapeHtml(group.course)} · ${students.length} ta talaba · O'qituvchi: ${escapeHtml(
          group.teacher_name || "biriktirilmagan"
        )}</p>
      </div>
      <a class="btn btn-primary" href="/groups/${group.id}/attendance">${icon("clipboard")}Davomat olish</a>
    </section>

    ${flashFromQuery(url, ok, errors)}

    <div class="sheet-layout">
      <section class="panel sheet">
        <header class="sheet-header">
          <div>
            <h2>Talabalar</h2>
            <p class="muted">Ismni o'zgartirib «Saqlash»ni bosing.</p>
          </div>
          <span class="chip chip-soft">${students.length} ta</span>
        </header>
        ${
          students.length > 0
            ? `<div class="student-list">${rows}</div>`
            : `<div class="empty-state">Bu guruhda hali talabalar yo'q.</div>`
        }
        <form class="add-students" method="post" action="/admin/groups/${group.id}/students">
          ${csrfField(csrf)}
          <div class="field">
            <label for="new-students">Yangi talabalar</label>
            <textarea class="input" id="new-students" name="names" rows="4" required placeholder="Har bir qatorga bitta ism-familiya&#10;Masalan:&#10;Aliyev Jasur&#10;Karimova Dilnoza"></textarea>
            <span class="hint">Har bir qatorga bitta talaba. Bir martada 200 tagacha.</span>
          </div>
          <button class="btn btn-primary" type="submit">${icon("plus")}Talabalarni qo'shish</button>
        </form>
      </section>

      <aside class="sheet-aside">
        <section class="panel form-panel">
          <h2>Guruh ma'lumotlari</h2>
          <form class="form-stack" method="post" action="/admin/groups/${group.id}">
            ${csrfField(csrf)}
            ${groupFields(group, teachers, "edit")}
            <button class="btn btn-primary" type="submit">O'zgarishlarni saqlash</button>
          </form>
        </section>

        <section class="panel form-panel danger-zone">
          <h2>Guruhni o'chirish</h2>
          <p class="muted">Guruh, undagi barcha talabalar va davomat tarixi butunlay o'chiriladi.</p>
          <form method="post" action="/admin/groups/${group.id}/delete" data-confirm="«${escapeHtml(group.name)}» guruhi butunlay o'chirilsinmi?">
            ${csrfField(csrf)}
            <button class="btn btn-danger" type="submit">${icon("trash")}Guruhni o'chirish</button>
          </form>
        </section>
      </aside>
    </div>`,
  };
}

export function renderUsersAdmin({ users, currentUser, csrf, url }) {
  const ok = {
    created: "Foydalanuvchi qo'shildi.",
    password: "Parol yangilandi. Foydalanuvchining eski sessiyalari yopildi.",
    deleted: "Foydalanuvchi o'chirildi. Uning guruhlari biriktirilmagan holatga o'tdi.",
  };
  const errors = {
    name: "Ism-familiya 1–80 belgidan iborat bo'lishi kerak.",
    username: "Login 3–32 belgi: faqat kichik lotin harflari, raqamlar, nuqta, _ yoki -.",
    exists: "Bu login band.",
    password: "Parol 8–128 belgidan iborat bo'lishi kerak.",
    role: "Rolni tanlang.",
    self: "O'zingizning hisobingizni bu yerdan o'zgartira olmaysiz. Profil sahifasidan foydalaning.",
  };

  const rows = users
    .map((u) => {
      const isSelf = u.id === currentUser.id;
      const actions = isSelf
        ? `<span class="chip chip-soft">Siz</span> <a class="text-link" href="/account">Profil</a>`
        : `<form class="inline-form" method="post" action="/admin/users/${u.id}/password">
              ${csrfField(csrf)}
              <label class="visually-hidden" for="reset-${u.id}">${escapeHtml(u.full_name)} uchun yangi parol</label>
              <input class="input input-sm" id="reset-${u.id}" name="password" type="password" minlength="8" maxlength="128" required placeholder="Yangi parol" autocomplete="new-password">
              <button class="btn btn-secondary btn-sm" type="submit">${icon("key")}Almashtirish</button>
            </form>
            <form method="post" action="/admin/users/${u.id}/delete" data-confirm="${escapeHtml(u.full_name)} o'chirilsinmi?">
              ${csrfField(csrf)}
              <button class="btn btn-ghost btn-sm btn-icon" type="submit" aria-label="${escapeHtml(u.full_name)}ni o'chirish">${icon("trash")}</button>
            </form>`;
      return `
          <tr>
            <td>
              <div class="table-group">
                <span class="avatar avatar-sm ${toneFor(u.full_name)}">${escapeHtml(initials(u.full_name))}</span>
                <span>${escapeHtml(u.full_name)}</span>
              </div>
            </td>
            <td><code>${escapeHtml(u.username)}</code></td>
            <td><span class="chip ${u.role === "admin" ? "chip-soft" : "chip-neutral"}">${ROLE_LABELS[u.role]}</span></td>
            <td class="hide-sm">${u.group_count}</td>
            <td><div class="row-actions">${actions}</div></td>
          </tr>`;
    })
    .join("");

  return {
    title: "Foydalanuvchilar",
    active: "users",
    body: `
    <section class="hero">
      <div>
        <p class="eyebrow">Boshqaruv paneli</p>
        <h1>Foydalanuvchilar</h1>
        <p class="lede">O'qituvchilar va administratorlar uchun login yarating, parollarni boshqaring.</p>
      </div>
      <span class="chip chip-soft">${users.length} ta foydalanuvchi</span>
    </section>

    ${flashFromQuery(url, ok, errors)}

    <div class="sheet-layout">
      <section class="panel table-panel">
        <table class="table">
          <thead>
            <tr>
              <th scope="col">Ism</th>
              <th scope="col">Login</th>
              <th scope="col">Rol</th>
              <th scope="col" class="hide-sm">Guruhlar</th>
              <th scope="col">Amallar</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </section>

      <aside class="sheet-aside">
        <section class="panel form-panel">
          <h2>Yangi foydalanuvchi</h2>
          <form class="form-stack" method="post" action="/admin/users">
            ${csrfField(csrf)}
            <div class="field">
              <label for="user-name">Ism-familiya</label>
              <input class="input" id="user-name" name="full_name" maxlength="80" required placeholder="Masalan: Rahimov Bekzod">
            </div>
            <div class="field">
              <label for="user-login">Login</label>
              <input class="input" id="user-login" name="username" minlength="3" maxlength="32" pattern="[a-z0-9._\\-]{3,32}" required autocomplete="off" placeholder="masalan: bekzod">
              <span class="hint">Kichik lotin harflari, raqamlar, nuqta, _ yoki -.</span>
            </div>
            <div class="field">
              <label for="user-password">Parol</label>
              <input class="input" id="user-password" name="password" type="password" minlength="8" maxlength="128" required autocomplete="new-password">
              <span class="hint">Kamida 8 ta belgi.</span>
            </div>
            <div class="field">
              <label for="user-role">Rol</label>
              <select class="input" id="user-role" name="role">
                <option value="teacher">O'qituvchi — faqat o'z guruhlari</option>
                <option value="admin">Administrator — to'liq boshqaruv</option>
              </select>
            </div>
            <button class="btn btn-primary" type="submit">${icon("plus")}Foydalanuvchi qo'shish</button>
          </form>
        </section>
      </aside>
    </div>`,
  };
}
