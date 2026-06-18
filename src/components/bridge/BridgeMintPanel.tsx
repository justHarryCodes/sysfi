"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
  useReadContract,
} from "wagmi";
import { formatUnits } from "viem";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import {
  AlertCircle, Loader2, RefreshCw, ExternalLink, CheckCircle, LogOut,
} from "lucide-react";
import toast from "react-hot-toast";
import { useWallet } from "@/context/WalletContext";
import { WSYN_ABI } from "@/lib/contracts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FbUser { uid: string; email: string; idToken: string }

interface BalanceData {
  effectiveAmount: number;
  source:          "networkBalance" | "combined" | "none";
  totalMinted:     number;
  remaining:       number;
  cap:             number;
  walletAddress:   string | null;
}

interface Voucher {
  recipient:  string;
  amount:     string;
  nonce:      `0x${string}`;
  validFrom:  number;
  validUntil: number;
  signature:  `0x${string}`;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_MAINNET_ID = 8453;
const WSYN_CONTRACT   = (process.env.NEXT_PUBLIC_WSYN_CONTRACT_ADDRESS ?? "") as `0x${string}`;
const BASE_EXPLORER   = "https://basescan.org";

// ─── Firebase REST auth ───────────────────────────────────────────────────────

async function firebaseSignIn(email: string, password: string): Promise<FbUser> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw new Error("Firebase API key not configured");

  const res  = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const data = await res.json();
  if (!res.ok) {
    const msg = data.error?.message ?? "Login failed";
    if (msg.includes("EMAIL_NOT_FOUND") || msg.includes("INVALID_PASSWORD") || msg.includes("INVALID_LOGIN_CREDENTIALS"))
      throw new Error("Incorrect email or password");
    throw new Error(msg);
  }
  return { uid: data.localId, email: data.email, idToken: data.idToken };
}

// ─── Supply meter ─────────────────────────────────────────────────────────────

function SupplyMeter({
  currentSupply, isLoading, onRefetch,
}: {
  currentSupply: bigint | undefined;
  isLoading:     boolean;
  onRefetch:     () => void;
}) {
  const minted    = currentSupply ? Number(formatUnits(currentSupply, 18)) : 0;
  const maxSupply = 100_000_000;
  const pct       = Math.min(100, (minted / maxSupply) * 100);
  const reserve   = maxSupply - minted;

  return (
    <div className="rounded-xl p-4 space-y-3"
      style={{ background: "var(--bg-input-g)", border: "1px solid var(--border-g2)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--neon-green)" }} />
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: "var(--neon-green)" }}>
            WSYN Supply · Live
          </span>
        </div>
        <button onClick={onRefetch} className="text-text-secondary hover:text-neon-green transition-colors">
          <RefreshCw size={11} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {isLoading && !currentSupply ? (
        <div className="flex items-center gap-2 text-text-secondary">
          <Loader2 size={13} className="animate-spin" />
          <span className="text-xs">Fetching on-chain data…</span>
        </div>
      ) : (
        <>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-display font-bold" style={{ color: "var(--neon-green)" }}>
                {minted.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[10px] font-mono text-text-secondary">WSYN minted on-chain</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-mono font-bold" style={{ color: "var(--c-text-2)" }}>
                {reserve.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[10px] font-mono text-text-secondary">remaining</p>
            </div>
          </div>
          <div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,255,135,0.1)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width:     `${pct}%`,
                  background: "linear-gradient(90deg, var(--neon-green), var(--neon-blue))",
                  minWidth:  pct > 0 ? "4px" : "0",
                }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[10px] font-mono text-text-secondary">
              <span>{pct.toFixed(3)}% minted</span>
              <span>100,000,000 max</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BridgeMintPanel() {
  const [fbUser,      setFbUser]      = useState<FbUser | null>(null);
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError,   setAuthError]   = useState("");

  const [balanceData,    setBalanceData]    = useState<BalanceData | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError,   setBalanceError]   = useState("");

  const [mintAmount,    setMintAmount]    = useState("");
  const [mintStep,      setMintStep]      = useState<"idle" | "requesting" | "submitting" | "confirming" | "success" | "error">("idle");
  const [mintError,     setMintError]     = useState("");
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [voucherMeta,   setVoucherMeta]   = useState<{ contractAddress: string; mintFee: string; chainId: number } | null>(null);

  const { address, isConnected, chainId: connectedChain } = useWallet();
  const { openConnectModal } = useConnectModal();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync }   = useSwitchChain();

  const contractAddr = (voucherMeta?.contractAddress ?? WSYN_CONTRACT) as `0x${string}`;
  const enabled      = !!contractAddr;

  const { data: currentSupply, isFetching: supplyFetching, refetch: refetchSupply } = useReadContract({
    address: contractAddr || undefined, abi: WSYN_ABI, functionName: "totalSupply",
    chainId: BASE_MAINNET_ID, query: { enabled, refetchInterval: 15_000 },
  });

  const { data: onChainMinted, refetch: refetchUserMinted } = useReadContract({
    address: contractAddr || undefined, abi: WSYN_ABI, functionName: "mintedPerUser",
    args: address ? [address] : undefined,
    chainId: BASE_MAINNET_ID, query: { enabled: enabled && !!address },
  });

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: pendingTxHash });

  useEffect(() => {
    if (isConfirmed && mintStep === "confirming") {
      setMintStep("success");
      if (fbUser) fetchBalance(fbUser);
      refetchSupply();
      refetchUserMinted();
    }
  }, [isConfirmed, mintStep]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchBalance = useCallback(async (user: FbUser) => {
    setBalanceLoading(true);
    setBalanceError("");
    try {
      const res  = await fetch("/api/bridge/balance", { headers: { Authorization: `Bearer ${user.idToken}` } });
      const data = await res.json();
      if (data.success) {
        setBalanceData(data.data);
        setMintAmount(String(data.data.remaining > 0 ? Math.min(data.data.remaining, 10000) : ""));
      } else {
        setBalanceError(data.error ?? "Failed to load balance");
      }
    } catch { setBalanceError("Network error loading balance"); }
    finally  { setBalanceLoading(false); }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const user = await firebaseSignIn(email, password);
      setFbUser(user);
      fetchBalance(user);
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Login failed");
    } finally { setAuthLoading(false); }
  }

  async function handleMint() {
    if (!fbUser || !isConnected || !address || !balanceData) return;
    const amount = parseFloat(mintAmount);
    if (!amount || amount <= 0 || amount > balanceData.remaining) { toast.error("Invalid amount"); return; }

    setMintStep("requesting");
    setMintError("");
    setVoucherMeta(null);
    setPendingTxHash(undefined);

    try {
      const res  = await fetch("/api/bridge/mint", {
        method: "POST",
        headers: { Authorization: `Bearer ${fbUser.idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount, walletAddress: address, chainId: BASE_MAINNET_ID }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Failed to obtain mint voucher");

      const { voucher: v, contractAddress, mintFee, chainId } = data.data as {
        voucher: Voucher; contractAddress: string; mintFee: string; chainId: number;
      };
      setVoucherMeta({ contractAddress, mintFee, chainId });

      if (connectedChain !== BASE_MAINNET_ID) {
        toast.loading("Switching to Base Mainnet…", { id: "chain-switch" });
        await switchChainAsync({ chainId: BASE_MAINNET_ID });
        toast.dismiss("chain-switch");
      }

      setMintStep("submitting");
      const txHash = await writeContractAsync({
        address: contractAddress as `0x${string}`, abi: WSYN_ABI, functionName: "mintWithVoucher",
        args: [
          v.recipient as `0x${string}`, BigInt(v.amount), v.nonce as `0x${string}`,
          BigInt(v.validFrom), BigInt(v.validUntil), v.signature as `0x${string}`,
        ],
        value: BigInt(mintFee ?? "0"), chainId: BASE_MAINNET_ID,
      });

      setPendingTxHash(txHash);
      setMintStep("confirming");
      toast.success("Transaction submitted!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Mint failed";
      setMintError(msg);
      setMintStep("error");
      toast.error(msg.length > 80 ? msg.slice(0, 80) + "…" : msg);
      fetchBalance(fbUser);
    }
  }

  const parsedAmount  = parseFloat(mintAmount) || 0;
  const maxMintable   = balanceData?.remaining ?? 0;
  const amountInvalid = parsedAmount <= 0 || parsedAmount > maxMintable;
  const isWrongChain  = isConnected && connectedChain !== BASE_MAINNET_ID;
  const isBusy        = ["requesting","submitting","confirming"].includes(mintStep) || isConfirming;
  const onChainMintedFmt = onChainMinted
    ? Number(formatUnits(onChainMinted as bigint, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 })
    : "—";

  return (
    <div className="grid lg:grid-cols-[1fr_280px] gap-6 items-start">

      {/* ── Left ────────────────────────────────────────────────────────── */}
      <div className="space-y-4">

        <SupplyMeter
          currentSupply={currentSupply as bigint | undefined}
          isLoading={supplyFetching}
          onRefetch={() => { refetchSupply(); refetchUserMinted(); }}
        />

        <div className="rounded-2xl p-6 space-y-6"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-2)", boxShadow: "var(--shadow-card)" }}>

          {/* ── Login ──────────────────────────────────────────────────── */}
          {!fbUser ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--c-text-1)" }}>Sign in to mint</h2>
                <p className="text-xs text-text-secondary">
                  Use your registered Sysfi account to verify your SYN balance and mint WSYN on-chain.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-3">
                <div>
                  <label className="block text-xs font-mono text-text-secondary mb-1">Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" required
                    className="w-full text-sm outline-none"
                    style={{ background: "var(--bg-input)", border: "1px solid var(--border-1)", borderRadius: "10px", padding: "10px 14px", color: "var(--c-text-1)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-text-secondary mb-1">Password</label>
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required
                    className="w-full text-sm outline-none"
                    style={{ background: "var(--bg-input)", border: "1px solid var(--border-1)", borderRadius: "10px", padding: "10px 14px", color: "var(--c-text-1)" }}
                  />
                </div>

                {authError && (
                  <div className="flex items-center gap-2 rounded-lg px-3 py-2"
                    style={{ background: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.2)" }}>
                    <AlertCircle size={14} className="shrink-0 text-red-400" />
                    <span className="text-xs text-red-400">{authError}</span>
                  </div>
                )}

                <button
                  type="submit" disabled={authLoading}
                  className="w-full flex items-center justify-center py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, var(--neon-blue), var(--neon-purple))",
                    color: "#fff", boxShadow: "0 0 18px rgba(0,212,255,0.25)",
                    opacity: authLoading ? 0.7 : 1,
                  }}
                >
                  {authLoading ? <Loader2 size={16} className="animate-spin" /> : "Sign in"}
                </button>
              </form>
            </div>

          ) : (
            <>
              {/* ── Logged-in header ─────────────────────────────────── */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: "var(--bg-input-g)", color: "var(--neon-green)", border: "1px solid var(--border-g2)" }}>
                    {fbUser.email[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-text-secondary">Logged in as</p>
                    <p className="text-sm font-medium truncate max-w-[200px]" style={{ color: "var(--c-text-1)" }}>
                      {fbUser.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setFbUser(null); setBalanceData(null); setMintStep("idle"); setMintAmount(""); }}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                  style={{ background: "var(--bg-input)", border: "1px solid var(--border-1)", color: "var(--c-text-2)" }}
                >
                  <LogOut size={12} /> Sign out
                </button>
              </div>

              {/* ── Balance ──────────────────────────────────────────── */}
              {balanceLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-text-secondary">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm">Loading balance…</span>
                </div>
              ) : balanceError ? (
                <div className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ background: "rgba(255,60,60,0.07)", border: "1px solid rgba(255,60,60,0.2)" }}>
                  <span className="text-xs text-red-400">{balanceError}</span>
                  <button onClick={() => fetchBalance(fbUser)} className="text-xs underline ml-2"
                    style={{ color: "var(--neon-blue)" }}>Retry</button>
                </div>
              ) : balanceData && (
                <div className="rounded-xl p-4 space-y-1"
                  style={{ background: "var(--bg-input-g)", border: "1px solid var(--border-g1)" }}>
                  <p className="text-[10px] font-mono text-text-secondary uppercase tracking-wider mb-3">SYN Balance</p>

                  {[
                    { label: "Total eligible",    value: `${balanceData.effectiveAmount.toLocaleString()} SYN` },
                    { label: "Already minted",    value: `${balanceData.totalMinted.toLocaleString()} WSYN` },
                    { label: "Minted on-chain",   value: `${onChainMintedFmt} WSYN` },
                    { label: "Available to mint", value: `${balanceData.remaining.toLocaleString()} WSYN`, highlight: true },
                  ].map(({ label, value, highlight }) => (
                    <div key={label} className="flex items-center justify-between py-1.5"
                      style={{ borderBottom: "1px solid var(--border-1)" }}>
                      <span className="text-xs text-text-secondary">{label}</span>
                      <span className="text-sm font-mono font-bold"
                        style={{ color: highlight ? "var(--neon-green)" : "var(--c-text-1)" }}>{value}</span>
                    </div>
                  ))}

                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] font-mono text-text-secondary mb-1">
                      <span>Cap usage</span>
                      <span>{balanceData.totalMinted.toLocaleString()} / {balanceData.cap.toLocaleString()} WSYN</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-input)" }}>
                      <div className="h-full rounded-full transition-all"
                        style={{
                          width:      `${Math.min(100, (balanceData.totalMinted / balanceData.cap) * 100)}%`,
                          background: "linear-gradient(90deg, var(--neon-green), var(--neon-blue))",
                        }} />
                    </div>
                  </div>

                  <button onClick={() => fetchBalance(fbUser)}
                    className="flex items-center gap-1 text-[10px] text-text-secondary hover:text-neon-green transition-colors mt-2">
                    <RefreshCw size={10} /> Refresh
                  </button>
                </div>
              )}

              {/* ── Wallet ───────────────────────────────────────────── */}
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">
                  Receiving Wallet · Base Mainnet
                </p>
                {!isConnected ? (
                  <button onClick={openConnectModal}
                    className="w-full py-3 rounded-xl font-semibold text-sm"
                    style={{ background: "var(--bg-input)", border: "1px solid var(--border-2)", color: "var(--neon-blue)" }}>
                    Connect Wallet
                  </button>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
                    style={{
                      background: isWrongChain ? "rgba(255,200,0,0.06)" : "var(--bg-input)",
                      border: `1px solid ${isWrongChain ? "rgba(255,200,0,0.3)" : "var(--border-1)"}`,
                    }}>
                    <div className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: isWrongChain ? "#ffd700" : "var(--neon-green)", boxShadow: `0 0 6px ${isWrongChain ? "#ffd700" : "var(--neon-green)"}` }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono truncate" style={{ color: "var(--c-text-1)" }}>{address}</p>
                      {isWrongChain && (
                        <p className="text-[10px] text-yellow-400 mt-0.5">Wrong network — will switch to Base Mainnet</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Mint input ───────────────────────────────────────── */}
              {balanceData && balanceData.remaining > 0 && isConnected && (
                <div className="space-y-3">
                  <p className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">Amount to Mint</p>

                  <div className="relative">
                    <input
                      type="number" min={1} max={maxMintable} step={1}
                      value={mintAmount} onChange={e => setMintAmount(e.target.value)}
                      disabled={isBusy} placeholder={`1 – ${maxMintable.toLocaleString()}`}
                      className="w-full text-sm outline-none pr-20"
                      style={{
                        background: "var(--bg-input)",
                        border: `1px solid ${amountInvalid && mintAmount !== "" ? "rgba(255,60,60,0.5)" : "var(--border-g2)"}`,
                        borderRadius: "12px", padding: "12px 14px", color: "var(--c-text-1)",
                      }}
                    />
                    <button type="button" onClick={() => setMintAmount(String(maxMintable))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono px-2 py-1 rounded"
                      style={{ color: "var(--neon-green)", background: "var(--bg-input-g)", border: "1px solid var(--border-g1)" }}>
                      MAX
                    </button>
                  </div>

                  {mintStep === "idle" || mintStep === "error" ? (
                    <button onClick={handleMint} disabled={amountInvalid || !isConnected}
                      className="w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
                      style={{
                        background: amountInvalid || !isConnected
                          ? "var(--bg-input)"
                          : "linear-gradient(135deg, var(--neon-green), var(--neon-blue))",
                        color:     amountInvalid || !isConnected ? "var(--c-text-3)" : "#000",
                        boxShadow: amountInvalid || !isConnected ? "none" : "0 0 24px rgba(0,255,135,0.3)",
                        cursor:    amountInvalid || !isConnected ? "not-allowed" : "pointer",
                      }}>
                      {parsedAmount > 0 ? `Mint ${parsedAmount.toLocaleString()} WSYN` : "Mint WSYN"}
                    </button>
                  ) : (
                    <div className="flex items-center justify-center gap-3 py-3.5 rounded-xl"
                      style={{ background: "var(--bg-input)", border: "1px solid var(--border-1)" }}>
                      <Loader2 size={16} className="animate-spin" style={{ color: "var(--neon-blue)" }} />
                      <span className="text-sm text-text-secondary">
                        {mintStep === "requesting"  && "Preparing voucher…"}
                        {mintStep === "submitting"  && "Confirm in wallet…"}
                        {(mintStep === "confirming" || isConfirming) && "Confirming on-chain…"}
                      </span>
                    </div>
                  )}

                  {mintError && (
                    <div className="flex items-start gap-2 rounded-xl px-4 py-3"
                      style={{ background: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.2)" }}>
                      <AlertCircle size={14} className="shrink-0 text-red-400 mt-0.5" />
                      <span className="text-xs text-red-400">{mintError}</span>
                    </div>
                  )}
                </div>
              )}

              {/* ── Cap reached ──────────────────────────────────────── */}
              {balanceData && balanceData.remaining === 0 && (
                <div className="flex items-center gap-3 rounded-xl px-4 py-4"
                  style={{ background: "var(--bg-input-g)", border: "1px solid var(--border-g2)" }}>
                  <CheckCircle size={18} style={{ color: "var(--neon-green)" }} className="shrink-0" />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--neon-green)" }}>10,000 WSYN fully minted</p>
                    <p className="text-xs text-text-secondary mt-0.5">Maximum reached for this account.</p>
                  </div>
                </div>
              )}

              {/* ── Success ──────────────────────────────────────────── */}
              {mintStep === "success" && pendingTxHash && (
                <div className="rounded-xl px-4 py-4 space-y-2 animate-fade-in"
                  style={{ background: "var(--bg-input-g)", border: "1px solid var(--border-g2)" }}>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} style={{ color: "var(--neon-green)" }} />
                    <span className="text-sm font-semibold" style={{ color: "var(--neon-green)" }}>Mint confirmed!</span>
                  </div>
                  <p className="text-xs text-text-secondary">WSYN tokens sent to your wallet on Base Mainnet.</p>
                  <a href={`${BASE_EXPLORER}/tx/${pendingTxHash}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-mono" style={{ color: "var(--neon-blue)" }}>
                    <ExternalLink size={11} /> View on BaseScan
                  </a>
                  <button onClick={() => { setMintStep("idle"); setPendingTxHash(undefined); setVoucherMeta(null); }}
                    className="text-xs mt-1" style={{ color: "var(--c-text-2)" }}>
                    Mint more →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Right panel ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {[
          {
            title: "You are minting, not claiming",
            desc:  "WSYN is a new on-chain token created when you mint. Your SYN balance proves eligibility — tokens are minted to Base Mainnet.",
            color: "green" as const,
          },
          {
            title: "Admin-verified",
            desc:  "Every mint is signed by the Sysfi admin wallet. A hard 10,000 WSYN lifetime cap per wallet is enforced both on-chain and off-chain.",
            color: "blue" as const,
          },
          {
            title: "Balance source",
            desc:  "Eligibility comes from your registered Network Balance. Points + Balance are combined as fallback if that field is absent.",
            color: "blue" as const,
          },
        ].map(({ title, desc, color }) => (
          <div key={title} className="rounded-xl p-4"
            style={{
              background: color === "green" ? "var(--bg-input-g)" : "var(--bg-input)",
              border:     `1px solid ${color === "green" ? "var(--border-g1)" : "var(--border-1)"}`,
            }}>
            <p className="text-xs font-mono font-bold mb-1.5"
              style={{ color: color === "green" ? "var(--neon-green)" : "var(--neon-blue)" }}>{title}</p>
            <p className="text-xs leading-relaxed text-text-secondary">{desc}</p>
          </div>
        ))}

        {WSYN_CONTRACT && (
          <div className="rounded-xl p-4" style={{ background: "var(--bg-input)", border: "1px solid var(--border-1)" }}>
            <p className="text-[10px] font-mono text-text-secondary uppercase tracking-wider mb-2">Contract · Base Mainnet</p>
            <a href={`${BASE_EXPLORER}/address/${WSYN_CONTRACT}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11px] font-mono break-all" style={{ color: "var(--neon-blue)" }}>
              {WSYN_CONTRACT}
              <ExternalLink size={10} className="shrink-0" />
            </a>
          </div>
        )}

        <div className="rounded-xl p-4 space-y-2" style={{ background: "var(--bg-input)", border: "1px solid var(--border-1)" }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">Token Stats</p>
            <span className="flex items-center gap-1 text-[9px] font-mono" style={{ color: "var(--neon-green)" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--neon-green)" }} />
              Live
            </span>
          </div>
          {[
            { label: "Token",       value: "Wrapped SYN (WSYN)" },
            { label: "Network",     value: "Base Mainnet" },
            { label: "Cap",         value: "10,000 WSYN / account" },
            { label: "Max Supply",  value: "100,000,000 WSYN" },
            {
              label: "Circulating",
              value: currentSupply
                ? `${Number(formatUnits(currentSupply as bigint, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 })} WSYN`
                : "—",
            },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-[11px] text-text-secondary">{label}</span>
              <span className="text-[11px] font-mono" style={{ color: "var(--c-text-1)" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
