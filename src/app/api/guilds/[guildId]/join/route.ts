export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { verifyFirebaseToken, unauthorized, ok, serverError } from "@/lib/firebase-auth";
import { getGuildById, getMembership, joinGuild } from "@/lib/guild-service";

export async function POST(req: NextRequest, { params }: { params: { guildId: string } }) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    const { guildId } = params;
    const { username, displayName, userAvatar, walletAddress, inviteId } = await req.json();

    const guild = await getGuildById(guildId);
    if (!guild) return Response.json({ success: false, error: "Guild not found" }, { status: 404 });

    const existing = await getMembership(guildId, auth.uid);
    if (existing) return ok(existing, { alreadyMember: true });

    const member = await joinGuild(guildId, auth.uid, { username, displayName, userAvatar, walletAddress }, inviteId);
    return ok(member);
  } catch (err) {
    const msg = String(err);
    return Response.json({ success: false, error: msg }, { status: msg.includes("banned") ? 403 : 500 });
  }
}
