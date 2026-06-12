import { NextRequest } from "next/server";
import { verifyFirebaseToken, unauthorized, ok, serverError } from "@/lib/firebase-auth";
import { getActivityFeed } from "@/lib/feed-service";
import { getUserReaction } from "@/lib/guild-mongo";

export async function GET(req: NextRequest) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();

  try {
    const page  = Math.max(parseInt(req.nextUrl.searchParams.get("page")  ?? "1"), 1);
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "20"), 50);

    const posts = await getActivityFeed(auth.uid, { page, limit });
    const enriched = await Promise.all(
      posts.map(async (post) => ({ ...post, myReaction: await getUserReaction(post.id as string, auth.uid) })),
    );
    return ok(enriched, { page, limit });
  } catch (err) {
    console.error("GET /api/feed:", err);
    return serverError();
  }
}
