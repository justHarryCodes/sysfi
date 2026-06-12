import { NextRequest } from "next/server";
import { verifyFirebaseToken, unauthorized, ok, serverError } from "@/lib/firebase-auth";
import { getExternalLinks, updateExternalLinks, getGuildById } from "@/lib/guild-service";

type P = { params: { guildId: string } };

export async function GET(req: NextRequest, { params }: P) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    return ok(await getExternalLinks(params.guildId));
  } catch (err) {
    return serverError(String(err));
  }
}

export async function PUT(req: NextRequest, { params }: P) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    const guild = await getGuildById(params.guildId);
    if (guild?.createdBy !== auth.uid) {
      return Response.json({ success: false, error: "Only the guild owner can update links" }, { status: 403 });
    }
    return ok(await updateExternalLinks(params.guildId, auth.uid, await req.json()));
  } catch (err) {
    return serverError(String(err));
  }
}
