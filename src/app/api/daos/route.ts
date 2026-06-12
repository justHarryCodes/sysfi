export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { fetchDAOsFromChain, getSupportedChains } from "@/lib/blockchain-dao";

export async function GET() {
  try {
    const chains = getSupportedChains();
    const results = await Promise.all(
      chains.map((c) => fetchDAOsFromChain(c.id, 0, 100)),
    );
    const daos = results.flat();
    return NextResponse.json({ success: true, count: daos.length, data: daos });
  } catch (err) {
    console.error("GET /api/daos:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch DAOs" }, { status: 500 });
  }
}
