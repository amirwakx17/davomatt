import {
  clearFailures,
  clearedSessionCookie,
  clientIp,
  createSession,
  destroySession,
  destroyUserSessions,
  isRateLimited,
  recordFailure,
  sessionCookie,
} from "../lib/auth.js";
import { DUMMY_HASH, hashPassword, verifyPassword } from "../lib/password.js";
import { User } from "../models/user.js";
import { renderAccount } from "../views/account.js";
import { renderLogin } from "../views/login.js";

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export function showLogin(ctx) {
  if (ctx.user) return ctx.redirect("/");
  ctx.render(renderLogin());
}

export async function login(ctx) {
  const ip = clientIp(ctx.req);
  const username = String(ctx.body.get("username") ?? "").trim().toLowerCase().slice(0, 64);
  const password = String(ctx.body.get("password") ?? "").slice(0, PASSWORD_MAX);

  if (isRateLimited(ip)) {
    return ctx.render(
      renderLogin({ username, error: "Juda ko'p urinish. 15 daqiqadan so'ng qayta urinib ko'ring." }),
      429
    );
  }

  const user = username ? await User.findByUsername(username) : null;
  const valid = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);

  if (!user || !valid) {
    recordFailure(ip);
    return ctx.render(renderLogin({ username, error: "Login yoki parol noto'g'ri." }), 401);
  }

  clearFailures(ip);
  const token = await createSession(user.id);
  ctx.redirect("/", { "Set-Cookie": sessionCookie(token) });
}

export async function logout(ctx) {
  await destroySession(ctx.session.id);
  ctx.redirect("/login", { "Set-Cookie": clearedSessionCookie() });
}

export function showAccount(ctx) {
  ctx.render(renderAccount({ user: ctx.user, csrf: ctx.csrf, url: ctx.url }));
}

export async function changePassword(ctx) {
  const current = String(ctx.body.get("current_password") ?? "");
  const next = String(ctx.body.get("new_password") ?? "");
  const confirm = String(ctx.body.get("confirm_password") ?? "");

  const user = await User.findById(ctx.user.id);
  if (!(await verifyPassword(current.slice(0, PASSWORD_MAX), user.password_hash))) {
    return ctx.redirect("/account?error=current");
  }
  if (next.length < PASSWORD_MIN || next.length > PASSWORD_MAX) {
    return ctx.redirect("/account?error=short");
  }
  if (next !== confirm) {
    return ctx.redirect("/account?error=mismatch");
  }

  await User.setPasswordHash(user.id, await hashPassword(next));
  await destroyUserSessions(user.id, ctx.session.id);
  ctx.redirect("/account?ok=password");
}
