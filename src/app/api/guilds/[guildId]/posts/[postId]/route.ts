import { NextRequest } from "next/server";
import { verifyFirebaseToken, unauthorized, ok, serverError } from "@/lib/firebase-auth";
import { getPostById, deletePost, getUserReaction } from "@/lib/guild-mongo";
import { getGuildById } from "@/lib/guild-service";

type P = { params: { guildId: string; postId: string } };

export async function GET(req: NextRequest, { params }: P) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    const post = await getPostById(params.postId);
    if (!post) return Response.json({ success: false, error: "Post not found" }, { status: 404 });
    const myReaction = await getUserReaction(post.id, auth.uid);
    return ok({ ...post, myReaction });
  } catch (err) {
    return serverError(String(err));
  }
}

export async function DELETE(req: NextRequest, { params }: P) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    const guild   = await getGuildById(params.guildId);
    const isAdmin = guild?.createdBy === auth.uid;
    await deletePost(params.postId, auth.uid, isAdmin);
    return ok({ deleted: true });
  } catch (err) {
    const msg = String(err);
    return Response.json({ success: false, error: msg }, { status: msg.includes("only delete") ? 403 : 500 });
  }
}
