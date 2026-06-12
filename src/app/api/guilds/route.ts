export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { verifyFirebaseToken, unauthorized, badRequest, ok, serverError } from "@/lib/firebase-auth";
import * as guildService from "@/lib/guild-service";

export async function GET(req: NextRequest) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    return ok(await guildService.getUserGuilds(auth.uid));
  } catch (err) {
    console.error("GET /api/guilds:", err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    const { name, description, genre, privacy, logoUrl, bannerUrl, tokenGating } = await req.json();
    if (!name?.trim()) return badRequest("Guild name is required");
    const guild = await guildService.createGuild({
      name: name.trim(), description, genre, privacy: privacy || "public",
      logoUrl, bannerUrl, createdBy: auth.uid, tokenGating,
    });
    return ok(guild);
  } catch (err) {
    console.error("POST /api/guilds:", err);
    return serverError();
  }
}
