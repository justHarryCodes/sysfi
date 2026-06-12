/**
 * GET /api/metadata/bulk?pools=0xabc,0xdef&chainId=84532
 * Returns metadata for multiple pool addresses in a single MongoDB query.
 * Replaces N individual /api/metadata/[pool] calls from useBulkMetadata.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb, METADATA_COL }       from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    const sp      = new URL(req.url).searchParams;
    const chainId = Number(sp.get("chainId") ?? 0);
    const raw     = sp.get("pools") ?? "";

    const pools = raw
      .split(",")
      .map(p => p.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 100); // hard cap — prevent abuse

    if (!pools.length) {
      return NextResponse.json({ data: {} });
    }

    const db    = await getDb();
    const col   = db.collection(METADATA_COL);
    const filter = {
      poolAddress: { $in: pools },
      ...(chainId ? { chainId } : {}),
    };

    const docs = await col.aggregate([
      { $match: filter },
      { $addFields: {
          hasLogo:   { $or: [{ $gt: [{ $strLenBytes: { $ifNull: ["$logoUrl",   ""] } }, 0] },
                              { $gt: [{ $strLenBytes: { $ifNull: ["$logoData",  ""] } }, 0] }] },
          hasBanner: { $or: [{ $gt: [{ $strLenBytes: { $ifNull: ["$bannerUrl",  ""] } }, 0] },
                              { $gt: [{ $strLenBytes: { $ifNull: ["$bannerData",""] } }, 0] }] },
      } },
      { $project: { _id: 0, logoData: 0, bannerData: 0 } },
    ]).toArray();

    // Return as a map keyed by lowercase poolAddress for O(1) lookup on the client
    const data: Record<string, unknown> = {};
    for (const doc of docs) {
      data[(doc.poolAddress as string).toLowerCase()] = doc;
    }

    return NextResponse.json({ data }, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" },
    });
  } catch (err) {
    console.error("[GET /api/metadata/bulk]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
