import "server-only";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getDatabase } from "./db.js";

export const ADMIN_SESSION_COOKIE = "team_roquette_admin";
const SESSION_TTL_SECONDS = 8 * 60 * 60;

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyAdminCredentials(username, password) {
  const configuredUsername = process.env.ADMIN_USERNAME;
  const encodedHash = process.env.ADMIN_PASSWORD_HASH;
  if (!configuredUsername || !encodedHash || typeof password !== "string" || !password) return false;
  const [scheme, salt, expectedHash] = encodedHash.split("$");
  if (scheme !== "scrypt" || !salt || !expectedHash) return false;
  const actualHash = scryptSync(password, salt, 64).toString("base64url");
  return safeEqual(username, configuredUsername) && safeEqual(actualHash, expectedHash);
}

export function createAdminSession(username) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
  const token = randomBytes(32).toString("base64url");
  const db = getDatabase();
  db.prepare("DELETE FROM admin_sessions WHERE expires_at <= ?").run(now.toISOString());
  db.prepare("INSERT INTO admin_sessions (token_hash, username, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .run(hashSessionToken(token), username, expiresAt.toISOString(), now.toISOString());
  return { token, expiresAt };
}

export function verifyAdminSession(token) {
  if (typeof token !== "string" || token.length < 40 || token.length > 100) return null;
  const db = getDatabase();
  const tokenHash = hashSessionToken(token);
  const row = db.prepare("SELECT username, expires_at AS expiresAt FROM admin_sessions WHERE token_hash = ?").get(tokenHash);
  if (!row) return null;
  const expires = Date.parse(row.expiresAt);
  if (!Number.isFinite(expires) || expires <= Date.now() || row.username !== process.env.ADMIN_USERNAME) {
    db.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").run(tokenHash);
    return null;
  }
  return { username: row.username, expiresAt: Math.floor(expires / 1000) };
}

export function revokeAdminSession(token) {
  if (typeof token !== "string" || token.length < 40 || token.length > 100) return;
  getDatabase().prepare("DELETE FROM admin_sessions WHERE token_hash = ?").run(hashSessionToken(token));
}

export async function getAdminSession() {
  const store = await cookies();
  return verifyAdminSession(store.get(ADMIN_SESSION_COOKIE)?.value);
}

export function isSameOriginRequest(request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const originUrl = new URL(origin);
    const host = request.headers.get("host");
    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const requestProtocol = forwardedProtocol ? `${forwardedProtocol}:` : new URL(request.url).protocol;
    return Boolean(host) && originUrl.host.toLowerCase() === host.toLowerCase() && originUrl.protocol === requestProtocol;
  } catch {
    return false;
  }
}

export function adminCookieOptions(maxAge = SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge,
  };
}
