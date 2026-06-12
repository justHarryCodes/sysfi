export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { verifyFirebaseToken, ok, serverError } from "@/lib/firebase-auth";
import * as guildService from "@/lib/guild-service";

type P = { params: { guildId: string } };

export async function GET(req: NextRequest, { params }: P) {
  try {
    const guild = await guildService.getGuildById(params.guildId);
    if (!guild) return Response.json({ success: false, error: "Guild not found" }, { status: 404 });
    return ok(guild);
  } catch (err) {
    console.error("GET /api/guilds/[guildId]:", err);
    return serverError();
  }
}

export async function PUT(req: NextRequest, { params }: P) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  try {
    const body    = await req.json();
    const updated = await guildService.updateGuild(params.guildId, auth.uid, body);
    if (!updated) return Response.json({ success: false, error: "Not authorized or guild not found" }, { status: 403 });
    return ok(updated);
  } catch (err) {
    return serverError(String(err));
  }
}

export async function DELETE(req: NextRequest, { params }: P) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  try {
    const deleted = await guildService.deleteGuild(params.guildId, auth.uid);
    if (!deleted) return Response.json({ success: false, error: "Not authorized or guild not found" }, { status: 403 });
    return ok({ deleted: true });
  } catch (err) {
    return serverError(String(err));
  }
}
