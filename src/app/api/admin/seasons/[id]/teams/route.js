import { NextResponse } from "next/server";
import { getAdminSession, isSameOriginRequest } from "../../../../../../lib/auth.js";
import { addSeasonTeam } from "../../../../../../lib/season-teams.js";

export const runtime = "nodejs";

export async function POST(request, context) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Requête non autorisée." }, { status: 403 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Requête invalide." }, { status: 400 }); }
  const { id } = await context.params;
  try {
    const result = addSeasonTeam(id, body, admin.username);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    return NextResponse.json(result, { status: result.alreadyAdded ? 200 : 201 });
  } catch (error) {
    console.error("Season team addition failed:", error);
    return NextResponse.json({ error: "L’ajout de l’équipe a échoué." }, { status: 500 });
  }
}
