import { escapeHtml } from "../lib/html.js";
import { icon } from "../lib/icons.js";

export function renderLogin({ username = "", error = "" } = {}) {
  return {
    title: "Kirish",
    body: `
    <section class="auth-page">
      <div class="panel auth-card">
        <span class="auth-mark">${icon("lock")}</span>
        <h1>Tizimga kirish</h1>
        <p class="muted auth-lede">Davomat tizimiga kirish uchun login va parolingizni kiriting.</p>
        ${
          error
            ? `<div class="flash flash-error" role="alert">${icon("xCircle")}<span>${escapeHtml(error)}</span></div>`
            : ""
        }
        <form class="form-stack" method="post" action="/login">
          <div class="field">
            <label for="login-username">Login</label>
            <input class="input" id="login-username" name="username" value="${escapeHtml(username)}"
              autocomplete="username" autocapitalize="none" spellcheck="false" required ${username ? "" : "autofocus"}>
          </div>
          <div class="field">
            <label for="login-password">Parol</label>
            <input class="input" id="login-password" name="password" type="password"
              autocomplete="current-password" required ${username ? "autofocus" : ""}>
          </div>
          <button class="btn btn-primary btn-block" type="submit">Kirish</button>
        </form>
      </div>
    </section>`,
  };
}
