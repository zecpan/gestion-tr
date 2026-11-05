import { NextResponse } from "next/server";
import { getAdminSession, isSameOriginRequest } from "../../../../../../lib/auth.js";
import { declareSeasonGeneralForfeit, listSeasonTeams } from "../../../../../../lib/team-forfeits.js";
export const runtime = "nodejs";

export async function GET(request, context) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  const { id: seasonId } = await context.params;
  return NextResponse.json({ teams: listSeasonTeams(seasonId) });
}

export async function POST(request, context) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Requête non autorisée." }, { status: 403 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Requête invalide." }, { status: 400 }); }
  const { id: seasonId } = await context.params;
  try {
    const result = declareSeasonGeneralForfeit(seasonId, body?.teamId, admin.username);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    return NextResponse.json(result);
  } catch (error) {
    console.error("General forfeit declaration failed:", error);
    return NextResponse.json({ error: "La déclaration du forfait général a échoué." }, { status: 500 });
  }
}
