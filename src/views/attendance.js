import { formatLongDate } from "../lib/date.js";
import { escapeHtml, initials, toneFor } from "../lib/html.js";
import { icon } from "../lib/icons.js";
import { layout } from "./layout.js";

const ERROR_MESSAGES = {
  mark: "Please mark every student before saving.",
  date: "Please choose a valid lesson date.",
  empty: "This group has no students yet.",
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
        <span>Student ${position}</span>
      </div>
      <div class="segmented" role="group" aria-label="Attendance for ${escapeHtml(student.full_name)}">
        <button type="button" class="seg seg-present${isPresent ? " is-active" : ""}" data-status="present" aria-pressed="${isPresent}">
          ${icon("check")}<span>Present</span>
        </button>
        <button type="button" class="seg seg-absent${isAbsent ? " is-active" : ""}" data-status="absent" aria-pressed="${isAbsent}">
          ${icon("x")}<span>Absent</span>
        </button>
      </div>
      <input type="hidden" name="status-${student.id}" value="${escapeHtml(status)}" data-status-input>
    </div>`;
}

export function renderAttendancePage({ group, students, date, statuses, saved, error }) {
  const total = students.length;
  const present = [...statuses.values()].filter((status) => status === "present").length;
  const absent = [...statuses.values()].filter((status) => status === "absent").length;
  const marked = present + absent;
  const unmarked = Math.max(total - marked, 0);
  const presentWidth = total > 0 ? (present / total) * 100 : 0;
  const absentWidth = total > 0 ? (absent / total) * 100 : 0;
  const savedLabel =
    marked === 0 ? "Not saved" : marked === total ? "Saved" : `${marked}/${total} saved`;
  const savedChipClass = marked === 0 ? "chip-neutral" : marked === total ? "chip-green" : "chip-amber";

  const successFlash = saved
    ? `<div class="flash flash-success" role="status">
         ${icon("checkCircle")}
         <span>Attendance for <strong>${escapeHtml(formatLongDate(date))}</strong> was saved.</span>
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
          <input type="hidden" name="date" value="${escapeHtml(date)}">
          <div class="student-list">${rows}</div>
          <div class="form-error" id="form-error" hidden>
            ${icon("xCircle")}<span>Please mark every student before saving.</span>
          </div>
          <footer class="sheet-footer">
            <div class="quick-actions">
              <button type="button" class="btn btn-ghost btn-sm" data-mark-all="present">Mark all present</button>
              <button type="button" class="btn btn-ghost btn-sm" data-mark-all="absent">Mark all absent</button>
            </div>
            <div class="sheet-summary" aria-live="polite">
              <span class="summary-present"><b data-count="present">${present}</b> present</span>
              <span class="summary-absent"><b data-count="absent">${absent}</b> absent</span>
              <span class="summary-unmarked"><b data-count="unmarked">${unmarked}</b> unmarked</span>
            </div>
            <button class="btn btn-primary" type="submit">${icon("clipboard")}Take attendance</button>
          </footer>
        </form>`
      : `<div class="empty-state">This group has no students yet.</div>`;

  const body = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">${icon("arrowLeft")}Dashboard</a>
      <span aria-hidden="true">/</span>
      <span>${escapeHtml(group.name)}</span>
    </nav>

    <section class="sheet-head">
      <div>
        <p class="eyebrow">Attendance details</p>
        <h1>${escapeHtml(group.name)}</h1>
        <p class="lede">${escapeHtml(group.course)} · ${escapeHtml(group.schedule)} · ${total} students</p>
      </div>
      <form class="date-picker" method="get" action="/groups/${group.id}/attendance">
        <label for="lesson-date">Lesson date</label>
        <div class="date-control">
          <input type="date" id="lesson-date" name="date" value="${escapeHtml(date)}">
          <button class="btn btn-secondary btn-sm" type="submit">Load</button>
        </div>
      </form>
    </section>

    ${successFlash}
    ${errorFlash}

    <div class="sheet-layout">
      <section class="panel sheet">
        <header class="sheet-header">
          <div>
            <h2>Students</h2>
            <p class="muted">${total} ${total === 1 ? "student" : "students"} in this group</p>
          </div>
          <span class="chip ${savedChipClass}">${escapeHtml(savedLabel)}</span>
        </header>
        ${sheet}
      </section>

      <aside class="sheet-aside">
        <section class="panel details">
          <div class="details-head">
            <h2>Attendance details</h2>
            <span class="chip ${savedChipClass}">${escapeHtml(savedLabel)}</span>
          </div>
          <dl>
            <div><dt>Group</dt><dd>${escapeHtml(group.name)}</dd></div>
            <div><dt>Date</dt><dd>${escapeHtml(formatLongDate(date))}</dd></div>
            <div><dt>Course</dt><dd>${escapeHtml(group.course)}</dd></div>
            <div><dt>Schedule</dt><dd>${escapeHtml(group.schedule)}</dd></div>
            <div><dt>Students</dt><dd>${total}</dd></div>
          </dl>
          <div class="details-progress">
            <div class="details-progress-head">
              <span>Session progress</span>
              <span data-count="marked">${marked} / ${total}</span>
            </div>
            <div class="progress progress-lg" id="session-progress" role="img" aria-label="${present} present, ${absent} absent, ${unmarked} unmarked">
              <span class="progress-present" data-bar="present" style="width:${presentWidth}%"></span>
              <span class="progress-absent" data-bar="absent" style="width:${absentWidth}%"></span>
            </div>
            <p class="details-counts">
              <span class="summary-present"><b data-count="present">${present}</b> present</span>
              <span class="summary-absent"><b data-count="absent">${absent}</b> absent</span>
              <span class="summary-unmarked"><b data-count="unmarked">${unmarked}</b> unmarked</span>
            </p>
          </div>
        </section>

        <section class="panel tip">
          <h2>How it works</h2>
          <ol>
            <li><strong>Pick the lesson date.</strong> Each date keeps its own sheet.</li>
            <li><strong>Mark every student</strong> as present or absent.</li>
            <li><strong>Press &ldquo;Take attendance&rdquo;</strong> to save the session.</li>
          </ol>
        </section>
      </aside>
    </div>`;

  return layout({ title: `${group.name} attendance`, body });
}
