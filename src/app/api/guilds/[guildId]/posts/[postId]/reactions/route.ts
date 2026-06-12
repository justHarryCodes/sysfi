export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { verifyFirebaseToken, unauthorized, ok, serverError } from "@/lib/firebase-auth";
import { getReactionSummary, getUserReaction } from "@/lib/guild-mongo";

export async function GET(req: NextRequest, { params }: { params: { guildId: string; postId: string } }) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    const [summary, myReaction] = await Promise.all([
      getReactionSummary(params.postId),
      getUserReaction(params.postId, auth.uid),
    ]);
    return ok({ ...summary, myReaction });
  } catch (err) {
    return serverError(String(err));
  }
}
