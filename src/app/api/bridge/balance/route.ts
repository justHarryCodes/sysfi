export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { verifyFirebaseToken, unauthorized, serverError, ok } from "@/lib/firebase-auth";
import { getAdminDb } from "@/lib/firebase-admin";

const USER_CAP = 10_000;

/** Priority: networkBalance (unified, includes farmed tokens)
 *  Fallback:  balance + points  (legacy accounts created before the migration) */
function resolveEffectiveBalance(data: FirebaseFirestore.DocumentData | undefined): {
  amount: number;
  source: "networkBalance" | "combined" | "none";
} {
  if (!data) return { amount: 0, source: "none" };

  const networkBalance = Number(data.networkBalance ?? 0);
  const balance        = Number(data.balance        ?? 0);
  const points         = Number(data.points         ?? 0);

  if (networkBalance > 0) return { amount: networkBalance, source: "networkBalance" };

  const combined = balance + points;
  if (combined > 0) return { amount: combined, source: "combined" };

  return { amount: 0, source: "none" };
}

export async function GET(req: NextRequest) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();

  try {
    const snap = await getAdminDb().collection("users").doc(auth.uid).get();
    const data = snap.data();

    const { amount: effectiveAmount, source } = resolveEffectiveBalance(data);
    const totalMinted = Number(data?.totalMinted ?? 0);
    const remaining   = Math.max(0, Math.min(effectiveAmount, USER_CAP) - totalMinted);

    return ok({
      effectiveAmount,
      source,
      totalMinted,
      remaining,
      cap:           USER_CAP,
      walletAddress: (data?.walletAddress as string) || null,
    });
  } catch (err) {
    console.error("[bridge/balance]", err);
    return serverError();
  }
}
