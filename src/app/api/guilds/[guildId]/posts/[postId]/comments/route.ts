export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { verifyFirebaseToken, unauthorized, badRequest, ok, serverError } from "@/lib/firebase-auth";
import { addComment, getComments } from "@/lib/guild-mongo";

type P = { params: { guildId: string; postId: string } };

export async function GET(req: NextRequest, { params }: P) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "30"), 100);
    const skip  = parseInt(req.nextUrl.searchParams.get("skip") ?? "0");
    return ok(await getComments(params.postId, { limit, skip }));
  } catch (err) {
    return serverError(String(err));
  }
}

export async function POST(req: NextRequest, { params }: P) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    const { text, username, userAvatar } = await req.json();
    if (!text?.trim()) return badRequest("Comment text is required");
    const comment = await addComment(params.postId, params.guildId, { userId: auth.uid, username, userAvatar, text });
    return ok(comment);
  } catch (err) {
    return serverError(String(err));
  }
}
