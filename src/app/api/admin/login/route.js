import { NextResponse } from "next/server";
import { adminCookieOptions, createAdminSession, isSameOriginRequest, verifyAdminCredentials, ADMIN_SESSION_COOKIE } from "../../../../lib/auth.js";
import { clearFailedLogins, loginRetryAfterSeconds, recordFailedLogin } from "../../../../lib/login-rate-limit.js";

export const runtime = "nodejs";

export async function POST(request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Requête non autorisée." }, { status: 403 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Requête invalide." }, { status: 400 }); }
  if (typeof body.username !== "string" || typeof body.password !== "string" || body.username.length > 100 || body.password.length > 256) {
    return NextResponse.json({ error: "Identifiant ou mot de passe invalide." }, { status: 400 });
  }
  const retryAfter = loginRetryAfterSeconds(request);
  if (retryAfter > 0) return NextResponse.json({ error: "Trop de tentatives. Réessayez plus tard." }, { status: 429, headers: { "retry-after": String(retryAfter) } });
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD_HASH) {
    return NextResponse.json({ error: "Connexion administrateur non configurée côté serveur." }, { status: 503 });
  }
  if (!verifyAdminCredentials(body.username, body.password)) {
    recordFailedLogin(request);
    return NextResponse.json({ error: "Identifiant ou mot de passe incorrect." }, { status: 401 });
  }
  clearFailedLogins(request);
  const session = createAdminSession(body.username);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, session.token, { ...adminCookieOptions(), expires: session.expiresAt });
  return response;
}
