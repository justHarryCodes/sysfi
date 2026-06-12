import { NextRequest, NextResponse } from "next/server";
import { getDAOByAddress } from "@/lib/blockchain-dao";
import { getDAOMetadata } from "@/lib/mongo-dao";

export async function GET(
  _req: NextRequest,
  { params }: { params: { chainId: string; daoAddress: string } },
) {
  try {
    const chainId = parseInt(params.chainId);
    const daoAddress = params.daoAddress.toLowerCase();

    if (isNaN(chainId)) {
      return NextResponse.json({ success: false, error: "Invalid chainId" }, { status: 400 });
    }
    if (!/^0x[0-9a-fA-F]{40}$/.test(daoAddress)) {
      return NextResponse.json({ success: false, error: "Invalid address" }, { status: 400 });
    }

    const [dao, meta] = await Promise.all([
      getDAOByAddress(chainId, daoAddress),
      getDAOMetadata(daoAddress, chainId),
    ]);

    if (!dao) {
      return NextResponse.json({ success: false, error: "DAO not found" }, { status: 404 });
    }

    const merged = {
      ...dao,
      offChain: meta
        ? {
            description: meta.description ?? "",
            website: meta.website ?? null,
            twitter: meta.twitter ?? null,
            discord: meta.discord ?? null,
            telegram: meta.telegram ?? null,
            creator: meta.creator ?? null,
            txHash: meta.txHash ?? null,
          }
        : null,
    };

    return NextResponse.json({ success: true, data: merged });
  } catch (err) {
    console.error("GET /api/daos/[chainId]/[daoAddress]:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch DAO" }, { status: 500 });
  }
}
