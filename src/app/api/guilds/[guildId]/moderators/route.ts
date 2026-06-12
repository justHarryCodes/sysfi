export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { verifyFirebaseToken, unauthorized, badRequest, ok, serverError } from "@/lib/firebase-auth";
import { getModerators, addModerator, getGuildById } from "@/lib/guild-service";

type P = { params: { guildId: string } };

export async function GET(req: NextRequest, { params }: P) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    return ok(await getModerators(params.guildId));
  } catch (err) {
    return serverError(String(err));
  }
}

export async function POST(req: NextRequest, { params }: P) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    const { userId, username, userAvatar, roleName, permissions } = await req.json();
    if (!userId) return badRequest("userId is required");
    const guild = await getGuildById(params.guildId);
    if (guild?.createdBy !== auth.uid) {
      return Response.json({ success: false, error: "Only the guild owner can add moderators" }, { status: 403 });
    }
    const mod = await addModerator(params.guildId, userId, {
      username, userAvatar, roleName, permissions: permissions || {}, addedBy: auth.uid,
    });
    return ok(mod);
  } catch (err) {
    return serverError(String(err));
  }
}
