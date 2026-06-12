export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getSupportedChains } from "@/lib/blockchain-dao";

export async function GET() {
  try {
    const db = await getDb();
    const [daoCount, proposalCount, guildCount] = await Promise.all([
      db.collection("dao_metadata").countDocuments(),
      db.collection("proposals").countDocuments(),
      db.collection("guilds").countDocuments(),
    ]);

    const chains = getSupportedChains();

    return NextResponse.json({
      success: true,
      data: {
        totalDaos:      daoCount,
        totalProposals: proposalCount,
        totalGuilds:    guildCount,
        supportedChains: chains.length,
        chains: chains.map((c) => ({ id: c.id, name: c.name })),
      },
    });
  } catch (err) {
    console.error("GET /api/stats:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch stats" }, { status: 500 });
  }
}
