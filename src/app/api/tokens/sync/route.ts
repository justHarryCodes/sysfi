export const dynamic = 'force-dynamic';

/**
 * POST /api/tokens/sync?chainId=84532   → sync one chain
 * POST /api/tokens/sync                 → sync all chains
 *
 * GET  /api/tokens/sync?chainId=84532   → return sync state (last block, when)
 */

import { NextRequest, NextResponse } from "next/server";
import { hasPG } from "@/lib/postgres";
import { getSyncState } from "@/lib/db/queries";
import { syncChain, syncAllChains } from "@/lib/db/sync";

/** Safely serialize any object that may contain BigInt values */
function safeJson(data: unknown) {
  return JSON.parse(
    JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
  );
}

export async function GET(req: NextRequest) {
  const chainId = Number(new URL(req.url).searchParams.get("chainId") ?? 0);

  if (!hasPG()) {
    return NextResponse.json(
      { error: "PostgreSQL not configured" },
      { status: 503 },
    );
  }

  if (chainId) {
    const state = await getSyncState(chainId);
    return NextResponse.json({ chainId, state });
  }

  const { SUPPORTED_CHAIN_IDS } = await import("@/lib/chains");
  const states = await Promise.all(
    SUPPORTED_CHAIN_IDS.map((id) => getSyncState(id)),
  );
  return NextResponse.json({
    states: SUPPORTED_CHAIN_IDS.map((id, i) => ({
      chainId: id,
      state: states[i],
    })),
  });
}

export async function POST(req: NextRequest) {
  if (!hasPG()) {
    return NextResponse.json(
      { error: "PostgreSQL not configured" },
      { status: 503 },
    );
  }

  const chainId = Number(new URL(req.url).searchParams.get("chainId") ?? 0);

  try {
    if (chainId) {
      const result = await syncChain(chainId);
      return NextResponse.json(safeJson({ results: [result] })); // ← BigInt safe
    } else {
      const results = await syncAllChains();
      return NextResponse.json(safeJson({ results })); // ← BigInt safe
    }
  } catch (err) {
    console.error("[POST /api/tokens/sync]", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
