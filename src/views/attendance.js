import { formatLongDate } from "../lib/date.js";
import { escapeHtml, initials, toneFor } from "../lib/html.js";
import { icon } from "../lib/icons.js";
import { csrfField } from "./layout.js";

const ERROR_MESSAGES = {
  mark: "Saqlashdan oldin har bir talabani belgilang.",
  date: "Iltimos, to'g'ri dars sanasini tanlang.",
  empty: "Bu guruhda hali talabalar yo'q.",
};

function studentRow(student, index, status) {
  const isPresent = status === "present";
  const isAbsent = status === "absent";
  const position = String(index + 1).padStart(2, "0");

  return `
    <div class="student-row" data-student-row data-status="${escapeHtml(status)}">
      <span class="avatar ${toneFor(student.full_name)}">${escapeHtml(initials(student.full_name))}</span>
      <div class="student-info">
        <strong>${escapeHtml(student.full_name)}</strong>
        <span>${position}-talaba</span>
      </div>
      <div class="segmented" role="group" aria-label="Davomat: ${escapeHtml(student.full_name)}">
        <button type="button" class="seg seg-present${isPresent ? " is-active" : ""}" data-status="present" aria-pressed="${isPresent}">
          ${icon("check")}<span>Kelgan</span>
        </button>
        <button type="button" class="seg seg-absent${isAbsent ? " is-active" : ""}" data-status="absent" aria-pressed="${isAbsent}">
          ${icon("x")}<span>Kelmagan</span>
        </button>
      </div>
      <input type="hidden" name="status-${student.id}" value="${escapeHtml(status)}" data-status-input>
    </div>`;
}

export function renderAttendancePage({ group, students, date, statuses, saved, error, csrf, isAdmin }) {
  const total = students.length;
  const present = [...statuses.values()].filter((status) => status === "present").length;
  const absent = [...statuses.values()].filter((status) => status === "absent").length;
  const marked = present + absent;
  const unmarked = Math.max(total - marked, 0);
  const presentWidth = total > 0 ? (present / total) * 100 : 0;
  const absentWidth = total > 0 ? (absent / total) * 100 : 0;
  const savedLabel =
    marked === 0 ? "Saqlanmagan" : marked === total ? "Saqlangan" : `${marked}/${total} saqlangan`;
  const savedChipClass = marked === 0 ? "chip-neutral" : marked === total ? "chip-green" : "chip-amber";

  const successFlash = saved
    ? `<div class="flash flash-success" role="status">
         ${icon("checkCircle")}
         <span><strong>${escapeHtml(formatLongDate(date))}</strong> sanasidagi davomat saqlandi.</span>
       </div>`
    : "";

  const errorFlash =
    error && ERROR_MESSAGES[error]
      ? `<div class="flash flash-error" role="alert">
           ${icon("xCircle")}
           <span>${escapeHtml(ERROR_MESSAGES[error])}</span>
         </div>`
      : "";

  const rows = students.map((student, index) => studentRow(student, index, statuses.get(student.id) || "")).join("");

  const sheet =
    total > 0
      ? `<form id="attendance-form" method="post" action="/groups/${group.id}/attendance">
          ${csrfField(csrf)}
          <input type="hidden" name="date" value="${escapeHtml(date)}">
          <div class="student-list">${rows}</div>
          <div class="form-error" id="form-error" hidden>
            ${icon("xCircle")}<span>Saqlashdan oldin har bir talabani belgilang.</span>
          </div>
          <footer class="sheet-footer">
            <div class="quick-actions">
              <button type="button" class="btn btn-ghost btn-sm" data-mark-all="present">Barchasini kelgan</button>
              <button type="button" class="btn btn-ghost btn-sm" data-mark-all="absent">Barchasini kelmagan</button>
            </div>
            <div class="sheet-summary" aria-live="polite">
              <span class="summary-present"><b data-count="present">${present}</b> kelgan</span>
              <span class="summary-absent"><b data-count="absent">${absent}</b> kelmagan</span>
              <span class="summary-unmarked"><b data-count="unmarked">${unmarked}</b> belgilanmagan</span>
            </div>
            <button class="btn btn-primary" type="submit">${icon("clipboard")}Davomatni saqlash</button>
          </footer>
        </form>`
      : `<div class="empty-state">Bu guruhda hali talabalar yo'q.${
          isAdmin
            ? ` <a class="text-link" href="/admin/groups/${group.id}">Talabalarni qo'shing</a>.`
            : ""
        }</div>`;

  const body = `
    <nav class="breadcrumb" aria-label="Navigatsiya">
      <a href="/">${icon("arrowLeft")}Bosh sahifa</a>
      <span aria-hidden="true">/</span>
      <span>${escapeHtml(group.name)}</span>
    </nav>

    <section class="sheet-head">
      <div>
        <p class="eyebrow">Davomat varag'i</p>
        <h1>${escapeHtml(group.name)}</h1>
        <p class="lede">${[group.course, group.schedule, `${total} ta talaba`].filter(Boolean).map(escapeHtml).join(" · ")}</p>
      </div>
      <form class="date-picker" method="get" action="/groups/${group.id}/attendance">
        <label for="lesson-date">Dars sanasi</label>
        <div class="date-control">
          <input type="date" id="lesson-date" name="date" value="${escapeHtml(date)}">
          <button class="btn btn-secondary btn-sm" type="submit">Yuklash</button>
        </div>
      </form>
    </section>

    ${successFlash}
    ${errorFlash}

    <div class="sheet-layout">
      <section class="panel sheet">
        <header class="sheet-header">
          <div>
            <h2>Talabalar</h2>
            <p class="muted">Bu guruhda ${total} ta talaba</p>
          </div>
          <div class="sheet-header-actions">
            ${
              isAdmin
                ? `<a class="btn btn-ghost btn-sm" href="/admin/groups/${group.id}">${icon("settings")}Boshqarish</a>`
                : ""
            }
            <span class="chip ${savedChipClass}">${escapeHtml(savedLabel)}</span>
          </div>
        </header>
        ${sheet}
      </section>

      <aside class="sheet-aside">
        <section class="panel details">
          <div class="details-head">
            <h2>Davomat tafsilotlari</h2>
            <span class="chip ${savedChipClass}">${escapeHtml(savedLabel)}</span>
          </div>
          <dl>
            <div><dt>Guruh</dt><dd>${escapeHtml(group.name)}</dd></div>
            <div><dt>Sana</dt><dd>${escapeHtml(formatLongDate(date))}</dd></div>
            <div><dt>Kurs</dt><dd>${escapeHtml(group.course)}</dd></div>
            <div><dt>Dars vaqti</dt><dd>${escapeHtml(group.schedule || "—")}</dd></div>
            <div><dt>O'qituvchi</dt><dd>${escapeHtml(group.teacher_name || "Biriktirilmagan")}</dd></div>
            <div><dt>Talabalar</dt><dd>${total}</dd></div>
          </dl>
          <div class="details-progress">
            <div class="details-progress-head">
              <span>Dars jarayoni</span>
              <span data-count="marked">${marked} / ${total}</span>
            </div>
            <div class="progress progress-lg" id="session-progress" role="img" aria-label="${present} kelgan, ${absent} kelmagan, ${unmarked} belgilanmagan">
              <span class="progress-present" data-bar="present" style="width:${presentWidth}%"></span>
              <span class="progress-absent" data-bar="absent" style="width:${absentWidth}%"></span>
            </div>
            <p class="details-counts">
              <span class="summary-present"><b data-count="present">${present}</b> kelgan</span>
              <span class="summary-absent"><b data-count="absent">${absent}</b> kelmagan</span>
              <span class="summary-unmarked"><b data-count="unmarked">${unmarked}</b> belgilanmagan</span>
            </p>
          </div>
        </section>

        <section class="panel tip">
          <h2>Qanday ishlaydi</h2>
          <ol>
            <li><strong>Dars sanasini tanlang.</strong> Har bir sana uchun alohida varaq saqlanadi.</li>
            <li><strong>Har bir talabani belgilang</strong> — kelgan yoki kelmagan.</li>
            <li><strong>«Davomatni saqlash» tugmasini bosing</strong> — dars hisobga olinadi.</li>
          </ol>
        </section>
      </aside>
    </div>`;

  return { title: `${group.name} · Davomat`, body, active: "dashboard" };
}
