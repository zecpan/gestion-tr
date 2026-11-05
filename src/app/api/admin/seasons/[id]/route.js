import { NextResponse } from "next/server";
import { getAdminSession, isSameOriginRequest } from "../../../../../lib/auth.js";
import { updateSeason } from "../../../../../lib/seasons.js";
export const runtime = "nodejs";

export async function PATCH(request, context) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Requête non autorisée." }, { status: 403 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Requête invalide." }, { status: 400 }); }
  const { id } = await context.params;
  try {
    const result = updateSeason(id, body, admin.username);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Season update failed:", error);
    return NextResponse.json({ error: "La modification de la saison a échoué." }, { status: 500 });
  }
}
