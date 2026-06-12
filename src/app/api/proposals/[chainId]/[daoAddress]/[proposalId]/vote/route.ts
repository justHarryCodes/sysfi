export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import {
  recordVote,
  updateProposalVotes,
  recordActivity,
  getUserVote,
} from "@/lib/mongo-dao";

const VOTE_LABELS: Record<number, string> = { 0: "for", 1: "against", 2: "abstain" };

export async function POST(
  req: NextRequest,
  { params }: { params: { chainId: string; daoAddress: string; proposalId: string } },
) {
  try {
    const chainId = parseInt(params.chainId);
    const daoAddress = params.daoAddress.toLowerCase();
    const proposalId = parseInt(params.proposalId);
    const body = await req.json();

    const { userAddress, vote, weight, txHash, votesFor, votesAgainst, votesAbstain, totalVoters } =
      body;

    if (userAddress === undefined || vote === undefined) {
      return NextResponse.json(
        { success: false, error: "userAddress and vote required" },
        { status: 400 },
      );
    }

    await recordVote({ userAddress, daoAddress, proposalId, chainId, vote, weight, txHash });

    if (votesFor !== undefined) {
      await updateProposalVotes(daoAddress, proposalId, chainId, {
        votesFor,
        votesAgainst,
        votesAbstain,
        totalVoters,
      });
    }

    await recordActivity({
      daoAddress,
      chainId,
      type: "vote_cast",
      userAddress,
      proposalId,
      payload: { vote: VOTE_LABELS[vote] ?? vote, weight, txHash },
    });

    return NextResponse.json({ success: true, message: "Vote recorded" });
  } catch (err) {
    console.error("POST /vote:", err);
    return NextResponse.json({ success: false, error: "Failed to record vote" }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { chainId: string; daoAddress: string; proposalId: string } },
) {
  try {
    const chainId = parseInt(params.chainId);
    const daoAddress = params.daoAddress.toLowerCase();
    const proposalId = parseInt(params.proposalId);
    const { searchParams } = new URL(req.url);
    const userAddress = searchParams.get("userAddress");

    if (!userAddress) {
      return NextResponse.json({ success: false, error: "userAddress is required" }, { status: 400 });
    }

    const voteRecord = await getUserVote(userAddress, daoAddress, proposalId, chainId);
    return NextResponse.json({ success: true, voted: !!voteRecord, data: voteRecord });
  } catch (err) {
    console.error("GET /vote:", err);
    return NextResponse.json({ success: false, error: "Failed to check vote" }, { status: 500 });
  }
}
