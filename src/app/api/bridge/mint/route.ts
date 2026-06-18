export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import {
  verifyFirebaseToken,
  unauthorized,
  badRequest,
  serverError,
  ok,
} from "@/lib/firebase-auth";
import {
  encodeAbiParameters,
  keccak256,
  getAddress,
  parseUnits,
  toBytes,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";

// ─── Config ────────────────────────────────────────────────────────────────────

const USER_CAP     = 10_000;
const TX_CAP       = 10_000;
const BASE_MAINNET = 8453;
const BASE_SEPOLIA = 84532;

const WSYN_ADDRESSES: Record<number, string> = {
  [BASE_SEPOLIA]: "0x3c181eaaB64052c726194Da6797EA06DD15e8E6B",
  [BASE_MAINNET]: "0x1d972254Eee58131704211D7b4D6d3F018EDf497",
};

// ─── Balance resolution (same logic as balance route) ─────────────────────────

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

// ─── Deduct from Firestore atomically ─────────────────────────────────────────

async function deductAndTrackMint(
  uid:    string,
  source: "networkBalance" | "combined" | "none",
  amount: number,
  data:   FirebaseFirestore.DocumentData,
) {
  const ref    = getAdminDb().collection("users").doc(uid);
  const update: Record<string, unknown> = {
    totalMinted: FieldValue.increment(amount),
  };

  if (source === "networkBalance") {
    update.networkBalance = FieldValue.increment(-amount);
  } else if (source === "combined") {
    // Deduct from balance first, then points
    const balance  = Number(data.balance ?? 0);
    const fromBal  = Math.min(balance, amount);
    const fromPts  = amount - fromBal;
    update.balance = FieldValue.increment(-fromBal);
    update.points  = FieldValue.increment(-fromPts);
  }

  await ref.update(update);
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();

  try {
    // ── Parse body ──────────────────────────────────────────────────────────
    let body: { amount?: unknown; walletAddress?: unknown; chainId?: unknown };
    try { body = await req.json(); } catch { return badRequest("Invalid JSON body"); }

    const rawAmount   = Number(body.amount);
    const walletInput = typeof body.walletAddress === "string" ? body.walletAddress.trim() : "";
    const chainId     = typeof body.chainId === "number" ? body.chainId : BASE_MAINNET;

    if (!rawAmount || rawAmount <= 0)   return badRequest("amount must be > 0");
    if (rawAmount > TX_CAP)             return badRequest(`amount cannot exceed ${TX_CAP} WSYN per transaction`);
    if (!Number.isFinite(rawAmount))    return badRequest("Invalid amount value");

    const contractAddress = WSYN_ADDRESSES[chainId];
    if (!contractAddress || contractAddress === "0x0000000000000000000000000000000000000000") {
      return badRequest(`WSYN is not deployed on chain ${chainId}`);
    }

    // ── Validate signer key ─────────────────────────────────────────────────
    const signerKey = process.env.VOUCHER_SIGNER_KEY;
    if (!signerKey) {
      console.error("[bridge/mint] VOUCHER_SIGNER_KEY not configured");
      return serverError("Signing service unavailable");
    }

    // ── Load user doc from Firestore ────────────────────────────────────────
    const snap = await getAdminDb().collection("users").doc(auth.uid).get();
    const data = snap.data();

    if (!snap.exists || !data) return badRequest("User account not found");

    const { amount: effectiveAmount, source } = resolveEffectiveBalance(data);
    const totalMinted = Number(data.totalMinted ?? 0);
    const remaining   = Math.max(0, Math.min(effectiveAmount, USER_CAP) - totalMinted);

    if (remaining === 0) return badRequest("No mintable balance remaining");
    if (rawAmount > remaining) {
      return badRequest(
        `Requested amount (${rawAmount}) exceeds remaining allowance (${remaining.toLocaleString()} WSYN)`,
      );
    }

    // ── Resolve recipient wallet ────────────────────────────────────────────
    const storedWallet = (data.walletAddress as string) || "";
    const rawRecipient = walletInput || storedWallet;
    if (!rawRecipient) return badRequest("No wallet address provided");

    let recipient: `0x${string}`;
    try { recipient = getAddress(rawRecipient) as `0x${string}`; }
    catch { return badRequest("Invalid wallet address"); }

    // ── Build and sign voucher ──────────────────────────────────────────────
    const nonce      = `0x${crypto.randomBytes(32).toString("hex")}` as `0x${string}`;
    const validFrom  = Math.floor(Date.now() / 1000);
    const validUntil = validFrom + 900; // 15-minute window
    const amount     = parseUnits(rawAmount.toString(), 18);

    const encoded = encodeAbiParameters(
      [
        { type: "uint256" }, { type: "address" }, { type: "address" },
        { type: "uint256" }, { type: "bytes32" },
        { type: "uint256" }, { type: "uint256" },
      ],
      [
        BigInt(chainId),
        contractAddress as `0x${string}`,
        recipient,
        amount,
        nonce,
        BigInt(validFrom),
        BigInt(validUntil),
      ],
    );

    const hash      = keccak256(encoded);
    const keyHex    = signerKey.startsWith("0x") ? signerKey : `0x${signerKey}`;
    const account   = privateKeyToAccount(keyHex as `0x${string}`);
    const signature = await account.signMessage({ message: { raw: toBytes(hash) } });

    // ── Deduct balance + increment totalMinted in Firestore ─────────────────
    await deductAndTrackMint(auth.uid, source, rawAmount, data);

    return ok({
      voucher: {
        recipient,
        amount:     amount.toString(),
        nonce,
        validFrom,
        validUntil,
        signature,
      },
      contractAddress,
      chainId,
      mintFee:      "100000000000000", // 0.0001 ETH
      resolvedFrom: source,
    });
  } catch (err) {
    console.error("[bridge/mint] Unhandled error:", err);
    return serverError();
  }
}
