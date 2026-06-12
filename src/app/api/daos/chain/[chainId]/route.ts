import { NextRequest, NextResponse } from "next/server";
import { fetchDAOsFromChain } from "@/lib/blockchain-dao";

export async function GET(
  req: NextRequest,
  { params }: { params: { chainId: string } },
) {
  try {
    const chainId = parseInt(params.chainId);
    if (isNaN(chainId)) {
      return NextResponse.json({ success: false, error: "Invalid chainId" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const offset = parseInt(searchParams.get("offset") ?? "0") || 0;
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "100") || 100, 500);

    const daos = await fetchDAOsFromChain(chainId, offset, limit);
    return NextResponse.json({
      success: true,
      chainId,
      count: daos.length,
      offset,
      limit,
      data: daos,
    });
  } catch (err) {
    console.error("GET /api/daos/chain/[chainId]:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch DAOs" }, { status: 500 });
  }
}
