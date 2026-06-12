export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { verifyFirebaseToken, unauthorized, ok, serverError } from "@/lib/firebase-auth";
import { repostPost } from "@/lib/guild-mongo";
import { refreshPostScore } from "@/lib/feed-service";

export async function POST(req: NextRequest, { params }: { params: { guildId: string; postId: string } }) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    const { username, userAvatar, comment, targetGuildId } = await req.json();
    const destGuildId = targetGuildId || params.guildId;
    const repost = await repostPost(params.postId, params.guildId, {
      userId: auth.uid, username, userAvatar, guildId: destGuildId, comment,
    });
    refreshPostScore(params.postId).catch(() => {});
    return ok(repost);
  } catch (err) {
    const msg = String(err);
    return Response.json({ success: false, error: msg }, { status: msg.includes("already reposted") ? 409 : 500 });
  }
}
