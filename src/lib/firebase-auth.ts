import { NextRequest } from "next/server";
import { getAdminAuth } from "./firebase-admin";

interface AuthResult {
  uid: string;
  email: string | null;
}

const tokenCache = new Map<string, { result: AuthResult; exp: number }>();

export async function verifyFirebaseToken(req: NextRequest): Promise<AuthResult | null> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;

  const token = header.slice(7);

  const cached = tokenCache.get(token);
  if (cached && cached.exp > Date.now()) return cached.result;

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const result: AuthResult = { uid: decoded.uid, email: decoded.email ?? null };
    tokenCache.set(token, { result, exp: (decoded.exp * 1000) - 60_000 });
    return result;
  } catch {
    return null;
  }
}

export function unauthorized(message = "Unauthorized") {
  return Response.json({ success: false, error: message }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
  return Response.json({ success: false, error: message }, { status: 403 });
}

export function badRequest(message: string) {
  return Response.json({ success: false, error: message }, { status: 400 });
}

export function serverError(message = "Internal server error") {
  return Response.json({ success: false, error: message }, { status: 500 });
}

export function ok(data: unknown, extra?: Record<string, unknown>) {
  return Response.json({ success: true, data, ...extra });
}
