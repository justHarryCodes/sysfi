export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { verifyFirebaseToken, unauthorized, ok, serverError } from "@/lib/firebase-auth";
import { pinMessage, unpinMessage } from "@/lib/guild-mongo";
import { getGuildById } from "@/lib/guild-service";

type P = { params: { guildId: string; messageId: string } };

export async function POST(req: NextRequest, { params }: P) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    const guild = await getGuildById(params.guildId);
    if (guild?.createdBy !== auth.uid) {
      return Response.json({ success: false, error: "Only admins can pin messages" }, { status: 403 });
    }
    await pinMessage(params.messageId, auth.uid);
    return ok({ pinned: true });
  } catch (err) {
    return serverError(String(err));
  }
}

export async function DELETE(req: NextRequest, { params }: P) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    const guild = await getGuildById(params.guildId);
    if (guild?.createdBy !== auth.uid) {
      return Response.json({ success: false, error: "Only admins can unpin messages" }, { status: 403 });
    }
    await unpinMessage(params.messageId);
    return ok({ unpinned: true });
  } catch (err) {
    return serverError(String(err));
  }
}
