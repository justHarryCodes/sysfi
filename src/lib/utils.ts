import { clsx, type ClassValue } from "clsx";
import { twMerge }               from "tailwind-merge";
import { formatEther, parseEther } from "viem";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── ETH formatters ───────────────────────────────────────────────────────────
export function formatETH(wei: bigint, decimals = 4): string {
  const eth = parseFloat(formatEther(wei));
  if (eth === 0) return "0";
  if (eth < 0.0001) return "< 0.0001";
  return eth.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  });
}

export function formatTokenAmount(wei: bigint, decimals = 2): string {
  const n = Number(wei) / 1e18;
  if (n >= 1e9) return (n / 1e9).toFixed(2)  + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2)  + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2)  + "K";
  return n.toFixed(decimals);
}

export function formatPrice(wei: bigint): string {
  const p = Number(wei) / 1e18;
  if (p === 0) return "0";
  if (p < 1e-9) return p.toExponential(2);
  if (p < 0.001) return p.toPrecision(3);
  return p.toFixed(6);
}

// ─── USD formatters ───────────────────────────────────────────────────────────
/** Convert ETH (as wei bigint) to USD using current ETH price */
export function weiToUSD(wei: bigint, ethUSD: number): number {
  const eth = Number(wei) / 1e18;
  return eth * ethUSD;
}

/** Format a USD number nicely */
export function formatUSD(usd: number): string {
  if (!isFinite(usd) || usd === 0) return "$0.00";
  if (usd >= 1e9)  return "$" + (usd / 1e9).toFixed(2)  + "B";
  if (usd >= 1e6)  return "$" + (usd / 1e6).toFixed(2)  + "M";
  if (usd >= 1e3)  return "$" + (usd / 1e3).toFixed(2)  + "K";
  if (usd >= 1)    return "$" + usd.toFixed(2);
  if (usd >= 0.01) return "$" + usd.toFixed(4);
  if (usd >= 1e-6) return "$" + usd.toFixed(8);
  return "<$0.000001";
}

/** Full dual display: "0.000002 ETH ($0.0064)" */
export function formatPriceWithUSD(priceWei: bigint, ethUSD: number): string {
  const ethStr = formatPrice(priceWei);
  const usd    = weiToUSD(priceWei, ethUSD);
  return `${ethStr} ETH  (${formatUSD(usd)})`;
}

/** Format raw ETH float to USD */
export function ethToUSD(eth: number, ethUSD: number): string {
  return formatUSD(eth * ethUSD);
}

// ─── Market cap estimate ──────────────────────────────────────────────────────
export function estimateMarketCap(priceWei: bigint, ethUSD: number): string {
  const TOTAL_SUPPLY = 1_000_000_000;
  const pricePerToken = Number(priceWei) / 1e18;
  const mcapETH = pricePerToken * TOTAL_SUPPLY;
  const mcapUSD = mcapETH * ethUSD;
  return formatUSD(mcapUSD);
}

// ─── Address formatting ───────────────────────────────────────────────────────
export function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ─── Graduation ───────────────────────────────────────────────────────────────
export const GRADUATION_TARGET = parseEther("10");

export function graduationPercent(poolETH: bigint): number {
  return Math.min(100, (Number(poolETH) / Number(GRADUATION_TARGET)) * 100);
}

export function applySlippage(amount: bigint, slippageBps: number): bigint {
  return (amount * BigInt(10_000 - slippageBps)) / 10_000n;
}

// ─── Time ─────────────────────────────────────────────────────────────────────
export function timeAgo(timestamp: number): string {
  const diff = Date.now() / 1000 - timestamp;
  if (diff < 60)    return Math.floor(diff)      + "s ago";
  if (diff < 3600)  return Math.floor(diff / 60)   + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  return Math.floor(diff / 86400) + "d ago";
}

export function countdown(unlockTimestamp: bigint): string {
  const diff = Number(unlockTimestamp) - Math.floor(Date.now() / 1000);
  if (diff <= 0) return "Unlocked";
  const days  = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const mins  = Math.floor((diff % 3600) / 60);
  if (days  > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

// ─── Validation ───────────────────────────────────────────────────────────────
export function isValidETHAmount(v: string): boolean {
  if (!v || v === "") return false;
  const n = parseFloat(v);
  return !isNaN(n) && n > 0;
}
