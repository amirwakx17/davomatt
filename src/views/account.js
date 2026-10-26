import { escapeHtml } from "../lib/html.js";
import { csrfField, flashFromQuery } from "./layout.js";

const OK = { password: "Parolingiz almashtirildi. Boshqa qurilmalardagi sessiyalar yopildi." };
const ERRORS = {
  current: "Joriy parol noto'g'ri.",
  short: "Yangi parol kamida 8 belgidan iborat bo'lishi kerak.",
  mismatch: "Yangi parol va uning takrori mos kelmadi.",
};

export const ROLE_LABELS = { admin: "Administrator", teacher: "O'qituvchi" };

export function renderAccount({ user, csrf, url }) {
  return {
    title: "Profil",
    active: "account",
    body: `
    <section class="hero">
      <div>
        <p class="eyebrow">Profil</p>
        <h1>${escapeHtml(user.fullName)}</h1>
        <p class="lede">Login: <strong>${escapeHtml(user.username)}</strong> · ${ROLE_LABELS[user.role]}</p>
      </div>
    </section>

    <div class="narrow">
      ${flashFromQuery(url, OK, ERRORS)}
      <section class="panel form-panel">
        <h2>Parolni almashtirish</h2>
        <p class="muted">Xavfsizlik uchun avval joriy parolingizni kiriting.</p>
        <form class="form-stack" method="post" action="/account/password">
          ${csrfField(csrf)}
          <div class="field">
            <label for="current-password">Joriy parol</label>
            <input class="input" id="current-password" name="current_password" type="password" autocomplete="current-password" required>
          </div>
          <div class="field">
            <label for="new-password">Yangi parol</label>
            <input class="input" id="new-password" name="new_password" type="password" autocomplete="new-password" minlength="8" maxlength="128" required>
            <span class="hint">Kamida 8 ta belgi.</span>
          </div>
          <div class="field">
            <label for="confirm-password">Yangi parolni takrorlang</label>
            <input class="input" id="confirm-password" name="confirm_password" type="password" autocomplete="new-password" minlength="8" maxlength="128" required>
          </div>
          <button class="btn btn-primary" type="submit">Parolni saqlash</button>
        </form>
      </section>
    </div>`,
  };
}
