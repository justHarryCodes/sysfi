export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { saveDAOMetadata } from "@/lib/mongo-dao";
import { getDAOByAddress } from "@/lib/blockchain-dao";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { daoAddress, chainId, txHash, creator, offChainData = {} } = body;

    if (!daoAddress || !chainId) {
      return NextResponse.json(
        { success: false, error: "daoAddress and chainId are required" },
        { status: 400 },
      );
    }
    if (!/^0x[0-9a-fA-F]{40}$/.test(daoAddress)) {
      return NextResponse.json(
        { success: false, error: "Invalid daoAddress format" },
        { status: 400 },
      );
    }

    const parsedChainId = parseInt(chainId);

    await saveDAOMetadata({
      daoAddress,
      chainId: parsedChainId,
      txHash: txHash ?? null,
      creator: creator ?? "",
      description: offChainData.description ?? "",
      website: offChainData.website ?? null,
      twitter: offChainData.twitter ?? null,
      discord: offChainData.discord ?? null,
      telegram: offChainData.telegram ?? null,
      extra: {},
    });

    let dao = null;
    try {
      dao = await getDAOByAddress(parsedChainId, daoAddress);
    } catch (blockchainErr) {
      console.warn(`register: could not index ${daoAddress} — ${blockchainErr}`);
    }

    return NextResponse.json({ success: true, data: dao }, { status: 201 });
  } catch (err) {
    console.error("POST /api/daos/register:", err);
    return NextResponse.json({ success: false, error: "Registration failed" }, { status: 500 });
  }
}
