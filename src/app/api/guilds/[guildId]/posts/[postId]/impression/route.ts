import { NextRequest } from "next/server";
import { verifyFirebaseToken, unauthorized, serverError } from "@/lib/firebase-auth";
import { addImpression } from "@/lib/guild-mongo";

export async function POST(req: NextRequest, { params }: { params: { guildId: string; postId: string } }) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    await addImpression(params.postId, auth.uid);
    return new Response(null, { status: 204 });
  } catch (err) {
    return serverError(String(err));
  }
}
