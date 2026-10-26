import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  const [saltHex, hashHex] = String(stored ?? "").split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(String(password ?? ""), Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(expected, actual);
}

// Compared against when the username does not exist, so response time doesn't reveal valid logins.
export const DUMMY_HASH = await hashPassword(randomBytes(16).toString("hex"));
