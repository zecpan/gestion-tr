import { NextResponse } from "next/server";
import { getAdminSession, isSameOriginRequest } from "../../../../../../../lib/auth.js";
import { removePlayerFromSeason } from "../../../../../../../lib/players.js";
export const runtime = "nodejs";

export async function DELETE(request, context) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Requête non autorisée." }, { status: 403 });
  const { id: seasonId, playerId } = await context.params;
  try {
    const result = removePlayerFromSeason(seasonId, playerId, admin.username);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Season roster removal failed:", error);
    return NextResponse.json({ error: "Le retrait du joueur de l’effectif a échoué." }, { status: 500 });
  }
}
