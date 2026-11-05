import { NextResponse } from "next/server";
import { getPublicSeasonResults } from "../../../../lib/public-data.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const seasonId = new URL(request.url).searchParams.get("saison");
  const result = getPublicSeasonResults(seasonId);
  return NextResponse.json(result, { headers: { "cache-control": "public, max-age=30, stale-while-revalidate=120" } });
}
