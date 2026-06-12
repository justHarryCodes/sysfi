import { NextRequest } from "next/server";
import { verifyFirebaseToken, unauthorized, ok, serverError } from "@/lib/firebase-auth";
import { updateModeratorPermissions, getGuildById } from "@/lib/guild-service";

export async function PUT(req: NextRequest, { params }: { params: { guildId: string; userId: string } }) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    const guild = await getGuildById(params.guildId);
    if (guild?.createdBy !== auth.uid) {
      return Response.json({ success: false, error: "Only the guild owner can update permissions" }, { status: 403 });
    }
    const { permissions } = await req.json();
    const mod = await updateModeratorPermissions(params.guildId, params.userId, permissions);
    return ok(mod);
  } catch (err) {
    return serverError(String(err));
  }
}
