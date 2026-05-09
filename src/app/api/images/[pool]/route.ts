/**
 * GET /api/images/:pool?chainId=84532&type=logo
 * GET /api/images/:pool?chainId=84532&type=banner
 *
 * Streams the stored base64 JPEG back as binary with:
 *   Content-Type: image/jpeg
 *   Cache-Control: public, max-age=86400 (1 day browser cache)
 *
 * Returns 404 with a 1×1 transparent GIF if no image is stored.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb, METADATA_COL }       from "@/lib/mongodb";

// 1×1 transparent GIF — used as placeholder when no image exists
const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(req: NextRequest, { params }: { params: { pool: string } }) {
  try {
    const sp      = new URL(req.url).searchParams;
    const chainId = Number(sp.get("chainId") ?? 0);
    const type    = sp.get("type") === "banner" ? "bannerData" : "logoData";
    const pool    = params.pool.toLowerCase();

    const db  = await getDb();
    const col = db.collection(METADATA_COL);

    const filter = chainId ? { poolAddress: pool, chainId } : { poolAddress: pool };
    const doc    = await col.findOne(filter, { projection: { [type]: 1 } });

    const dataUrl = doc?.[type] as string | undefined;

    if (!dataUrl || !dataUrl.startsWith("data:")) {
      return new NextResponse(TRANSPARENT_GIF, {
        headers: {
          "Content-Type":  "image/gif",
          "Cache-Control": "public, max-age=60",
        },
      });
    }

    // Strip "data:image/jpeg;base64," prefix
    const commaIdx  = dataUrl.indexOf(",");
    const base64Str = dataUrl.slice(commaIdx + 1);
    const imageBuffer = Buffer.from(base64Str, "base64");

    // Detect content type from the data URL header
    const headerPart  = dataUrl.slice(5, commaIdx);        // "image/jpeg;base64"
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
