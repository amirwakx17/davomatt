import { formatLongDate, formatShortDate } from "../lib/date.js";
import { escapeHtml, initials, toneFor } from "../lib/html.js";
import { icon } from "../lib/icons.js";

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
            <span>Talabalar</span>
          </div>
          <div>
            <strong>${present}<span class="muted"> / ${total}</span></strong>
            <span>Bugun kelgan</span>
          </div>
          <div>
            <strong>${rate === null ? "&mdash;" : `${rate}%`}</strong>
            <span>Davomat foizi</span>
          </div>
        </div>
        <div class="progress" role="img" aria-label="${present} kelgan, ${absent} kelmagan, ${Math.max(total - marked, 0)} belgilanmagan">
          <span class="progress-present" style="width:${presentWidth}%"></span>
          <span class="progress-absent" style="width:${absentWidth}%"></span>
        </div>
        <div class="group-card-status">
          ${
            marked > 0
              ? `<span class="status-dot status-dot-saved"></span><span>${marked} talaba belgilangan</span>`
              : `<span class="status-dot"></span><span>Hali kiritilmagan</span>`
          }
          <a class="card-link" href="/groups/${group.id}/attendance">
            ${marked > 0 ? "Davomatni ko'rish" : "Davomat olish"}
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
        <a class="icon-link" href="/groups/${session.group_id}/attendance?date=${session.date}" aria-label="${escapeHtml(formatLongDate(session.date))} sanasidagi darsni ochish">
          ${icon("arrowRight")}
        </a>
      </td>
    </tr>`;
}

export function renderDashboard({ today, groups, totals, studentTotal, recent, user }) {
  const isAdmin = user.role === "admin";
  const markedToday = totals.present + totals.absent;
  const groupCards = groups.map(groupCard).join("");
  const emptyGroups = isAdmin
    ? `Hali guruh yo'q. <a class="text-link" href="/admin/groups">Birinchi guruhni yarating</a>.`
    : "Sizga hali guruh biriktirilmagan. Administratorga murojaat qiling.";

  const recentTable =
    recent.length > 0
      ? `<table class="table">
          <thead>
            <tr>
              <th scope="col">Guruh</th>
              <th scope="col">Sana</th>
              <th scope="col">Kelgan</th>
              <th scope="col">Kelmagan</th>
              <th scope="col" class="hide-sm">Foiz</th>
              <th scope="col"><span class="visually-hidden">Ochish</span></th>
            </tr>
          </thead>
          <tbody>${recent.map(recentRow).join("")}</tbody>
        </table>`
      : `<div class="empty-state">Hali davomat saqlanmagan.</div>`;

  const body = `
    <section class="hero">
      <div>
        <p class="eyebrow">Xush kelibsiz, ${escapeHtml(user.fullName)}</p>
        <h1>Davomat bo'yicha umumiy ko'rinish</h1>
        <p class="lede">${
          isAdmin
            ? "Barcha guruhlardagi kundalik davomatni nazorat qiling va har bir darsni hisobda turing."
            : "Sizga biriktirilgan guruhlarning kundalik davomatini belgilang."
        }</p>
      </div>
      <div class="hero-actions">
        <span class="date-pill">${icon("calendar")}${escapeHtml(formatLongDate(today))}</span>
        ${isAdmin ? `<a class="btn btn-primary" href="/admin/groups">${icon("plus")}Guruh qo'shish</a>` : ""}
      </div>
    </section>

    <section class="stats-grid" aria-label="Umumiy statistika">
      ${statCard({
        label: "Guruhlar",
        value: groups.length,
        hint: "Faol guruhlar",
        iconName: "layers",
        tone: "orange",
      })}
      ${statCard({
        label: "Talabalar",
        value: studentTotal,
        hint: isAdmin ? "Barcha guruhlar bo'yicha" : "Sizning guruhlaringizda",
        iconName: "users",
        tone: "blue",
      })}
      ${statCard({
        label: "Bugun kelgan",
        value: totals.present,
        hint: markedToday > 0 ? "Bugun belgilangan" : "Hali dars o'tilmagan",
        iconName: "checkCircle",
        tone: "green",
      })}
      ${statCard({
        label: "Bugun kelmagan",
        value: totals.absent,
        hint: markedToday > 0 ? "Bugun belgilangan" : "Hali dars o'tilmagan",
        iconName: "xCircle",
        tone: "red",
      })}
    </section>

    <section class="section" id="groups">
      <div class="section-head">
        <div>
          <h2>${isAdmin ? "Barcha guruhlar" : "Sizning guruhlaringiz"}</h2>
          <p class="muted">Bugungi davomatni belgilash uchun guruh tanlang.</p>
        </div>
        <span class="chip chip-soft">${groups.length} ta guruh</span>
      </div>
      ${
        groups.length > 0
          ? `<div class="group-grid">${groupCards}</div>`
          : `<div class="panel empty-state">${emptyGroups}</div>`
      }
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <h2>So'nggi darslar</h2>
          <p class="muted">Oxirgi saqlangan davomat varaqlari.</p>
        </div>
      </div>
      <div class="panel table-panel">${recentTable}</div>
    </section>`;

  return { title: "Bosh sahifa", body, active: "dashboard" };
}
