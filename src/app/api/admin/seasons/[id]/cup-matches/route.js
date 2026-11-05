import { NextResponse } from "next/server";
import { getAdminSession, isSameOriginRequest } from "../../../../../../lib/auth.js";
import { createCupMatch, listCupMatches } from "../../../../../../lib/cup-matches.js";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, context) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  const { id: seasonId } = await context.params;
  return NextResponse.json({ matches: listCupMatches(seasonId) });
}

export async function POST(request, context) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Requête non autorisée." }, { status: 403 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Requête invalide." }, { status: 400 }); }
  const { id: seasonId } = await context.params;
  try {
    const result = createCupMatch(seasonId, body, admin.username);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Cup match creation failed:", error);
    return NextResponse.json({ error: "La création du match de coupe a échoué." }, { status: 500 });
  }
}
