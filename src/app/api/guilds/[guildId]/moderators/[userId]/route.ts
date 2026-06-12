import { NextRequest } from "next/server";
import { verifyFirebaseToken, unauthorized, ok, serverError } from "@/lib/firebase-auth";
import { removeModerator, getGuildById } from "@/lib/guild-service";

export async function DELETE(req: NextRequest, { params }: { params: { guildId: string; userId: string } }) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    const guild = await getGuildById(params.guildId);
    if (guild?.createdBy !== auth.uid) {
      return Response.json({ success: false, error: "Only the guild owner can remove moderators" }, { status: 403 });
    }
    await removeModerator(params.guildId, params.userId);
    return ok({ removed: true });
  } catch (err) {
    return serverError(String(err));
  }
}
