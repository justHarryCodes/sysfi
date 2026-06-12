export const dynamic = 'force-dynamic';

/**
 * GET /api/tokens/:pool?chainId=84532
 *
 * Returns the token + latest pool_stats from PostgreSQL.
 * Falls back to null if not in the database yet (the UI then reads from blockchain).
 */

import { NextRequest, NextResponse } from "next/server";
import { hasPG }                      from "@/lib/postgres";
import { getToken }                   from "@/lib/db/queries";

export async function GET(
  req:     NextRequest,
  { params }: { params: { pool: string } }
) {
  const chainId = Number(new URL(req.url).searchParams.get("chainId") ?? 0);
  const pool    = params.pool.toLowerCase();

  if (!chainId) return NextResponse.json({ error: "chainId required" }, { status: 400 });

  if (!hasPG()) return NextResponse.json({ fallback: true, data: null });

  try {
    const row = await getToken(pool, chainId);
    if (!row) return NextResponse.json({ fallback: false, data: null }, { status: 404 });
    return NextResponse.json({ fallback: false, data: row });
  } catch (err) {
    console.error("[GET /api/tokens/:pool]", err);
    return NextResponse.json({ fallback: true, data: null });
  }
}
