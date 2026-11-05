import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/auth.js";
import { listRecentAudit } from "../../../../lib/audit.js";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  return NextResponse.json({ events: listRecentAudit(100) });
}
