export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getDAOActivity } from "@/lib/mongo-dao";

export async function GET(
  req: NextRequest,
  { params }: { params: { chainId: string; daoAddress: string } },
) {
  try {
    const chainId = parseInt(params.chainId);
    const daoAddress = params.daoAddress.toLowerCase();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") ?? "20");

    const feed = await getDAOActivity(daoAddress, chainId, limit);
    return NextResponse.json({ success: true, count: feed.length, data: feed });
  } catch (err) {
    console.error("GET /api/activity:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch activity" }, { status: 500 });
  }
}
