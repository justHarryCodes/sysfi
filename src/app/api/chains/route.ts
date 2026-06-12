export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { getSupportedChains } from "@/lib/blockchain-dao";

export async function GET() {
  const chains = getSupportedChains();
  return NextResponse.json({ success: true, count: chains.length, data: chains });
}
