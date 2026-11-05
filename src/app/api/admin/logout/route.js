import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminCookieOptions, isSameOriginRequest, revokeAdminSession, ADMIN_SESSION_COOKIE } from "../../../../lib/auth.js";
export const runtime = "nodejs";
export async function POST(request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Requête non autorisée." }, { status: 403 });
  const cookieStore = await cookies();
  revokeAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", { ...adminCookieOptions(0), expires: new Date(0) });
  return response;
}
