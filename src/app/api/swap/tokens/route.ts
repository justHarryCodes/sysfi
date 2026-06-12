import { NextRequest, NextResponse } from "next/server";
import { getTokenList } from "@/lib/tokenLists";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chainId = parseInt(searchParams.get("chainId") ?? "8453");
    const search = searchParams.get("search") ?? undefined;

    const tokens = getTokenList(chainId, search);
    return NextResponse.json({ success: true, data: { tokens, chainId } });
  } catch (err) {
    console.error("GET /api/swap/tokens:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch tokens" }, { status: 500 });
  }
}
