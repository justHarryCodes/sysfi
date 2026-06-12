export const dynamic = 'force-dynamic';

/**
 * GET /api/images/:pool?chainId=84532&type=logo
 * GET /api/images/:pool?chainId=84532&type=banner
 *
 * Prefers Cloudinary URL redirect (new).
 * Falls back to serving stored base64 JPEG (legacy).
 * Returns 404 with a 1×1 transparent GIF if no image is stored.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb, METADATA_COL }       from "@/lib/mongodb";

const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

export async function GET(req: NextRequest, { params }: { params: { pool: string } }) {
  try {
    const sp      = new URL(req.url).searchParams;
    const chainId = Number(sp.get("chainId") ?? 0);
    const isBanner = sp.get("type") === "banner";
    const pool    = params.pool.toLowerCase();

    const urlField  = isBanner ? "bannerUrl"  : "logoUrl";
    const dataField = isBanner ? "bannerData" : "logoData";

    const db  = await getDb();
    const col = db.collection(METADATA_COL);

    const filter = chainId ? { poolAddress: pool, chainId } : { poolAddress: pool };
    const doc    = await col.findOne(filter, {
      projection: { [urlField]: 1, [dataField]: 1 },
    });

    // Prefer Cloudinary URL — redirect the browser directly to the CDN
    const cdnUrl = doc?.[urlField] as string | undefined;
    if (cdnUrl && cdnUrl.startsWith("https://")) {
      return NextResponse.redirect(cdnUrl, { status: 302 });
    }

    // Fall back to legacy base64 data URL
    const dataUrl = doc?.[dataField] as string | undefined;
    if (!dataUrl || !dataUrl.startsWith("data:")) {
      return new NextResponse(TRANSPARENT_GIF, {
        headers: { "Content-Type": "image/gif", "Cache-Control": "public, max-age=60" },
      });
    }

    const commaIdx    = dataUrl.indexOf(",");
    const base64Str   = dataUrl.slice(commaIdx + 1);
    const imageBuffer = Buffer.from(base64Str, "base64");
    const headerPart  = dataUrl.slice(5, commaIdx);
    const contentType = headerPart.split(";")[0] || "image/jpeg";

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type":   contentType,
        "Cache-Control":  "public, max-age=86400, stale-while-revalidate=3600",
        "Content-Length": String(imageBuffer.byteLength),
      },
    });
  } catch (err) {
    console.error("[GET /api/images/:pool]", err);
    return new NextResponse(TRANSPARENT_GIF, {
      headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" },
    });
  }
}
