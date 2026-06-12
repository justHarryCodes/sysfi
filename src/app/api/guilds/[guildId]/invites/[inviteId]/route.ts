export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { verifyFirebaseToken, unauthorized, ok, serverError } from "@/lib/firebase-auth";
import { deactivateInvite } from "@/lib/guild-service";

export async function DELETE(req: NextRequest, { params }: { params: { guildId: string; inviteId: string } }) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    const deactivated = await deactivateInvite(params.inviteId, auth.uid);
    if (!deactivated) return Response.json({ success: false, error: "Not authorized or invite not found" }, { status: 403 });
    return ok({ deactivated: true });
  } catch (err) {
    return serverError(String(err));
  }
}
