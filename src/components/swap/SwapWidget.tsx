"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useChainId, useWriteContract, useSendTransaction, useWaitForTransactionReceipt, useBalance } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import toast from "react-hot-toast";
import { ERC20_ABI } from "@/lib/contracts";
import { TokenSelector } from "./TokenSelector";
import type { SwapToken } from "@/lib/tokenLists";
import { ChevronDown, ArrowUpDown } from "lucide-react";

const NATIVE_TOKEN_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
function isNative(addr: string) { return addr.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase(); }

export function SwapWidget() {
  const { address } = useAccount();
  const chainId     = useChainId();

  const [sellToken, setSellToken]           = useState<SwapToken | null>(null);
  const [buyToken,  setBuyToken]            = useState<SwapToken | null>(null);
  const [sellAmount, setSellAmount]         = useState("");
  const [quote, setQuote]                   = useState<Record<string, unknown> | null>(null);
  const [price, setPrice]                   = useState<Record<string, unknown> | null>(null);
  const [isFetching, setIsFetching]         = useState(false);
  const [showSellSelector, setShowSellSelector] = useState(false);
  const [showBuySelector,  setShowBuySelector]  = useState(false);
  const [slippage, setSlippage]             = useState("0.5");
  const [txHash, setTxHash]                 = useState<`0x${string}` | undefined>();

  const { writeContractAsync }  = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const { data: sellBalance } = useBalance({
    address,
    token: sellToken && !isNative(sellToken.address) ? (sellToken.address as `0x${string}`) : undefined,
  });

  const fetchPrice = useCallback(async () => {
    if (!sellToken || !buyToken || !sellAmount || parseFloat(sellAmount) <= 0) { setPrice(null); return; }
    try {
      const sellWei = parseUnits(sellAmount, sellToken.decimals).toString();
      const params  = new URLSearchParams({
        chainId: String(chainId), sellToken: sellToken.address, buyToken: buyToken.address,
        sellAmount: sellWei, slippagePercentage: (parseFloat(slippage) / 100).toString(),
        ...(address ? { taker: address } : {}),
      });
      setIsFetching(true);
      const res  = await fetch(`/api/swap/price?${params.toString()}`);
      const json = await res.json();
      if (json.success) setPrice(json.data);
    } catch (err) { console.error("Price fetch failed:", err); }
    finally { setIsFetching(false); }
  }, [sellToken, buyToken, sellAmount, chainId, address, slippage]);

  useEffect(() => { const t = setTimeout(fetchPrice, 600); return () => clearTimeout(t); }, [fetchPrice]);

  useEffect(() => {
    if (isConfirmed) { toast.success("Swap confirmed!"); setSellAmount(""); setPrice(null); setQuote(null); }
  }, [isConfirmed]);

  const handleSwap = async () => {
    if (!address) return toast.error("Connect your wallet");
    if (!sellToken || !buyToken || !sellAmount) return;
    try {
      const sellWei = parseUnits(sellAmount, sellToken.decimals).toString();
      const params  = new URLSearchParams({
        chainId: String(chainId), sellToken: sellToken.address, buyToken: buyToken.address,
        sellAmount: sellWei, slippagePercentage: (parseFloat(slippage) / 100).toString(), taker: address,
      });
      toast.loading("Fetching quote...", { id: "swap" });
      const res  = await fetch(`/api/swap/quote?${params.toString()}`);
      const json = await res.json();
      if (!json.success) { toast.error(json.error, { id: "swap" }); return; }
      const q = json.data;
      setQuote(q);
      if (q.needsApproval && !isNative(sellToken.address)) {
        toast.loading("Approving token...", { id: "swap" });
        await writeContractAsync({ address: sellToken.address as `0x${string}`, abi: ERC20_ABI, functionName: "approve", args: [q.allowanceTarget as `0x${string}`, BigInt(sellWei)] });
        await new Promise((r) => setTimeout(r, 3000));
      }
      toast.loading("Sending swap...", { id: "swap" });
      const hash = await sendTransactionAsync({
        to:    q.transaction?.to   as `0x${string}`,
        data:  q.transaction?.data as `0x${string}`,
        value: q.transaction?.value ? BigInt(q.transaction.value) : 0n,
        gas:   q.transaction?.gas  ? BigInt(q.transaction.gas)   : undefined,
      });
      setTxHash(hash);
      toast.loading("Confirming...", { id: "swap" });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Swap failed", { id: "swap" });
    }
  };

  const flipTokens = () => { setSellToken(buyToken); setBuyToken(sellToken); setSellAmount(""); setPrice(null); };

  const buyAmountFormatted = price?.buyAmount
    ? formatUnits(BigInt(price.buyAmount as string), buyToken?.decimals ?? 18)
    : "";

  const disabled = !address || !sellToken || !buyToken || !sellAmount || isFetching || isConfirming;

  const btnLabel = !address ? "Connect Wallet"
    : !sellToken || !buyToken ? "Select tokens"
    : !sellAmount ? "Enter amount"
    : isConfirming ? "Confirming..."
    : isFetching   ? "Fetching price..."
    : "Swap";

  const panelStyle: React.CSSProperties = {
    background:   "var(--bg-input)",
    border:       "1px solid var(--border-1)",
    borderRadius: "14px",
    padding:      "16px",
  };

  return (
    <div
      className="w-full rounded-2xl p-5"
      style={{ background: "var(--bg-glass)", border: "1px solid var(--border-2)", backdropFilter: "blur(24px)", boxShadow: "var(--shadow-card)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-display font-semibold" style={{ color: "var(--neon-blue)" }}>Swap</h2>
        <div className="flex items-center gap-1">
          <span className="text-xs font-mono mr-1 text-text-secondary">Slippage</span>
          {["0.1", "0.5", "1"].map((s) => (
            <button key={s} onClick={() => setSlippage(s)} className="px-2 py-0.5 rounded text-xs font-mono transition-all"
              style={slippage === s
                ? { background: "var(--bg-input)", color: "var(--neon-blue)", border: "1px solid var(--border-3)" }
                : { background: "transparent",     color: "var(--c-text-2)",  border: "1px solid transparent" }
              }>{s}%</button>
          ))}
        </div>
      </div>

      {/* Sell panel */}
      <div style={panelStyle}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-text-secondary">You sell</span>
          {sellBalance && (
            <button
              onClick={() => setSellAmount(formatUnits(sellBalance.value, sellBalance.decimals))}
              className="text-xs font-mono transition-colors"
              style={{ color: "var(--neon-blue)" }}
            >
              Max {parseFloat(formatUnits(sellBalance.value, sellBalance.decimals)).toFixed(4)}
            </button>
          )}
        </div>
        <input
          type="number" value={sellAmount} onChange={(e) => setSellAmount(e.target.value)}
          placeholder="0.0" className="w-full bg-transparent text-xl sm:text-2xl font-semibold focus:outline-none mb-3"
          style={{ color: "var(--c-text-1)", fontFamily: "'Exo 2', sans-serif", minWidth: 0 }}
        />
        <div className="flex justify-end">
          <TokenButton token={sellToken} onClick={() => setShowSellSelector(true)} />
        </div>
      </div>

      {/* Flip */}
      <div className="flex justify-center -my-0.5 z-10 relative">
        <button onClick={flipTokens} className="h-9 w-9 rounded-full flex items-center justify-center transition-all duration-150"
          style={{ background: "var(--bg-glass)", border: "1px solid var(--border-1)", color: "var(--c-text-2)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--neon-blue)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-3)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--c-text-2)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-1)"; }}>
          <ArrowUpDown size={16} />
        </button>
      </div>

      {/* Buy panel */}
      <div style={{ ...panelStyle, marginTop: 0 }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-text-secondary">You receive</span>
          {isFetching && <span className="text-xs font-mono text-text-secondary">Fetching…</span>}
        </div>
        <input
          type="number" value={buyAmountFormatted ? parseFloat(buyAmountFormatted).toFixed(4) : ""}
          readOnly placeholder="0.0" className="w-full bg-transparent text-xl sm:text-2xl font-semibold cursor-default focus:outline-none mb-3"
          style={{ color: "var(--c-text-1)", fontFamily: "'Exo 2', sans-serif", minWidth: 0 }}
        />
        <div className="flex justify-end">
          <TokenButton token={buyToken} onClick={() => setShowBuySelector(true)} />
        </div>
      </div>

      {/* Price info */}
      {price && sellToken && buyToken && (
        <div className="mt-3 rounded-xl px-4 py-3 text-xs space-y-1.5 font-mono"
          style={{ background: "var(--bg-input)", border: "1px solid var(--border-1)" }}>
          <div className="flex justify-between">
            <span className="text-text-secondary">Rate</span>
            <span className="text-text-primary">1 {sellToken.symbol} ≈ {parseFloat(String(price.price ?? 0)).toFixed(4)} {buyToken.symbol}</span>
          </div>
          {price.estimatedPriceImpact != null && (
            <div className="flex justify-between">
              <span className="text-text-secondary">Price impact</span>
              <span style={{ color: parseFloat(String(price.estimatedPriceImpact)) > 3 ? "#f87171" : "var(--neon-green)" }}>
                {parseFloat(String(price.estimatedPriceImpact)).toFixed(2)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Swap button */}
      <button onClick={handleSwap} disabled={disabled} className="mt-4 w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-150"
        style={disabled
          ? { background: "var(--bg-input-g)", border: "1px solid var(--border-g1)", color: "var(--c-text-2)", cursor: "not-allowed" }
          : { background: "linear-gradient(135deg, var(--bg-input-g), transparent)", border: "1px solid var(--border-g3)", color: "var(--neon-green)", boxShadow: "0 0 20px var(--border-g1)" }
        }
      >
        {btnLabel}
      </button>

      {showSellSelector && (
        <TokenSelector chainId={chainId} onSelect={(t) => { setSellToken(t); setShowSellSelector(false); }} onClose={() => setShowSellSelector(false)} exclude={buyToken?.address} />
      )}
      {showBuySelector && (
        <TokenSelector chainId={chainId} onSelect={(t) => { setBuyToken(t); setShowBuySelector(false); }} onClose={() => setShowBuySelector(false)} exclude={sellToken?.address} />
      )}
    </div>
  );
}

function TokenButton({ token, onClick }: { token: SwapToken | null; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 transition-all duration-150 max-w-[160px]"
      style={{ background: "var(--bg-input)", border: "1px solid var(--border-2)", color: "var(--c-text-1)", flexShrink: 0 }}>
      {token ? (
        <>
          {token.logoURI ? (
            <img src={token.logoURI} alt="" className="h-5 w-5 rounded-full flex-shrink-0" />
          ) : (
            <div className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
              style={{ background: "linear-gradient(135deg, var(--neon-blue), var(--neon-green))", color: "var(--bg-base)" }}>
              {token.symbol.charAt(0)}
            </div>
          )}
          <span className="font-medium text-sm truncate max-w-[72px]">{token.symbol}</span>
        </>
      ) : (
        <span className="text-sm whitespace-nowrap text-text-secondary">Select token</span>
      )}
      <ChevronDown size={14} className="flex-shrink-0 text-text-secondary" />
    </button>
  );
}
