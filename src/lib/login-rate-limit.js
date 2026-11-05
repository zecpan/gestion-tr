import "server-only";
import { createHash } from "node:crypto";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const attempts = globalThis.__teamRoquetteLoginAttempts ?? new Map();
globalThis.__teamRoquetteLoginAttempts = attempts;

function keyForRequest(request) {
  // Production must bind Next only to the local reverse proxy and have that proxy
  // replace/append client address headers. Only a digest is kept in memory.
  const forwarded = request.headers.get("x-forwarded-for");
  const address = request.headers.get("x-real-ip") || forwarded?.split(",").at(-1)?.trim() || "unknown";
  return createHash("sha256").update(address).digest("hex");
}

export function loginRetryAfterSeconds(request) {
  const key = keyForRequest(request);
  const current = attempts.get(key);
  if (!current || current.resetAt <= Date.now()) {
    attempts.delete(key);
    return 0;
  }
  return current.failures >= MAX_FAILURES ? Math.ceil((current.resetAt - Date.now()) / 1000) : 0;
}

export function recordFailedLogin(request) {
  const now = Date.now();
  const key = keyForRequest(request);
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) attempts.set(key, { failures: 1, resetAt: now + WINDOW_MS });
  else current.failures += 1;
  if (attempts.size > 1000) {
    for (const [attemptKey, value] of attempts) {
      if (value.resetAt <= now || attempts.size > 1000) attempts.delete(attemptKey);
    }
  }
}

export function clearFailedLogins(request) {
  attempts.delete(keyForRequest(request));
}
