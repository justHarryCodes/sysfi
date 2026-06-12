import { NextRequest } from "next/server";
import { verifyFirebaseToken, unauthorized, ok, serverError } from "@/lib/firebase-auth";
import { toggleLike } from "@/lib/guild-mongo";

export async function POST(req: NextRequest, { params }: { params: { guildId: string; postId: string } }) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    const { username } = await req.json();
    return ok(await toggleLike(params.postId, params.guildId, auth.uid, username));
  } catch (err) {
    return serverError(String(err));
  }
}
