import { NextResponse } from "next/server";
import { getAdminSession, isSameOriginRequest } from "../../../../lib/auth.js";
import { createSeason, listSeasons } from "../../../../lib/seasons.js";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  return NextResponse.json({ seasons: listSeasons() });
}

export async function POST(request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Requête non autorisée." }, { status: 403 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Requête invalide." }, { status: 400 }); }
  try {
    const result = createSeason(body, admin.username);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Season creation failed:", error);
    return NextResponse.json({ error: "La création de la saison a échoué." }, { status: 500 });
  }
}
