import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const chatCol = async () => (await getDb()).collection("proposal_chats");

async function verifySig(message: string, signature: string, expectedAddress: string): Promise<boolean> {
  try {
    const recovered = await verifyMessage({
      address: expectedAddress as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
    return recovered;
  } catch { return false; }
}

type Params = { chainId: string; daoAddress: string; proposalId: string };

export async function GET(req: NextRequest, { params }: { params: Params }) {
  try {
    const chainId    = parseInt(params.chainId);
    const { daoAddress, proposalId } = params;
    const limit      = parseInt(req.nextUrl.searchParams.get("limit") ?? "50");
    const skip       = parseInt(req.nextUrl.searchParams.get("skip")  ?? "0");

    const docs = await (await chatCol())
      .find({ daoAddress: daoAddress.toLowerCase(), chainId, proposalId: Number(proposalId) })
      .sort({ timestamp: -1 }).skip(skip).limit(limit).toArray();

    const messages = docs.reverse().map((d) => ({ ...d, id: d._id.toString() }));
    return NextResponse.json({ success: true, data: messages, count: messages.length });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const chainId    = parseInt(params.chainId);
    const { daoAddress, proposalId } = params;
    const body = await req.json();
    const { sender, senderName, senderAvatar, message, authSignature, authMessage, replyToId } = body;

    if (!sender || !message?.trim()) {
      return NextResponse.json({ success: false, error: "sender and message are required" }, { status: 400 });
    }
    if (!authSignature || !authMessage) {
      return NextResponse.json({ success: false, error: "authSignature and authMessage are required" }, { status: 401 });
    }

    const isValid = await verifySig(authMessage, authSignature, sender);
    if (!isValid) {
      return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 401 });
    }

    const doc = {
      daoAddress:   daoAddress.toLowerCase(),
      chainId,
      proposalId:   Number(proposalId),
      sender:       sender.toLowerCase(),
      senderName:   senderName   || null,
      senderAvatar: senderAvatar || null,
      message:      message.trim(),
      authSignature,
      replyToId:    replyToId || null,
      isEdited: false, editedAt: null, isDeleted: false,
      timestamp: Date.now(),
      createdAt: new Date(),
    };

    const result = await (await chatCol()).insertOne(doc);
    return NextResponse.json({ success: true, data: { id: result.insertedId.toString(), ...doc } }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
