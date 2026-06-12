export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { normalizeTokenAddress } from "@/lib/tokenLists";

const ZERO_EX_BASE_URL = "https://api.0x.org";
const FEE_RECIPIENT = "0xed60b71CEEEF9D25Ebda1C7465ad19Fc41D3A90c";
const SWAP_FEE_BPS = 30;

function toBps(percentage: string | number): number {
  return Math.round(parseFloat(String(percentage)) * 10000);
}

function extract0xError(data: unknown): string {
  if (!data) return "Unknown error from 0x API";
  if (typeof data === "string") {
    try { return extract0xError(JSON.parse(data)); } catch { return data; }
  }
  const d = data as Record<string, unknown>;
  if (d.reason) return String(d.reason);
  if (d.message) return String(d.message);
  if (Array.isArray(d.validationErrors) && d.validationErrors.length) {
    return (d.validationErrors as Array<{ reason?: string; description?: string }>)
      .map((e) => e.reason ?? e.description)
      .join("; ");
  }
  return "Failed to process swap request";
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sellToken = searchParams.get("sellToken");
    const buyToken = searchParams.get("buyToken");
    const sellAmount = searchParams.get("sellAmount");
    const chainId = parseInt(searchParams.get("chainId") ?? "8453");
    const slippagePercentage = searchParams.get("slippagePercentage") ?? "0.01";
    const taker = searchParams.get("taker") ?? searchParams.get("takerAddress");
    const skipValidation = searchParams.get("skipValidation") === "true";

    if (!sellToken || !buyToken || !sellAmount) {
      return NextResponse.json(
        { success: false, error: "sellToken, buyToken, and sellAmount are required" },
        { status: 400 },
      );
    }
    if (!/^\d+$/.test(sellAmount) || BigInt(sellAmount) <= 0n) {
      return NextResponse.json(
        { success: false, error: "sellAmount must be a positive integer (wei)" },
        { status: 400 },
      );
    }

    const params: Record<string, string | number | boolean> = {
      chainId,
      sellToken: normalizeTokenAddress(sellToken),
      buyToken: normalizeTokenAddress(buyToken),
      sellAmount,
      slippageBps: toBps(slippagePercentage),
      swapFeeRecipient: FEE_RECIPIENT,
      swapFeeBps: SWAP_FEE_BPS,
      swapFeeToken: normalizeTokenAddress(buyToken),
    };
    if (taker) params.taker = taker;
    if (skipValidation) params.skipValidation = true;

    const url = new URL(`${ZERO_EX_BASE_URL}/swap/allowance-holder/quote`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

    const response = await fetch(url.toString(), {
      headers: {
        "0x-api-key": process.env.ZERO_EX_API_KEY ?? "",
        "0x-version": "v2",
      },
      signal: AbortSignal.timeout(15_000),
    });

    const quote = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: extract0xError(quote), details: quote },
        { status: response.status },
      );
    }

    const needsApproval = !!(quote.issues?.allowance);
    const allowanceTarget = quote.issues?.allowance?.spender ?? null;

    return NextResponse.json({
      success: true,
      data: {
        ...quote,
        chainId,
        needsApproval,
        allowanceTarget,
        priceImpactPercentage: quote.estimatedPriceImpact ?? null,
      },
    });
  } catch (err) {
    console.error("GET /api/swap/quote:", err);
    return NextResponse.json({ success: false, error: "Swap quote request failed" }, { status: 500 });
  }
}
