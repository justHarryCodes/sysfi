export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { verifyFirebaseToken, unauthorized, badRequest, ok, serverError } from "@/lib/firebase-auth";
import { createPost, getPosts, isPostLiked, getUserReaction } from "@/lib/guild-mongo";

type P = { params: { guildId: string } };

export async function GET(req: NextRequest, { params }: P) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    const limit  = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "10"), 50);
    const before = req.nextUrl.searchParams.get("before");
    const posts  = await getPosts(params.guildId, { limit, before });
    const enriched = await Promise.all(posts.map(async (p) => ({
      ...p,
      isLiked:    await isPostLiked(p.id, auth.uid),
      myReaction: await getUserReaction(p.id, auth.uid),
    })));
    return ok(enriched);
  } catch (err) {
    return serverError(String(err));
  }
}

export async function POST(req: NextRequest, { params }: P) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    const { description, imageUrl, username, userAvatar } = await req.json();
    if (!description?.trim()) return badRequest("Post description is required");
    const post = await createPost(params.guildId, { userId: auth.uid, username, userAvatar, description, imageUrl });
    return ok(post);
  } catch (err) {
    return serverError(String(err));
  }
}
