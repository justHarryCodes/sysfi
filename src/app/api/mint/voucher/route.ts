export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { verifyFirebaseToken, unauthorized, badRequest, serverError } from "@/lib/firebase-auth";
import {
  encodeAbiParameters,
  keccak256,
  getAddress,
  parseUnits,
  toBytes,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getDb } from "@/lib/mongodb";
import crypto from "crypto";

const WSYN_ADDRESSES: Record<number, string> = {
  84532: "0x3c181eaaB64052c726194Da6797EA06DD15e8E6B",
  8453:  process.env.WSYN_CONTRACT_ADDRESS_MAINNET ?? "0x0000000000000000000000000000000000000000",
};

const MINT_FEE_WEI = "400000000000000";

async function getUserBalanceDoc(uid: string) {
  return (await getDb()).collection("user_balances").findOne({ uid });
}

async function getUserWalletAddress(uid: string): Promise<string | null> {
  const doc = await (await getDb()).collection("user_balances").findOne({ uid });
  return (doc?.walletAddress as string) || null;
}

function resolveEffectiveBalance(doc: Record<string, unknown> | null): { amount: number; source: string } {
  if (!doc) return { amount: 0, source: "none" };
  const balance = (doc.balance as number) || 0;
  const points  = (doc.points  as number) || 0;
  if (balance > 0) return { amount: balance, source: "balance" };
  if (points  > 0) return { amount: points,  source: "points" };
  return { amount: 0, source: "none" };
}

async function deductUserBalance(uid: string, source: string) {
  const field = source === "points" ? "points" : "balance";
  await (await getDb()).collection("user_balances").updateOne({ uid }, { $set: { [field]: 0 } });
}

export async function POST(req: NextRequest) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();

  try {
    const requestedChainId = parseInt(req.headers.get("x-chain-id") ?? process.env.CHAIN_ID ?? "84532", 10);
    const contractAddress  = WSYN_ADDRESSES[requestedChainId];

    if (!contractAddress || contractAddress === "0x0000000000000000000000000000000000000000") {
      return badRequest(`WSYN contract is not deployed on chain ${requestedChainId}`);
    }

    const userDoc = await getUserBalanceDoc(auth.uid);
    const { amount: rawAmount, source } = resolveEffectiveBalance(userDoc as Record<string, unknown> | null);
    if (rawAmount === 0) return badRequest("No mintable balance available");

    const storedAddress = await getUserWalletAddress(auth.uid);
    if (!storedAddress) return badRequest("No wallet address linked to this account. Create a wallet first.");

    let recipient: string;
    try {
      recipient = getAddress(storedAddress);
    } catch {
      return badRequest("Invalid wallet address linked to account");
    }

    const signerKey = process.env.VOUCHER_SIGNER_KEY;
    if (!signerKey) {
      console.error("[mint/voucher] VOUCHER_SIGNER_KEY is not set");
      return serverError("Signing service unavailable");
    }

    const nonce      = `0x${crypto.randomBytes(32).toString("hex")}` as `0x${string}`;
    const validFrom  = Math.floor(Date.now() / 1000);
    const validUntil = validFrom + 900;
    const amount     = parseUnits(rawAmount.toString(), 18);

    const encoded = encodeAbiParameters(
      [
        { type: "uint256" }, { type: "address" }, { type: "address" },
        { type: "uint256" }, { type: "bytes32" },
        { type: "uint256" }, { type: "uint256" },
      ],
      [BigInt(requestedChainId), contractAddress as `0x${string}`, recipient as `0x${string}`,
       amount, nonce, BigInt(validFrom), BigInt(validUntil)],
    );

    const hash      = keccak256(encoded);
    const keyHex    = signerKey.startsWith("0x") ? signerKey : `0x${signerKey}`;
    const account   = privateKeyToAccount(keyHex as `0x${string}`);
    const signature = await account.signMessage({ message: { raw: toBytes(hash) } });

    await deductUserBalance(auth.uid, source);

    return Response.json({
      success: true,
      voucher: { recipient, amount: amount.toString(), nonce, validFrom, validUntil, signature },
      mintFee: MINT_FEE_WEI,
      contractAddress,
      chainId: requestedChainId,
      resolvedFrom: source,
    });
  } catch (err) {
    console.error("[mint/voucher] Unhandled error:", err);
    return serverError();
  }
}
