import { NextResponse } from "next/server";
import { getPublicSeasonPlayerStandings } from "../../../../lib/player-standings.js";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const seasonId = searchParams.get("saison");
  return NextResponse.json(getPublicSeasonPlayerStandings(seasonId));
}
