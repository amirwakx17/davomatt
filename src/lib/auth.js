import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { query } from "../db.js";

const COOKIE_NAME = "sid";
const SESSION_DAYS = 7;
const secureCookie = process.env.NODE_ENV === "production";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseCookies(header) {
  const cookies = {};
  for (const part of String(header ?? "").split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    try {
      cookies[key] = decodeURIComponent(part.slice(index + 1).trim());
    } catch {
      // ignore malformed cookie values
    }
  }
  return cookies;
}

export async function createSession(userId) {
  const token = randomBytes(32).toString("base64url");
  const csrf = randomBytes(24).toString("base64url");
  await query("DELETE FROM sessions WHERE expires_at < now()");
  await query(
    `INSERT INTO sessions (id, user_id, csrf_token, expires_at)
     VALUES ($1, $2, $3, now() + make_interval(days => $4))`,
    [sha256(token), userId, csrf, SESSION_DAYS]
  );
  return token;
}

export async function getSession(req) {
  const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
  if (!token) return null;

  const rows = await query(
    `SELECT s.id AS session_id, s.csrf_token, u.id, u.username, u.full_name, u.role
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = $1 AND s.expires_at > now()`,
    [sha256(token)]
  );
  const row = rows[0];
  if (!row) return null;

  return {
    id: row.session_id,
    csrf: row.csrf_token,
    user: { id: row.id, username: row.username, fullName: row.full_name, role: row.role },
  };
}

export function destroySession(sessionId) {
  return query("DELETE FROM sessions WHERE id = $1", [sessionId]);
}

export function destroyUserSessions(userId, exceptSessionId = null) {
  return query("DELETE FROM sessions WHERE user_id = $1 AND ($2::text IS NULL OR id <> $2)", [
    userId,
    exceptSessionId,
  ]);
}

export function sessionCookie(token) {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secureCookie ? "; Secure" : ""}`;
}

export function clearedSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureCookie ? "; Secure" : ""}`;
}

export function csrfMatches(session, submitted) {
  const expected = Buffer.from(session.csrf);
  const actual = Buffer.from(String(submitted ?? ""));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

const MAX_FAILURES = 10;
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map();

export function clientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] ?? "").split(",").pop().trim();
  return forwarded || req.socket.remoteAddress || "unknown";
}

export function isRateLimited(key) {
  const entry = failures.get(key);
  if (!entry) return false;
  if (entry.resetAt < Date.now()) {
    failures.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

export function recordFailure(key) {
  const now = Date.now();
  const entry = failures.get(key);
  if (!entry || entry.resetAt < now) {
    failures.set(key, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

export function clearFailures(key) {
  failures.delete(key);
}
