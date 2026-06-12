import { NextRequest } from "next/server";
import { ok, serverError } from "@/lib/firebase-auth";
import { getMembers } from "@/lib/guild-service";

export async function GET(_req: NextRequest, { params }: { params: { guildId: string } }) {
  try {
    return ok(await getMembers(params.guildId));
  } catch (err) {
    return serverError(String(err));
  }
}
