import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

const chatCol = async () => (await getDb()).collection("proposal_chats");

type Params = { chainId: string; daoAddress: string; proposalId: string };

export async function GET(req: NextRequest, { params }: { params: Params }) {
  try {
    const chainId  = parseInt(params.chainId);
    const { daoAddress, proposalId } = params;
    const since    = parseInt(req.nextUrl.searchParams.get("since") ?? "0");

    const docs = await (await chatCol())
      .find({
        daoAddress: daoAddress.toLowerCase(),
        chainId,
        proposalId: Number(proposalId),
        timestamp:  { $gt: since },
      })
      .sort({ timestamp: 1 }).toArray();

    const messages = docs.map((d) => ({ ...d, id: d._id.toString() }));
    return NextResponse.json({ success: true, data: messages, count: messages.length });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
