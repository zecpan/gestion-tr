import { NextResponse } from "next/server";
import { getPublicTeamStandings } from "../../../../lib/standings.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const seasonId = new URL(request.url).searchParams.get("saison");
  return NextResponse.json(getPublicTeamStandings(seasonId), {
    headers: { "cache-control": "public, max-age=30, stale-while-revalidate=120" },
  });
}
