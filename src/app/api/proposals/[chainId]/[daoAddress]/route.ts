export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import {
  getProposalsByDAO,
  upsertProposal,
  recordActivity,
} from "@/lib/mongo-dao";

export async function GET(
  req: NextRequest,
  { params }: { params: { chainId: string; daoAddress: string } },
) {
  try {
    const chainId = parseInt(params.chainId);
    const daoAddress = params.daoAddress.toLowerCase();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const skip = parseInt(searchParams.get("skip") ?? "0");

    const proposals = await getProposalsByDAO(daoAddress, chainId, {
      status,
      limit,
      skip,
    });

    return NextResponse.json({
      success: true,
      count: proposals.length,
      data: proposals,
    });
  } catch (err) {
    console.error("GET /api/proposals:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch proposals" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { chainId: string; daoAddress: string } },
) {
  try {
    const chainId = parseInt(params.chainId);
    const daoAddress = params.daoAddress.toLowerCase();
    const body = await req.json();

    const {
      proposalId, title, description, type,
      proposer, targetAddress, amount, callData,
      startTime, endTime, txHash,
    } = body;

    if (proposalId === undefined) {
      return NextResponse.json({ success: false, error: "proposalId is required" }, { status: 400 });
    }

    const proposal = await upsertProposal({
      proposalId: parseInt(proposalId),
      daoAddress,
      chainId,
      title,
      description,
      type: type ?? "generic",
      status: "active",
      proposer,
      targetAddress,
      amount,
      callData,
      startTime: parseInt(startTime),
      endTime: parseInt(endTime),
      txHash,
    });

    await recordActivity({
      daoAddress,
      chainId,
      type: "proposal_created",
      userAddress: proposer,
      proposalId: parseInt(proposalId),
      payload: { title, txHash },
    });

    return NextResponse.json({ success: true, data: proposal }, { status: 201 });
  } catch (err) {
    console.error("POST /api/proposals:", err);
    return NextResponse.json({ success: false, error: "Failed to create proposal" }, { status: 500 });
  }
}
