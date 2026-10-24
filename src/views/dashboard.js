import { formatLongDate, formatShortDate } from "../lib/date.js";
import { escapeHtml, initials, toneFor } from "../lib/html.js";
import { icon } from "../lib/icons.js";
import { layout } from "./layout.js";

function statCard({ label, value, hint, iconName, tone }) {
  return `
    <article class="stat-card">
      <span class="stat-icon stat-${tone}">${icon(iconName)}</span>
      <div class="stat-copy">
        <span class="stat-value">${escapeHtml(value)}</span>
        <span class="stat-label">${escapeHtml(label)}</span>
        <span class="stat-hint">${escapeHtml(hint)}</span>
      </div>
    </article>`;
}

function groupCard(group) {
  const total = group.student_count;
  const present = group.present_today;
  const absent = group.absent_today;
  const marked = present + absent;
  const rate = marked > 0 ? Math.round((present / total) * 100) : null;
  const presentWidth = total > 0 ? (present / total) * 100 : 0;
  const absentWidth = total > 0 ? (absent / total) * 100 : 0;

  return `
    <article class="panel group-card">
      <div class="group-card-head">
        <span class="avatar avatar-lg ${toneFor(group.name)}">${escapeHtml(initials(group.name))}</span>
        <div class="group-card-title">
          <h3>${escapeHtml(group.name)}</h3>
          <p>${escapeHtml(group.course)}</p>
        </div>
        <span class="chip chip-neutral">${icon("clock")}${escapeHtml(group.schedule)}</span>
      </div>
      <div class="group-card-body">
        <div class="group-figures">
          <div>
            <strong>${total}</strong>
            <span>Students</span>
          </div>
          <div>
            <strong>${present}<span class="muted"> / ${total}</span></strong>
            <span>Present today</span>
          </div>
          <div>
            <strong>${rate === null ? "&mdash;" : `${rate}%`}</strong>
            <span>Attendance rate</span>
          </div>
        </div>
        <div class="progress" role="img" aria-label="${present} present, ${absent} absent, ${Math.max(total - marked, 0)} unmarked">
          <span class="progress-present" style="width:${presentWidth}%"></span>
          <span class="progress-absent" style="width:${absentWidth}%"></span>
        </div>
        <div class="group-card-status">
          ${
            marked > 0
              ? `<span class="status-dot status-dot-saved"></span><span>${marked} marked today</span>`
              : `<span class="status-dot"></span><span>Not recorded yet</span>`
          }
          <a class="card-link" href="/groups/${group.id}/attendance">
            ${marked > 0 ? "Review attendance" : "Take attendance"}
            ${icon("arrowRight")}
          </a>
        </div>
      </div>
    </article>`;
}

function recentRow(session) {
  const marked = session.marked || 0;
  const rate = marked > 0 ? Math.round((session.present / marked) * 100) : 0;

  return `
    <tr>
      <td>
        <div class="table-group">
          <span class="avatar avatar-sm ${toneFor(session.group_name)}">${escapeHtml(initials(session.group_name))}</span>
          <span>${escapeHtml(session.group_name)}</span>
        </div>
      </td>
      <td>${escapeHtml(formatShortDate(session.date))}</td>
      <td><span class="count count-present">${session.present}</span></td>
      <td><span class="count count-absent">${session.absent}</span></td>
      <td class="hide-sm"><span class="chip chip-neutral">${rate}%</span></td>
      <td class="cell-action">
        <a class="icon-link" href="/groups/${session.group_id}/attendance?date=${session.date}" aria-label="Open session from ${escapeHtml(formatLongDate(session.date))}">
          ${icon("arrowRight")}
        </a>
      </td>
    </tr>`;
}

export function renderDashboard({ today, groups, totals, studentTotal, recent }) {
  const markedToday = totals.present + totals.absent;
  const groupCards = groups.map(groupCard).join("");

  const recentTable =
    recent.length > 0
      ? `<table class="table">
          <thead>
            <tr>
              <th scope="col">Group</th>
              <th scope="col">Date</th>
              <th scope="col">Present</th>
              <th scope="col">Absent</th>
              <th scope="col" class="hide-sm">Rate</th>
              <th scope="col"><span class="visually-hidden">Open</span></th>
            </tr>
          </thead>
          <tbody>${recent.map(recentRow).join("")}</tbody>
        </table>`
      : `<div class="empty-state">No attendance has been saved yet.</div>`;

  const body = `
    <section class="hero">
      <div>
        <p class="eyebrow">Overview</p>
        <h1>Attendance overview</h1>
        <p class="lede">Track daily attendance across your groups and keep every lesson on record.</p>
      </div>
      <span class="date-pill">${icon("calendar")}${escapeHtml(formatLongDate(today))}</span>
    </section>

    <section class="stats-grid" aria-label="Overview statistics">
      ${statCard({
        label: "Groups",
        value: groups.length,
        hint: "Active groups",
        iconName: "layers",
        tone: "orange",
      })}
      ${statCard({
        label: "Students",
        value: studentTotal,
        hint: "Across all groups",
        iconName: "users",
        tone: "blue",
      })}
      ${statCard({
        label: "Present today",
        value: totals.present,
        hint: markedToday > 0 ? "Marked today" : "No sessions yet",
        iconName: "checkCircle",
        tone: "green",
      })}
      ${statCard({
        label: "Absent today",
        value: totals.absent,
        hint: markedToday > 0 ? "Marked today" : "No sessions yet",
        iconName: "xCircle",
        tone: "red",
      })}
    </section>

    <section class="section" id="groups">
      <div class="section-head">
        <div>
          <h2>Your groups</h2>
          <p class="muted">Choose a group to mark today&rsquo;s attendance.</p>
        </div>
        <span class="chip chip-soft">${groups.length} groups</span>
      </div>
      ${
        groups.length > 0
          ? `<div class="group-grid">${groupCards}</div>`
          : `<div class="panel empty-state">No groups have been added yet.</div>`
      }
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <h2>Recent sessions</h2>
          <p class="muted">Latest saved attendance sheets.</p>
        </div>
      </div>
      <div class="panel table-panel">${recentTable}</div>
    </section>`;

  return layout({ title: "Dashboard", body, active: "dashboard" });
}
