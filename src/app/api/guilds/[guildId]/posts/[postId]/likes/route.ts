import { NextRequest } from "next/server";
import { verifyFirebaseToken, unauthorized, ok, serverError } from "@/lib/firebase-auth";
import { getPostLikes } from "@/lib/guild-mongo";

export async function GET(req: NextRequest, { params }: { params: { guildId: string; postId: string } }) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    return ok(await getPostLikes(params.postId));
  } catch (err) {
    return serverError(String(err));
  }
}
