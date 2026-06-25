"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useBalance } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { formatEther } from "viem";
import { useState } from "react";
import { ExternalLink, Loader2, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { TOKEN_FACTORY_ABI, WSYN_ABI } from "@/lib/contracts";
import toast from "react-hot-toast";

// ─── Chain config ─────────────────────────────────────────────────────────────

const CHAINS = [
  {
    id:          84532,
    name:        "Base Sepolia",
    explorer:    "https://sepolia.basescan.org",
    factory:     "0x56224F508E4D7A8e61EB94e1178f08c74e9A3230" as `0x${string}`,
    wsyn:        null,
  },
  {
    id:          8453,
    name:        "Base Mainnet",
    explorer:    "https://basescan.org",
    factory:     "0x3c17F73cFCcB8762462683d040F4F4eb6d71Bf6E" as `0x${string}`,
    wsyn:        (process.env.NEXT_PUBLIC_WSYN_CONTRACT_ADDRESS ?? null) as `0x${string}` | null,
  },
];

// ─── Factory fee card ─────────────────────────────────────────────────────────

function FactoryFeeCard({ chain }: { chain: typeof CHAINS[number] }) {
  const { address, chainId } = useWallet();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const { data: fees, isFetching, refetch } = useReadContract({
    address:      chain.factory,
    abi:          TOKEN_FACTORY_ABI,
    functionName: "collectedFees",
    chainId:      chain.id as 84532 | 8453,
  });

  const { data: owner } = useReadContract({
    address:      chain.factory,
    abi:          [{ name: "owner", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] }] as const,
    functionName: "owner",
    chainId:      chain.id as 84532 | 8453,
  });

  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const feesEth = fees ? Number(formatEther(fees as bigint)) : 0;
  const isOwner = address && owner ? address.toLowerCase() === (owner as string).toLowerCase() : null;
  const onWrongChain = chainId !== chain.id;

  async function handleWithdraw() {
    if (!address) return;
    setBusy(true);
    setErr("");
    try {
      if (onWrongChain) {
        await switchChainAsync({ chainId: chain.id });
      }
      const hash = await writeContractAsync({
        address:      chain.factory,
        abi:          TOKEN_FACTORY_ABI,
        functionName: "withdrawFees",
        chainId:      chain.id as 84532 | 8453,
      });
      setTxHash(hash);
      toast.success("Transaction submitted!");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed";
      setErr(msg.length > 100 ? msg.slice(0, 100) + "…" : msg);
      toast.error("Withdraw failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl p-5 space-y-4"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", boxShadow: "var(--shadow-card)" }}>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">Factory Fees</p>
          <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--c-text-1)" }}>{chain.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="text-text-secondary hover:text-neon-green transition-colors">
            <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
          </button>
          <a href={`${chain.explorer}/address/${chain.factory}`} target="_blank" rel="noopener noreferrer"
            className="text-text-secondary hover:text-neon-blue transition-colors">
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* Fee amount */}
      <div>
        <p className="text-3xl font-display font-bold"
          style={{ color: feesEth > 0 ? "var(--neon-green)" : "var(--c-text-2)" }}>
          {isFetching ? "…" : `${feesEth.toFixed(6)} ETH`}
        </p>
        <p className="text-[10px] font-mono text-text-secondary mt-1">
          Contract: <span className="font-mono">{chain.factory.slice(0, 10)}…{chain.factory.slice(-8)}</span>
        </p>
      </div>

      {/* Owner */}
      {owner && (
        <div className="flex items-center gap-2 text-xs font-mono"
          style={{ color: isOwner ? "var(--neon-green)" : "var(--c-text-2)" }}>
          <div className="w-1.5 h-1.5 rounded-full"
            style={{ background: isOwner ? "var(--neon-green)" : "var(--c-text-3)" }} />
          {isOwner === true  && "You are the owner"}
          {isOwner === false && `Owner: ${(owner as string).slice(0, 10)}…`}
          {isOwner === null  && "Connect wallet to verify"}
        </div>
      )}

      {/* Error */}
      {err && (
        <div className="flex items-start gap-2 rounded-lg px-3 py-2"
          style={{ background: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.2)" }}>
          <AlertCircle size={13} className="shrink-0 text-red-400 mt-0.5" />
          <span className="text-xs text-red-400">{err}</span>
        </div>
      )}

      {/* Success tx */}
      {confirmed && txHash && (
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--neon-green)" }}>
          <CheckCircle size={13} />
          <a href={`${chain.explorer}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
            className="underline font-mono">View transaction</a>
        </div>
      )}

      {/* Withdraw button */}
      <button
        onClick={handleWithdraw}
        disabled={busy || confirming || !address || feesEth === 0}
        className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
        style={{
          background: busy || confirming || !address || feesEth === 0
            ? "var(--bg-input)" : "linear-gradient(135deg, var(--neon-green), var(--neon-blue))",
          color:  busy || confirming || !address || feesEth === 0 ? "var(--c-text-3)" : "#000",
          cursor: busy || confirming || !address || feesEth === 0 ? "not-allowed" : "pointer",
        }}
      >
        {busy || confirming
          ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> {onWrongChain ? "Switching…" : "Claiming…"}</span>
          : onWrongChain ? `Switch to ${chain.name} & Withdraw` : "Withdraw Fees"
        }
      </button>
    </div>
  );
}

// ─── WSYN fee card ────────────────────────────────────────────────────────────

function WsynFeeCard({ contractAddress }: { contractAddress: `0x${string}` }) {
  const { address, chainId } = useWallet();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const { data: balance, isFetching, refetch } = useBalance({
    address:  contractAddress,
    chainId:  8453,
  });

  const { data: owner } = useReadContract({
    address:      contractAddress,
    abi:          [{ name: "owner", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] }] as const,
    functionName: "owner",
    chainId:      8453,
  });

  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const feesEth   = balance ? Number(formatEther(balance.value)) : 0;
  const isOwner   = address && owner ? address.toLowerCase() === (owner as string).toLowerCase() : null;
  const onWrongChain = chainId !== 8453;

  async function handleWithdraw() {
    if (!address) return;
    setBusy(true);
    setErr("");
    try {
      if (onWrongChain) await switchChainAsync({ chainId: 8453 });
      const hash = await writeContractAsync({
        address:      contractAddress,
        abi:          WSYN_ABI,
        functionName: "withdrawFees",
        chainId:      8453,
      });
      setTxHash(hash);
      toast.success("Transaction submitted!");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed";
      setErr(msg.length > 100 ? msg.slice(0, 100) + "…" : msg);
      toast.error("Withdraw failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl p-5 space-y-4"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", boxShadow: "var(--shadow-card)" }}>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">WSYN Mint Fees</p>
          <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--c-text-1)" }}>Base Mainnet</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="text-text-secondary hover:text-neon-green transition-colors">
            <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
          </button>
          <a href={`https://basescan.org/address/${contractAddress}`} target="_blank" rel="noopener noreferrer"
            className="text-text-secondary hover:text-neon-blue transition-colors">
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      <div>
        <p className="text-3xl font-display font-bold"
          style={{ color: feesEth > 0 ? "var(--neon-green)" : "var(--c-text-2)" }}>
          {isFetching ? "…" : `${feesEth.toFixed(6)} ETH`}
        </p>
        <p className="text-[10px] font-mono text-text-secondary mt-1">
          Contract: <span className="font-mono">{contractAddress.slice(0, 10)}…{contractAddress.slice(-8)}</span>
        </p>
      </div>

      {owner && (
        <div className="flex items-center gap-2 text-xs font-mono"
          style={{ color: isOwner ? "var(--neon-green)" : "var(--c-text-2)" }}>
          <div className="w-1.5 h-1.5 rounded-full"
            style={{ background: isOwner ? "var(--neon-green)" : "var(--c-text-3)" }} />
          {isOwner === true  && "You are the owner"}
          {isOwner === false && `Owner: ${(owner as string).slice(0, 10)}…`}
          {isOwner === null  && "Connect wallet to verify"}
        </div>
      )}

      {err && (
        <div className="flex items-start gap-2 rounded-lg px-3 py-2"
          style={{ background: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.2)" }}>
          <AlertCircle size={13} className="shrink-0 text-red-400 mt-0.5" />
          <span className="text-xs text-red-400">{err}</span>
        </div>
      )}

      {confirmed && txHash && (
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--neon-green)" }}>
          <CheckCircle size={13} />
          <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
            className="underline font-mono">View transaction</a>
        </div>
      )}

      <button
        onClick={handleWithdraw}
        disabled={busy || confirming || !address || feesEth === 0}
        className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
        style={{
          background: busy || confirming || !address || feesEth === 0
            ? "var(--bg-input)" : "linear-gradient(135deg, var(--neon-green), var(--neon-blue))",
          color:  busy || confirming || !address || feesEth === 0 ? "var(--c-text-3)" : "#000",
          cursor: busy || confirming || !address || feesEth === 0 ? "not-allowed" : "pointer",
        }}
      >
        {busy || confirming
          ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> {onWrongChain ? "Switching…" : "Claiming…"}</span>
          : onWrongChain ? "Switch to Base Mainnet & Withdraw" : "Withdraw WSYN Fees"
        }
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { address, isConnected } = useWallet();
  const wsynContract = process.env.NEXT_PUBLIC_WSYN_CONTRACT_ADDRESS as `0x${string}` | undefined;

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold mb-2"
          style={{
            background:           "linear-gradient(90deg, var(--neon-green), var(--neon-blue))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor:  "transparent",
          }}>
          Admin · Fee Collector
        </h1>
        <p className="text-sm text-text-secondary">
          Owner-only. Withdraw accumulated fees from the TokenFactory contracts and WSYN mint fees.
        </p>
      </div>

      {/* Wallet */}
      <div className="rounded-2xl p-5 mb-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)" }}>
        <p className="text-[10px] font-mono text-text-secondary uppercase tracking-wider mb-3">Connected Wallet</p>

        {isConnected && address ? (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: "var(--neon-green)", boxShadow: "0 0 6px var(--neon-green)" }} />
              <span className="font-mono text-sm" style={{ color: "var(--c-text-1)" }}>{address}</span>
            </div>
            <ConnectButton showBalance={false} chainStatus="icon" />
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-text-secondary">Connect your owner wallet to view and claim fees.</p>
            <ConnectButton label="Connect Wallet" />
          </div>
        )}
      </div>

      {/* Fee cards */}
      <div className="space-y-4">
        {CHAINS.map(chain => (
          <FactoryFeeCard key={chain.id} chain={chain} />
        ))}

        {wsynContract && <WsynFeeCard contractAddress={wsynContract} />}
      </div>
    </div>
  );
}
