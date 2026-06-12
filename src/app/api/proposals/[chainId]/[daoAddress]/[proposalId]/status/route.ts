import { NextRequest, NextResponse } from "next/server";
import { updateProposalStatus, recordActivity } from "@/lib/mongo-dao";

const VALID_STATUSES = ["active", "passed", "failed", "executed", "cancelled"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { chainId: string; daoAddress: string; proposalId: string } },
) {
  try {
    const chainId = parseInt(params.chainId);
    const daoAddress = params.daoAddress.toLowerCase();
    const proposalId = parseInt(params.proposalId);
    const body = await req.json();
    const { status, txHash, userAddress } = body;

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 },
      );
    }

    await updateProposalStatus(daoAddress, proposalId, chainId, status, txHash);

    await recordActivity({
      daoAddress,
      chainId,
      type: `proposal_${status}`,
      userAddress: userAddress ?? "",
      proposalId,
      payload: { txHash },
    });

    return NextResponse.json({ success: true, message: `Proposal status updated to ${status}` });
  } catch (err) {
    console.error("PATCH /status:", err);
    return NextResponse.json({ success: false, error: "Failed to update status" }, { status: 500 });
  }
}
