export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { fetchDAOsFromChain } from "@/lib/blockchain-dao";

type P = { params: { chainId: string; genreId: string } };

export async function GET(req: NextRequest, { params }: P) {
  try {
    const chainId  = parseInt(params.chainId);
    const genreId  = parseInt(params.genreId);
    const offset   = parseInt(req.nextUrl.searchParams.get("offset") ?? "0");
    const limit    = parseInt(req.nextUrl.searchParams.get("limit")  ?? "50");

    const all  = await fetchDAOsFromChain(chainId, offset, limit + offset);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filtered = all.filter((dao: any) => dao.genre === genreId || dao.genreId === genreId);

    return NextResponse.json({ success: true, data: filtered, count: filtered.length });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
