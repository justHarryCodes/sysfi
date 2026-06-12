export const dynamic = 'force-dynamic';

/**
 * GET    /api/metadata/:pool?chainId=84532  → full record (no image data in default response)
 * GET    /api/metadata/:pool?chainId=84532&withImages=1  → include base64 image data
 * PUT    /api/metadata/:pool   body: { chainId, ...fields }  → partial update
 * DELETE /api/metadata/:pool?chainId=84532  → remove
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb, METADATA_COL }       from "@/lib/mongodb";

export async function GET(req: NextRequest, { params }: { params: { pool: string } }) {
  try {
    const sp          = new URL(req.url).searchParams;
    const chainId     = Number(sp.get("chainId") ?? 0);
    const withImages  = sp.get("withImages") === "1";
    const pool        = params.pool.toLowerCase();

    const db  = await getDb();
    const col = db.collection(METADATA_COL);

    const proj = withImages
      ? { _id: 0 }
      : { _id: 0, logoData: 0, bannerData: 0 };

    const filter = chainId ? { poolAddress: pool, chainId } : { poolAddress: pool };
    const doc    = await col.findOne(filter, { projection: proj });

    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!withImages) {
      // Peek at first few chars to determine if images exist
      const peek = await col.findOne(filter, {
        projection: { logoData: { $substr: ["$logoData", 0, 4] }, bannerData: { $substr: ["$bannerData", 0, 4] } },
      });
      return NextResponse.json({
        data: { ...doc, hasLogo: !!(peek?.logoData), hasBanner: !!(peek?.bannerData) },
      });
    }

    return NextResponse.json({ data: doc });
  } catch (err) {
    console.error("[GET /api/metadata/:pool]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { pool: string } }) {
  try {
    const body    = await req.json();
    const chainId = Number(body.chainId ?? 0);
    const pool    = params.pool.toLowerCase();

    if (!chainId) return NextResponse.json({ error: "chainId required" }, { status: 400 });

    const EDITABLE = ["description","logoData","bannerData","website","twitter","telegram","discord","name","symbol"] as const;
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    for (const key of EDITABLE) {
      if (key in body) {
        const maxLen = key === "description" ? 500 : key.endsWith("Data") ? 500_000 : 200;
        updates[key] = String(body[key]).slice(0, maxLen);
      }
    }

    const db  = await getDb();
    const col = db.collection(METADATA_COL);
    const res = await col.updateOne({ poolAddress: pool, chainId }, { $set: updates });

    if (res.matchedCount === 0)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PUT /api/metadata/:pool]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { pool: string } }) {
  try {
    const sp      = new URL(req.url).searchParams;
    const chainId = Number(sp.get("chainId") ?? 0);
    const pool    = params.pool.toLowerCase();

    const db  = await getDb();
    await db.collection(METADATA_COL).deleteOne({ poolAddress: pool, chainId });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/metadata/:pool]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
