/**
 * GET  /api/metadata?chainId=84532&page=0&limit=20
 *   → paginated list (images stripped for speed — use /api/images/:pool for images)
 *
 * POST /api/metadata
 *   body: { poolAddress, chainId, tokenAddress, creatorAddress,
 *            name, symbol, description,
 *            logoUrl, bannerUrl,            ← Cloudinary CDN URLs (preferred)
 *            logoData, bannerData,          ← base64 JPEG data URLs (legacy)
 *            website, twitter, telegram, discord }
 *   → upsert
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb, METADATA_COL }       from "@/lib/mongodb";

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Strip the heavy image fields before returning a list — saves bandwidth. */
function withoutImages(doc: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { logoData, bannerData, _id, ...rest } = doc;
  // Keep hasLogo / hasBanner flags so the UI knows whether to try /api/images
  return {
    ...rest,
    hasLogo:   !!(logoData   && String(logoData)  .length > 0),
    hasBanner: !!(bannerData && String(bannerData) .length > 0),
  };
}

/** Enforce per-field max sizes (guards against oversized payloads). */
const MAX_IMAGE_BYTES = 350_000;   // ~350 KB for base64 string — safe for MongoDB

function trimStr(v: unknown, max: number): string {
  return String(v ?? "").slice(0, max);
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const sp      = new URL(req.url).searchParams;
    const chainId = Number(sp.get("chainId") ?? 0);
    const page    = Math.max(0, Number(sp.get("page")  ?? 0));
    const limit   = Math.min(100, Math.max(1, Number(sp.get("limit") ?? 20)));

    const db  = await getDb();
    const col = db.collection(METADATA_COL);

    const filter = chainId ? { chainId } : {};
    const [rawDocs, total] = await Promise.all([
      col.find(filter, { projection: { logoData: 0, bannerData: 0 } })
         .sort({ createdAt: -1 })
         .skip(page * limit)
         .limit(limit)
         .toArray(),
      col.countDocuments(filter),
    ]);

    // Re-add hasLogo/hasBanner flags via a second lightweight query
    const pools = rawDocs.map(d => d.poolAddress as string);
    const imageFlagDocs = await col.find(
      { poolAddress: { $in: pools }, ...(chainId ? { chainId } : {}) },
      { projection: { poolAddress: 1, chainId: 1,
        logoData:  { $substr: ["$logoData",  0, 5] },
        bannerData:{ $substr: ["$bannerData",0, 5] },
        logoUrl:   { $substr: ["$logoUrl",   0, 5] },
        bannerUrl: { $substr: ["$bannerUrl", 0, 5] },
      } }
    ).toArray();

    const flagMap = new Map(
      imageFlagDocs.map(d => [
        `${d.poolAddress}:${d.chainId}`,
        { hasLogo: !!d.logoData || !!d.logoUrl, hasBanner: !!d.bannerData || !!d.bannerUrl },
      ])
    );

    const docs = rawDocs.map(d => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, ...rest } = d;
      const flags = flagMap.get(`${d.poolAddress}:${d.chainId}`) ?? { hasLogo: false, hasBanner: false };
      return { ...rest, ...flags };
    });

    return NextResponse.json({ data: docs, total, page, limit });
  } catch (err) {
    console.error("[GET /api/metadata]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── POST (upsert) ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      poolAddress, chainId, tokenAddress, creatorAddress,
      name, symbol,
      description = "",
      logoUrl     = "",   // Cloudinary CDN URL (preferred)
      bannerUrl   = "",   // Cloudinary CDN URL (preferred)
      logoData    = "",   // base64 data URL (legacy fallback)
      bannerData  = "",   // base64 data URL (legacy fallback)
      website     = "",
      twitter     = "",
      telegram    = "",
      discord     = "",
    } = body;

    if (!poolAddress || !chainId || !tokenAddress) {
      return NextResponse.json(
        { error: "poolAddress, chainId, tokenAddress are required" },
        { status: 400 }
      );
    }

    // Guard image size
    if (String(logoData).length   > MAX_IMAGE_BYTES * 1.4)
      return NextResponse.json({ error: "Logo image too large (max ~350 KB compressed)" }, { status: 400 });
    if (String(bannerData).length > MAX_IMAGE_BYTES * 1.4)
      return NextResponse.json({ error: "Banner image too large (max ~350 KB compressed)" }, { status: 400 });

    const pool = (poolAddress as string).toLowerCase();
    const db   = await getDb();
    const col  = db.collection(METADATA_COL);

    // Unique index — created once and becomes a no-op on subsequent calls
    await col.createIndex(
      { poolAddress: 1, chainId: 1 },
      { unique: true, background: true }
    );

    const now = new Date();
    const doc: Record<string, unknown> = {
      poolAddress:    pool,
      chainId:        Number(chainId),
      tokenAddress:   trimStr(tokenAddress,   64),
      creatorAddress: trimStr(creatorAddress,  64),
      name:           trimStr(name,            64),
      symbol:         trimStr(symbol,          16).toUpperCase(),
      description:    trimStr(description,    500),
      logoUrl:        trimStr(logoUrl,        500),   // Cloudinary URL
      bannerUrl:      trimStr(bannerUrl,      500),   // Cloudinary URL
      logoData:       trimStr(logoData,        MAX_IMAGE_BYTES * 1.4),   // legacy
      bannerData:     trimStr(bannerData,      MAX_IMAGE_BYTES * 1.4),   // legacy
      website:        trimStr(website,        200),
      twitter:        trimStr(twitter,        200),
      telegram:       trimStr(telegram,       200),
      discord:        trimStr(discord,        200),
      updatedAt:      now,
    };

    await col.updateOne(
      { poolAddress: pool, chainId: Number(chainId) },
      { $set: doc, $setOnInsert: { createdAt: now } },
      { upsert: true }
    );

    // Return doc without the heavy image data
    const hasLogo   = !!(logoUrl   || logoData);
    const hasBanner = !!(bannerUrl || bannerData);
    return NextResponse.json({
      success: true,
      data: {
        ...doc,
        logoData:   undefined,
        bannerData: undefined,
        hasLogo,
        hasBanner,
      },
    }, { status: 201 });

  } catch (err) {
    console.error("[POST /api/metadata]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
