import { NextRequest, NextResponse } from "next/server";
import { getProposal } from "@/lib/mongo-dao";

export async function GET(
  _req: NextRequest,
  { params }: { params: { chainId: string; daoAddress: string; proposalId: string } },
) {
  try {
    const chainId = parseInt(params.chainId);
    const daoAddress = params.daoAddress.toLowerCase();
    const proposalId = parseInt(params.proposalId);

    const proposal = await getProposal(daoAddress, proposalId, chainId);
    if (!proposal) {
      return NextResponse.json({ success: false, error: "Proposal not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: proposal });
  } catch (err) {
    console.error("GET /api/proposals/[id]:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch proposal" }, { status: 500 });
  }
}
