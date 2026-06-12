import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

const chatCol = async () => (await getDb()).collection("proposal_chats");

async function verifySig(message: string, signature: string, expectedAddress: string): Promise<boolean> {
  try {
    return await verifyMessage({
      address: expectedAddress as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
  } catch { return false; }
}

type Params = { chainId: string; daoAddress: string; proposalId: string; messageId: string };

export async function PUT(req: NextRequest, { params }: { params: Params }) {
  try {
    const { messageId } = params;
    const { sender, authSignature, authMessage, newText } = await req.json();

    if (!sender || !newText?.trim()) {
      return NextResponse.json({ success: false, error: "sender and newText are required" }, { status: 400 });
    }
    if (!authSignature || !authMessage) {
      return NextResponse.json({ success: false, error: "authSignature and authMessage are required" }, { status: 401 });
    }
    if (!await verifySig(authMessage, authSignature, sender)) {
      return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 401 });
    }

    const filter = { _id: new ObjectId(messageId), sender: sender.toLowerCase(), isDeleted: false };
    const doc    = await (await chatCol()).findOne(filter);
    if (!doc) return NextResponse.json({ success: false, error: "Message not found or not authorized" }, { status: 403 });
    if (Date.now() - doc.timestamp > 5 * 60 * 1000) {
      return NextResponse.json({ success: false, error: "Edit window expired (5 min)" }, { status: 403 });
    }

    await (await chatCol()).updateOne(filter, {
      $set: { message: newText.trim(), isEdited: true, editedAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  try {
    const { messageId } = params;
    const { sender, authSignature, authMessage } = await req.json();

    if (!sender) return NextResponse.json({ success: false, error: "sender is required" }, { status: 400 });
    if (!authSignature || !authMessage) {
      return NextResponse.json({ success: false, error: "authSignature and authMessage are required" }, { status: 401 });
    }
    if (!await verifySig(authMessage, authSignature, sender)) {
      return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 401 });
    }

    const filter = { _id: new ObjectId(messageId), sender: sender.toLowerCase(), isDeleted: false };
    const doc    = await (await chatCol()).findOne(filter);
    if (!doc) return NextResponse.json({ success: false, error: "Message not found or not authorized" }, { status: 403 });
    if (Date.now() - doc.timestamp > 5 * 60 * 1000) {
      return NextResponse.json({ success: false, error: "Delete window expired (5 min)" }, { status: 403 });
    }

    await (await chatCol()).updateOne(filter, {
      $set: { message: "[deleted]", isDeleted: true, isEdited: true, editedAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
