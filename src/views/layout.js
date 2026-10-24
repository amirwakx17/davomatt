import { formatLongDate, todayISO } from "../lib/date.js";
import { escapeHtml } from "../lib/html.js";
import { icon } from "../lib/icons.js";

const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23e1622f'/%3E%3Cpath d='M18 33l9 9 19-21' stroke='white' stroke-width='6' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E";

export function layout({ title, body, active = "" }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} · Attendance</title>
  <link rel="icon" href="${FAVICON}">
  <link rel="stylesheet" href="/public/styles.css">
</head>
<body>
  <header class="topbar">
    <div class="topbar-inner">
      <a class="brand" href="/">
        <span class="brand-mark">${icon("check")}</span>
        <span class="brand-name">Attendance</span>
      </a>
      <nav class="topnav" aria-label="Main navigation">
        <a class="${active === "dashboard" ? "is-active" : ""}" href="/">Dashboard</a>
      </nav>
      <span class="topbar-date">${icon("calendar")}${escapeHtml(formatLongDate(todayISO()))}</span>
    </div>
  </header>
  <main class="page">
    ${body}
  </main>
  <footer class="site-footer">Attendance system · Students, groups and daily sessions</footer>
  <script src="/public/app.js" defer></script>
</body>
</html>`;
}
