import { NextResponse } from "next/server";
import { listPublicSeasons } from "../../../../lib/public-data.js";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ seasons: listPublicSeasons() }, { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" } });
}
