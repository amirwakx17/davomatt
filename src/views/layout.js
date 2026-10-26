import { escapeHtml, initials, toneFor } from "../lib/html.js";
import { icon } from "../lib/icons.js";

const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23e1622f'/%3E%3Cpath d='M18 33l9 9 19-21' stroke='white' stroke-width='6' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E";

export function csrfField(csrf) {
  return `<input type="hidden" name="_csrf" value="${escapeHtml(csrf)}">`;
}

export function flashFromQuery(url, okMessages = {}, errorMessages = {}) {
  const resolve = (messages, key) => {
    const message = messages[url.searchParams.get(key)];
    return typeof message === "function" ? message(url.searchParams) : message;
  };
  const ok = resolve(okMessages, "ok");
  const error = resolve(errorMessages, "error");

  return [
    ok
      ? `<div class="flash flash-success" role="status">${icon("checkCircle")}<span>${escapeHtml(ok)}</span></div>`
      : "",
    error
      ? `<div class="flash flash-error" role="alert">${icon("xCircle")}<span>${escapeHtml(error)}</span></div>`
      : "",
  ].join("");
}

function navigation(user, active) {
  const items = [["dashboard", "/", "Bosh sahifa"]];
  if (user.role === "admin") {
    items.push(["groups", "/admin/groups", "Guruhlar"], ["users", "/admin/users", "Foydalanuvchilar"]);
  }
  return `
      <nav class="topnav" aria-label="Asosiy navigatsiya">
        ${items
          .map(
            ([key, href, label]) =>
              `<a class="${active === key ? "is-active" : ""}" href="${href}">${label}</a>`
          )
          .join("")}
      </nav>`;
}

function userMenu(user, csrf, active) {
  return `
      <div class="user-menu">
        <a class="user-chip${active === "account" ? " is-active" : ""}" href="/account" title="Profil">
          <span class="avatar ${toneFor(user.fullName)}">${escapeHtml(initials(user.fullName))}</span>
          <span class="user-chip-name">${escapeHtml(user.fullName)}</span>
        </a>
        <form method="post" action="/logout">
          ${csrfField(csrf)}
          <button class="logout-btn" type="submit">Chiqish</button>
        </form>
      </div>`;
}

export function layout({ title, body, active = "", user = null, csrf = "" }) {
  return `<!doctype html>
<html lang="uz">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} · Davomat</title>
  <link rel="icon" href="${FAVICON}">
  <link rel="stylesheet" href="/public/styles.css">
</head>
<body>
  <header class="topbar">
    <div class="topbar-inner">
      <a class="brand" href="/" aria-label="Davomat — bosh sahifa">
        <span class="brand-mark">${icon("check")}</span>
        <span class="brand-name">Davomat</span>
      </a>
      ${user ? navigation(user, active) + userMenu(user, csrf, active) : ""}
    </div>
  </header>
  <main class="page">
    ${body}
  </main>
  <footer class="site-footer">Davomat tizimi · Talabalar, guruhlar va kunlik darslar</footer>
  <script src="/public/app.js" defer></script>
</body>
</html>`;
}
