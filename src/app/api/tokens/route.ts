export const dynamic = 'force-dynamic';

/**
 * GET /api/tokens?chainId=84532&page=0&limit=20&search=pepe
 *
 * Returns tokens from PostgreSQL (fast).
 * Falls back to an empty list with a `fallback: true` flag if PG is not
 * configured — the UI then reads directly from the blockchain.
 *
 * Also triggers a background sync if the last sync was > SYNC_COOLDOWN_SECONDS ago.
 */

import { NextRequest, NextResponse } from "next/server";
import { hasPG }                      from "@/lib/postgres";
import { listTokens, getSyncState }   from "@/lib/db/queries";

const COOLDOWN = Number(process.env.SYNC_COOLDOWN_SECONDS ?? 30) * 1000;

// Simple in-process cooldown tracker so we don't hammer the sync on every request
const lastSyncTime = new Map<number, number>();

export async function GET(req: NextRequest) {
  const sp      = new URL(req.url).searchParams;
  const chainId = Number(sp.get("chainId") ?? 0);
  const page    = Math.max(0, Number(sp.get("page")  ?? 0));
  const limit   = Math.min(100, Math.max(1, Number(sp.get("limit") ?? 20)));
  const search  = sp.get("search")?.trim() || undefined;

  if (!chainId) {
    return NextResponse.json({ error: "chainId required" }, { status: 400 });
  }

  // If PG not configured, tell the client to fall back to blockchain
  if (!hasPG()) {
    return NextResponse.json({ fallback: true, data: [], total: 0, page, limit });
  }

  // Trigger a background sync if cooldown has passed
  const now        = Date.now();
  const lastSync   = lastSyncTime.get(chainId) ?? 0;
  const needsSync  = now - lastSync > COOLDOWN;

  if (needsSync) {
    lastSyncTime.set(chainId, now);
    // Fire-and-forget — do NOT await; the sync happens in the background
    fetch(`${req.nextUrl.origin}/api/tokens/sync?chainId=${chainId}`, { method: "POST" })
      .catch(() => { /* ignore errors — sync is best-effort */ });
  }

  try {
    const result = await listTokens({ chainId, page, limit, search });

    if (!result) {
      return NextResponse.json({ fallback: true, data: [], total: 0, page, limit });
    }

    // Serialise BigInt fields (NUMERIC columns come back as strings from pg — already safe)
    return NextResponse.json({
      fallback:  false,
      data:      result.rows,
      total:     result.total,
      page,
      limit,
      synced_at: (await getSyncState(chainId))?.last_synced ?? null,
    });

  } catch (err) {
    console.error("[GET /api/tokens]", err);
    return NextResponse.json({ fallback: true, data: [], total: 0, page, limit });
  }
}
