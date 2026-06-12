import { NextRequest } from "next/server";
import { verifyFirebaseToken, unauthorized, ok, serverError } from "@/lib/firebase-auth";
import { getGuildById, getModerators, banUser } from "@/lib/guild-service";
import { deleteAllUserMessages } from "@/lib/guild-mongo";

export async function POST(req: NextRequest, { params }: { params: { guildId: string; userId: string } }) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    const { guildId, userId } = params;
    const { username } = await req.json();

    const guild = await getGuildById(guildId);
    if (!guild) return Response.json({ success: false, error: "Guild not found" }, { status: 404 });

    if (guild.createdBy !== auth.uid) {
      const mods  = await getModerators(guildId);
      const myMod = mods.find((m: Record<string, unknown>) => m.user_id === auth.uid || m.userId === auth.uid);
      if (!(myMod as { permissions?: { canBanMembers?: boolean } })?.permissions?.canBanMembers) {
        return Response.json({ success: false, error: "Not authorized to ban" }, { status: 403 });
      }
    }

    await banUser(guildId, userId, username, auth.uid);
    await deleteAllUserMessages(guildId, userId);
    return ok({ banned: true });
  } catch (err) {
    return serverError(String(err));
  }
}
