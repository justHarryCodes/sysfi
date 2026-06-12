import { NextRequest } from "next/server";
import { verifyFirebaseToken, unauthorized, ok, serverError } from "@/lib/firebase-auth";
import { pollActivityFeed } from "@/lib/feed-service";
import { getUserReaction } from "@/lib/guild-mongo";

export async function GET(req: NextRequest) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();

  try {
    const since = parseInt(req.nextUrl.searchParams.get("since") ?? "0");
    const posts = await pollActivityFeed(auth.uid, since);
    const enriched = await Promise.all(
      posts.map(async (post) => ({ ...post, myReaction: await getUserReaction(post.id as string, auth.uid) })),
    );
    return ok(enriched);
  } catch (err) {
    console.error("GET /api/feed/poll:", err);
    return serverError();
  }
}
