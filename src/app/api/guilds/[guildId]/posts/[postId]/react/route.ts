import { NextRequest } from "next/server";
import { verifyFirebaseToken, unauthorized, badRequest, ok, serverError } from "@/lib/firebase-auth";
import { upsertReaction, getReactionSummary } from "@/lib/guild-mongo";
import { refreshPostScore } from "@/lib/feed-service";

export async function POST(req: NextRequest, { params }: { params: { guildId: string; postId: string } }) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    const { reactionType } = await req.json();
    if (!reactionType) return badRequest("reactionType is required");
    const result  = await upsertReaction(params.postId, params.guildId, auth.uid, reactionType);
    refreshPostScore(params.postId).catch(() => {});
    const summary = await getReactionSummary(params.postId);
    return ok({ activeReaction: result, ...summary });
  } catch (err) {
    const msg = String(err);
    return Response.json({ success: false, error: msg }, { status: msg.includes("Invalid") ? 400 : 500 });
  }
}
