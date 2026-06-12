import { NextRequest } from "next/server";
import { verifyFirebaseToken, unauthorized, badRequest, ok, serverError } from "@/lib/firebase-auth";
import { linkDao, unlinkDao } from "@/lib/guild-service";

type P = { params: { guildId: string } };

export async function POST(req: NextRequest, { params }: P) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    const { daoAddress, chainId } = await req.json();
    if (!daoAddress || !chainId) return badRequest("daoAddress and chainId are required");
    const updated = await linkDao(params.guildId, auth.uid, daoAddress, Number(chainId));
    if (!updated) return Response.json({ success: false, error: "Not authorized or guild not found" }, { status: 403 });
    return ok(updated);
  } catch (err) {
    return serverError(String(err));
  }
}

export async function DELETE(req: NextRequest, { params }: P) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    const updated = await unlinkDao(params.guildId, auth.uid);
    if (!updated) return Response.json({ success: false, error: "Not authorized or guild not found" }, { status: 403 });
    return ok(updated);
  } catch (err) {
    return serverError(String(err));
  }
}
