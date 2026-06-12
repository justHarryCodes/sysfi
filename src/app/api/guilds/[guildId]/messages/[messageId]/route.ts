import { NextRequest } from "next/server";
import { verifyFirebaseToken, unauthorized, badRequest, ok, serverError } from "@/lib/firebase-auth";
import { editMessage, deleteMessage } from "@/lib/guild-mongo";
import { getGuildById } from "@/lib/guild-service";

type P = { params: { guildId: string; messageId: string } };

export async function PUT(req: NextRequest, { params }: P) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    const { newText } = await req.json();
    if (!newText?.trim()) return badRequest("newText is required");
    await editMessage(params.messageId, auth.uid, newText);
    return ok({ edited: true });
  } catch (err) {
    const msg = String(err);
    return Response.json({ success: false, error: msg }, { status: msg.includes("not found") || msg.includes("only edit") ? 403 : 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: P) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    const { guildId, messageId } = params;
    const guild   = await getGuildById(guildId);
    const isAdmin = guild?.createdBy === auth.uid;
    await deleteMessage(messageId, auth.uid, isAdmin);
    return ok({ deleted: true });
  } catch (err) {
    const msg = String(err);
    return Response.json({ success: false, error: msg }, { status: msg.includes("only delete") ? 403 : 500 });
  }
}
