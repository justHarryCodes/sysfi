export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { verifyFirebaseToken, unauthorized, ok, serverError } from "@/lib/firebase-auth";
import { getInvites, createInvite, getGuildById } from "@/lib/guild-service";

type P = { params: { guildId: string } };

export async function GET(req: NextRequest, { params }: P) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    return ok(await getInvites(params.guildId));
  } catch (err) {
    return serverError(String(err));
  }
}

export async function POST(req: NextRequest, { params }: P) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    const guild = await getGuildById(params.guildId);
    if (guild?.createdBy !== auth.uid) {
      return Response.json({ success: false, error: "Only the guild owner can create invites" }, { status: 403 });
    }
    const invite = await createInvite(params.guildId, auth.uid, await req.json());
    return ok(invite);
  } catch (err) {
    return serverError(String(err));
  }
}
