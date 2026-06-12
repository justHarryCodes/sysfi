import { NextRequest } from "next/server";
import { verifyFirebaseToken, unauthorized, badRequest, ok, serverError } from "@/lib/firebase-auth";
import { deleteAllUserMessages } from "@/lib/guild-mongo";
import { getGuildById } from "@/lib/guild-service";

export async function POST(req: NextRequest, { params }: { params: { guildId: string } }) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    const { guildId }   = params;
    const { userId: targetUserId } = await req.json();
    if (!targetUserId) return badRequest("userId is required");

    const guild = await getGuildById(guildId);
    if (guild?.createdBy !== auth.uid) {
      return Response.json({ success: false, error: "Only admins can bulk-delete messages" }, { status: 403 });
    }

    const count = await deleteAllUserMessages(guildId, targetUserId);
    return ok({ deleted: count });
  } catch (err) {
    return serverError(String(err));
  }
}
