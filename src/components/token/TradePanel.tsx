"use client";

import { useState, useEffect } from "react";
import { parseEther, parseUnits, formatEther } from "viem";
import { toast } from "react-hot-toast";
import { Settings, AlertTriangle, ShieldAlert } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import NeonButton from "@/components/ui/NeonButton";
import { useWallet } from "@/context/WalletContext";
import {
  useBuyTokens,
  useSellTokens,
  useQuoteBuy,
  useQuoteSell,
  useTokenBalance,
  useTokenAllowance,
  useApproveToken,
} from "@/hooks/useLaunchPool";
import {
  formatETH,
  formatTokenAmount,
  formatPrice,
  formatUSD,
  weiToUSD,
  isValidETHAmount,
} from "@/lib/utils";

const DISCLAIMER_SESSION_KEY = "sysfi_disclaimer_accepted";

interface TradePanelProps {
  poolAddr: `0x${string}`;
  tokenAddr: `0x${string}`;
  graduated: boolean;
  priceWei: bigint;
  ethUSD?: number;
  nativeCurrencyLabel?: string;
}

type Tab = "buy" | "sell";

export default function TradePanel({
  poolAddr,
  tokenAddr,
  graduated,
  priceWei,
  ethUSD = 0,
  nativeCurrencyLabel = "ETH",
}: TradePanelProps) {
  const { address, isConnected, isUnsupportedChain } = useWallet();
  const [tab, setTab] = useState<Tab>("buy");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState(2);
  const [showSlip, setShowSlip] = useState(false);
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);
  const [sessionAccepted, setSessionAccepted] = useState(false);

  // On mount, check if already accepted this session
  useEffect(() => {
    if (typeof window !== "undefined") {
      const accepted =
        sessionStorage.getItem(DISCLAIMER_SESSION_KEY) === "true";
      setSessionAccepted(accepted);
    }
  }, []);

  const ethIn =
    tab === "buy" && isValidETHAmount(amount)
      ? parseEther(amount as `${number}`)
      : 0n;
  const tokenIn =
    tab === "sell" && isValidETHAmount(amount)
      ? parseUnits(amount as `${number}`, 18)
      : 0n;

  const { data: buyQuote } = useQuoteBuy(poolAddr, ethIn);
  const { data: sellQuote } = useQuoteSell(poolAddr, tokenIn);
  const { data: tokenBal } = useTokenBalance(tokenAddr, address);
  const { data: allowance, refetch: refetchAllowance } = useTokenAllowance(
    tokenAddr,
    address,
    poolAddr,
  );

  const {
    approve,
    isPending: isApproving,
    isSuccess: approveOk,
  } = useApproveToken();
  const {
    buy,
    isPending: isBuying,
    isConfirming: buyConf,
    isSuccess: buyOk,
  } = useBuyTokens();
  const {
    sell,
    isPending: isSelling,
    isConfirming: sellConf,
    isSuccess: sellOk,
  } = useSellTokens();

  useEffect(() => {
    if (approveOk) {
      refetchAllowance();
      toast.success("Approved!");
    }
  }, [approveOk]);

  useEffect(() => {
    if (buyOk) {
      toast.success("🟢 Tokens purchased!");
      setAmount("");
    }
  }, [buyOk]);

  useEffect(() => {
    if (sellOk) {
      toast.success(`💰 Sold for ${nativeCurrencyLabel}!`);
      setAmount("");
    }
  }, [sellOk, nativeCurrencyLabel]);

  function handleDisclaimerAccept(checked: boolean) {
    setDisclaimerChecked(checked);
    if (checked) {
      sessionStorage.setItem(DISCLAIMER_SESSION_KEY, "true");
      setSessionAccepted(true);
    }
  }

  const needsApproval =
    tab === "sell" && tokenIn > 0n && (allowance ?? 0n) < tokenIn;
  const isBusy = isApproving || isBuying || isSelling || buyConf || sellConf;
  const disclaimerOk = sessionAccepted || disclaimerChecked;
  const hasAmount = tab === "buy" ? !!ethIn : !!tokenIn;

  const inputUSD = (() => {
    if (!ethUSD || !amount) return null;
    const n = parseFloat(amount);
    if (isNaN(n)) return null;
    if (tab === "buy") return formatUSD(n * ethUSD);
    return formatUSD(n * (Number(priceWei) / 1e18) * ethUSD);
  })();

  const outputValue =
    tab === "buy" && buyQuote
      ? `${formatTokenAmount(buyQuote[0])} tokens`
      : tab === "sell" && sellQuote
        ? `${formatETH(sellQuote[0])} ${nativeCurrencyLabel}`
        : "—";

  const outputUSD =
    tab === "sell" && sellQuote && ethUSD
      ? formatUSD((Number(sellQuote[0]) / 1e18) * ethUSD)
      : null;

  const feeValue =
    tab === "buy" && buyQuote
      ? `${formatETH(buyQuote[1])} ${nativeCurrencyLabel}`
      : tab === "sell" && sellQuote
        ? `${formatETH(sellQuote[1])} ${nativeCurrencyLabel}`
        : "—";

  function handleAction() {
    if (!isConnected || graduated || !disclaimerOk) return;
    if (tab === "buy" && ethIn > 0n && buyQuote)
      buy(poolAddr, ethIn, buyQuote[0], slippage * 100);
    if (tab === "sell" && tokenIn > 0n) {
      if (needsApproval) approve(tokenAddr, poolAddr, tokenIn);
      else if (sellQuote) sell(poolAddr, tokenIn, sellQuote[0], slippage * 100);
    }
  }

  const btnLabel = graduated
    ? "Pool graduated"
    : !isConnected
      ? "Connect wallet"
      : !disclaimerOk && hasAmount
        ? "Accept disclaimer first"
        : tab === "buy" && !ethIn
          ? `Enter ${nativeCurrencyLabel} amount`
          : tab === "sell" && !tokenIn
            ? "Enter token amount"
            : needsApproval
              ? "Approve tokens"
              : tab === "buy"
                ? "Buy tokens"
                : "Sell tokens";

  return (
    <GlassCard glow="blue" className="p-5">
      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <div
        className="flex gap-1 mb-5 p-1 rounded-xl"
        style={{ background: "rgba(0,0,0,0.3)" }}
      >
        {(["buy", "sell"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setAmount("");
            }}
            className="flex-1 py-2 rounded-lg text-sm font-mono font-bold transition-all capitalize"
            style={
              tab === t
                ? {
                    background:
                      t === "buy"
                        ? "linear-gradient(135deg, rgba(0,255,135,0.2), rgba(0,255,135,0.08))"
                        : "linear-gradient(135deg, rgba(255,45,120,0.2), rgba(255,45,120,0.08))",
                    border: `1px solid ${t === "buy" ? "rgba(0,255,135,0.3)" : "rgba(255,45,120,0.3)"}`,
                    color: t === "buy" ? "var(--neon-green)" : "#ff2d78",
                  }
                : { color: "#475569" }
            }
          >
            {t === "buy" ? "▲ Buy" : "▼ Sell"}
          </button>
        ))}
      </div>

      {/* ── Input ────────────────────────────────────────────────────── */}
      <div
        className="rounded-xl p-4 mb-3"
        style={{
          background: "rgba(0,0,0,0.3)",
          border: "1px solid rgba(0,212,255,0.08)",
        }}
      >
        <div className="flex justify-between text-xs font-mono text-text-muted mb-2">
          <span>You pay</span>
          {tab === "sell" && tokenBal != null && (
            <button
              className="text-neon-blue hover:underline"
              onClick={() => setAmount(formatEther(tokenBal))}
            >
              Max: {formatTokenAmount(tokenBal)}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="0"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="flex-1 bg-transparent text-xl font-mono text-text-primary outline-none placeholder:text-text-muted"
          />
          <div
            className="px-3 py-1.5 rounded-lg text-sm font-mono font-bold shrink-0"
            style={{
              background: "rgba(0,212,255,0.08)",
              border: "1px solid rgba(0,212,255,0.15)",
              color: "var(--neon-blue)",
            }}
          >
            {tab === "buy" ? nativeCurrencyLabel : "TOKEN"}
          </div>
        </div>
        {inputUSD && (
          <p className="mt-1.5 text-xs font-mono text-text-muted">
            ≈ {inputUSD}
          </p>
        )}
      </div>

      {/* ── Output ───────────────────────────────────────────────────── */}
      <div
        className="rounded-xl p-4 mb-4"
        style={{
          background: "rgba(0,0,0,0.2)",
          border: "1px solid rgba(0,212,255,0.06)",
        }}
      >
        <div className="flex justify-between text-xs font-mono mb-1">
          <span className="text-text-muted">You receive</span>
          <span className="text-text-primary font-bold">{outputValue}</span>
        </div>
        {outputUSD && (
          <div className="flex justify-end">
            <span
              className="text-[10px] font-mono"
              style={{ color: "var(--neon-blue)" }}
            >
              ≈ {outputUSD}
            </span>
          </div>
        )}
        <div className="flex justify-between text-xs font-mono">
          <span className="text-text-muted">Fee (0.5%)</span>
          <span className="text-text-secondary">{feeValue}</span>
        </div>
      </div>

      {/* ── Slippage ─────────────────────────────────────────────────── */}
      <div className="mb-4">
        <button
          className="flex items-center gap-1.5 text-xs font-mono text-text-secondary hover:text-neon-blue transition-colors"
          onClick={() => setShowSlip(!showSlip)}
        >
          <Settings size={11} /> Slippage: {slippage}%
        </button>
        {showSlip && (
          <div className="flex gap-2 mt-2">
            {[0.5, 1, 2, 5].map((v) => (
              <button
                key={v}
                onClick={() => setSlippage(v)}
                className="px-3 py-1 rounded-lg text-xs font-mono transition-all"
                style={
                  slippage === v
                    ? {
                        background: "rgba(0,212,255,0.15)",
                        border: "1px solid rgba(0,212,255,0.3)",
                        color: "var(--neon-blue)",
                      }
                    : {
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        color: "#64748b",
                      }
                }
              >
                {v}%
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Risk disclaimer (once per session) ───────────────────────── */}
      {!sessionAccepted && (
        <div
          className="rounded-xl p-4 mb-4"
          style={{
            background: "rgba(245, 158, 11, 0.05)",
            border: "1px solid rgba(245, 158, 11, 0.2)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert
              size={13}
              style={{ color: "#f59e0b", flexShrink: 0 }}
            />
            <p
              className="text-[11px] font-mono font-bold uppercase tracking-wider"
              style={{ color: "#f59e0b" }}
            >
              Risk Disclaimer
            </p>
          </div>

          <p className="text-[11px] font-body text-text-secondary leading-relaxed mb-3">
            Trading meme tokens and bonding-curve assets carries{" "}
            <span className="text-text-primary font-semibold">
              significant financial risk
            </span>
            , including the potential loss of your entire investment. Token
            prices can be highly volatile and may drop to zero at any time.{" "}
            <span className="text-text-primary font-semibold">
              Sysfi does not endorse any token and will not be held responsible
              for any losses of any kind.
            </span>{" "}
            Please do your own research (DYOR) before trading. Never invest more
            than you can afford to lose.
          </p>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <div className="relative mt-0.5 shrink-0">
              <input
                type="checkbox"
                checked={disclaimerChecked}
                onChange={(e) => handleDisclaimerAccept(e.target.checked)}
                className="sr-only"
              />
              <div
                className="w-4 h-4 rounded-[4px] flex items-center justify-center transition-all duration-150"
                style={{
                  background: disclaimerChecked
                    ? "var(--neon-green)"
                    : "rgba(0,0,0,0.4)",
                  border: disclaimerChecked
                    ? "1px solid var(--neon-green)"
                    : "1px solid rgba(255,255,255,0.15)",
                  boxShadow: disclaimerChecked
                    ? "0 0 8px rgba(0,255,135,0.4)"
                    : "none",
                }}
              >
                {disclaimerChecked && (
                  <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                    <path
                      d="M1 3.5L3.5 6L8 1"
                      stroke="#060611"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            </div>
            <span
              className="text-[11px] font-body leading-relaxed select-none"
              style={{ color: disclaimerChecked ? "#e2e8f0" : "#64748b" }}
            >
              I understand the risks, have done my own research, and accept full
              responsibility for any outcome of this trade.
            </span>
          </label>
        </div>
      )}

      {/* ── Action button ─────────────────────────────────────────────── */}
      <NeonButton
        variant={tab === "buy" ? "solid-green" : "solid-blue"}
        size="lg"
        className="w-full"
        onClick={handleAction}
        loading={isBusy}
        disabled={
          graduated ||
          !isConnected ||
          isUnsupportedChain ||
          !disclaimerOk ||
          (tab === "buy" ? !ethIn : !tokenIn)
        }
      >
        {!disclaimerOk && hasAmount ? (
          <span className="flex items-center justify-center gap-2">
            <AlertTriangle size={14} /> Accept disclaimer first
          </span>
        ) : (
          btnLabel
        )}
      </NeonButton>

      {/* ── Price info ────────────────────────────────────────────────── */}
      <div className="mt-3 space-y-1">
        <div className="flex justify-between text-xs font-mono text-text-muted">
          <span>Price:</span>
          <span style={{ color: "var(--neon-blue)" }}>
            {formatPrice(priceWei)} {nativeCurrencyLabel}
          </span>
        </div>
        {ethUSD > 0 && (
          <div className="flex justify-between text-xs font-mono text-text-muted">
            <span>USD price:</span>
            <span style={{ color: "var(--neon-green)" }}>
              {formatUSD(weiToUSD(priceWei, ethUSD))}
            </span>
          </div>
        )}
        {ethUSD > 0 && (
          <div className="flex justify-between text-xs font-mono text-text-muted">
            <span>1 {nativeCurrencyLabel} =</span>
            <span>{formatUSD(ethUSD)}</span>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
