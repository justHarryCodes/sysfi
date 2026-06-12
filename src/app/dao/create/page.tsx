"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useAccount,
  useChainId,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { formatEther } from "viem";
import toast from "react-hot-toast";
import {
  DAO_FACTORY_ABI,
  getDAOFactoryAddress,
  GENRE_LABELS,
} from "@/lib/dao-contracts";
import ImageUpload from "@/components/ui/ImageUpload";
import {
  Users,
  Globe,
  Twitter,
  MessageSquare,
  Send,
  Settings,
  Coins,
  Zap,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Check,
} from "lucide-react";

const STEPS = [
  { id: 1, label: "Identity",   title: "Give Your DAO an Identity",    subtitle: "A strong name and clear description helps your community find and understand your DAO.", icon: Users    },
  { id: 2, label: "Governance", title: "Define Governance Rules",       subtitle: "Set the parameters that control how proposals are created, voted on, and executed.",    icon: Settings },
  { id: 3, label: "Launch",     title: "Review & Launch",               subtitle: "Choose your payment method, add social links, and deploy your DAO on-chain.",           icon: Zap      },
] as const;

const PAYMENT_METHODS = [
  { value: 0, label: "ETH"   },
  { value: 1, label: "Token" },
];

export default function CreateDAOPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address } = useAccount();
  const chainId = useChainId();
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    daoName:             "",
    imageUrl:            "",
    description:         "",
    website:             "",
    twitter:             "",
    discord:             "",
    telegram:            "",
    tokenAddress:        searchParams.get("tokenAddress") ?? "",
    genre:               2,
    quorum:              "10",
    threshold:           "100",
    votingPeriodHours:   "48",
    timelockPeriodHours: "24",
    paymentMethod:       0,
  });

  const set = (k: string, v: unknown) => setForm((prev) => ({ ...prev, [k]: v }));

  const factoryAddress = getDAOFactoryAddress(chainId);

  const { data: ethFeeRaw } = useReadContract({
    address: factoryAddress ?? undefined,
    abi: DAO_FACTORY_ABI,
    functionName: "ethDaoCreationFee",
    query: { enabled: !!factoryAddress },
  });
  const { data: tokenFeeRaw } = useReadContract({
    address: factoryAddress ?? undefined,
    abi: DAO_FACTORY_ABI,
    functionName: "tokenDaoCreationFee",
    query: { enabled: !!factoryAddress },
  });

  const ethFee   = ethFeeRaw   ? formatEther(ethFeeRaw as bigint)          : null;
  const tokenFee = tokenFeeRaw ? (tokenFeeRaw as bigint).toString()        : null;

  const { writeContractAsync, isPending } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });
  const isLoading = isPending || isConfirming;

  function canContinue() {
    if (step === 1) return form.daoName.trim().length > 0;
    if (step === 2) return form.tokenAddress.trim().length > 0;
    return true;
  }

  function handleContinue() {
    if (step === 1 && !form.daoName.trim())       { toast.error("DAO name is required");                     return; }
    if (step === 2 && !form.tokenAddress.trim())   { toast.error("Governance token address is required");    return; }
    setStep((s) => Math.min(s + 1, 3));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address)        return toast.error("Connect wallet first");
    if (!factoryAddress) return toast.error("DAO factory not deployed on this chain");

    try {
      const value = form.paymentMethod === 0 && ethFeeRaw ? (ethFeeRaw as bigint) : 0n;
      toast.loading("Sending transaction...", { id: "create-dao" });

      const hash = await writeContractAsync({
        address: factoryAddress,
        abi: DAO_FACTORY_ABI,
        functionName: "createDAO",
        args: [
          BigInt(form.quorum), BigInt(form.threshold),
          BigInt(form.votingPeriodHours), BigInt(form.timelockPeriodHours),
          form.tokenAddress as `0x${string}`, form.genre,
          form.imageUrl, form.daoName, form.paymentMethod,
        ],
        value,
      });

      setTxHash(hash);
      toast.loading("Confirming...", { id: "create-dao" });

      await fetch("/api/daos/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          daoAddress: "0x0000000000000000000000000000000000000000",
          chainId, txHash: hash, creator: address,
          offChainData: {
            description: form.description,
            website:  form.website  || null,
            twitter:  form.twitter  || null,
            discord:  form.discord  || null,
            telegram: form.telegram || null,
          },
        }),
      });

      toast.success("DAO launched!", { id: "create-dao" });
      router.push("/dao");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to launch DAO", { id: "create-dao" });
    }
  };

  const selectedGenreName = GENRE_LABELS.find((g) => g.id === form.genre)?.name ?? "COMMUNITY";
  const currentStep = STEPS[step - 1];

  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-display font-bold mb-2"
          style={{ background: "linear-gradient(90deg, var(--neon-blue), var(--neon-green))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Launch a DAO
        </h1>
        <p className="text-sm font-body text-text-secondary">
          Deploy your own decentralized autonomous organization on-chain.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8 max-w-sm">
        {STEPS.map((s, i) => {
          const done   = step > s.id;
          const active = step === s.id;
          return (
            <div key={s.id} className="flex items-center">
              <button type="button" onClick={() => done && setStep(s.id)}
                className="flex items-center gap-2" style={{ cursor: done ? "pointer" : "default" }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold flex-shrink-0 transition-all duration-200"
                  style={
                    done
                      ? { background: "var(--bg-input-g)", border: "1.5px solid var(--border-g3)",  color: "var(--neon-green)" }
                      : active
                      ? { background: "var(--bg-input)",   border: "1.5px solid var(--border-3)",   color: "var(--neon-blue)" }
                      : { background: "transparent",       border: "1.5px solid var(--border-1)",   color: "var(--c-text-muted)" }
                  }>
                  {done ? <Check size={13} /> : s.id}
                </div>
                <span className="text-xs font-mono hidden sm:block"
                  style={{ color: done ? "var(--neon-green)" : active ? "var(--neon-blue)" : "var(--c-text-muted)" }}>
                  {s.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className="w-8 h-px mx-2 flex-shrink-0"
                  style={{ background: step > s.id ? "var(--border-g2)" : "var(--border-1)" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Two-column layout */}
      <form onSubmit={handleSubmit} className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">

        {/* ── Left column ─────────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Step card */}
          <div className="rounded-2xl p-6"
            style={{ background: "var(--bg-glass)", border: "1px solid var(--border-1)", backdropFilter: "blur(20px)", boxShadow: "var(--shadow-card)" }}>

            {/* Step heading */}
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--bg-input)", border: "1px solid var(--border-2)" }}>
                <currentStep.icon size={15} style={{ color: "var(--neon-blue)" }} />
              </div>
              <div>
                <h2 className="text-base font-display font-bold text-text-primary">{currentStep.title}</h2>
              </div>
            </div>
            <p className="text-xs font-body mb-6 ml-11 text-text-secondary">{currentStep.subtitle}</p>

            {/* ── Step 1: Identity ────────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-5">
                <Field label="DAO Name" required>
                  <Input value={form.daoName} onChange={(v) => set("daoName", v)} placeholder="My Awesome DAO" />
                </Field>

                <Field label="Category">
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {GENRE_LABELS.map((g) => (
                      <button key={g.id} type="button" onClick={() => set("genre", g.id)}
                        className="py-2 rounded-lg text-xs font-mono transition-all duration-150"
                        style={form.genre === g.id
                          ? { background: "var(--bg-input)", border: "1px solid var(--border-3)", color: "var(--neon-blue)" }
                          : { background: "transparent",     border: "1px solid var(--border-1)", color: "var(--c-text-2)" }
                        }>
                        {g.name}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="DAO Image">
                  <ImageUpload type="dao" value={form.imageUrl} onChange={(url) => set("imageUrl", url)} />
                </Field>

                <Field label="Description">
                  <textarea
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder="What is your DAO about? What goals does it pursue?"
                    rows={4}
                    className="w-full rounded-xl px-3 py-2.5 text-sm font-body focus:outline-none resize-none"
                    style={{ background: "var(--bg-input)", border: "1px solid var(--border-1)", color: "var(--c-text-1)" }}
                    onFocus={(e) => ((e.currentTarget as HTMLTextAreaElement).style.borderColor = "var(--border-3)")}
                    onBlur={(e)  => ((e.currentTarget as HTMLTextAreaElement).style.borderColor = "var(--border-1)")}
                  />
                </Field>
              </div>
            )}

            {/* ── Step 2: Governance ──────────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-5">
                <Field label="Governance Token Address" required>
                  <Input value={form.tokenAddress} onChange={(v) => set("tokenAddress", v)} placeholder="0x…" mono />
                  {searchParams.get("tokenAddress") && form.tokenAddress === searchParams.get("tokenAddress") && (
                    <p className="text-[11px] font-mono mt-1.5" style={{ color: "var(--neon-blue)" }}>
                      ✦ Pre-filled from your token page
                    </p>
                  )}
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Quorum (%)">
                    <Input type="number" value={form.quorum}              onChange={(v) => set("quorum", v)}              min="1" max="100" />
                  </Field>
                  <Field label="Proposal Threshold">
                    <Input type="number" value={form.threshold}           onChange={(v) => set("threshold", v)}           min="0" />
                  </Field>
                  <Field label="Voting Period (hrs)">
                    <Input type="number" value={form.votingPeriodHours}   onChange={(v) => set("votingPeriodHours", v)}   min="1" />
                  </Field>
                  <Field label="Timelock Period (hrs)">
                    <Input type="number" value={form.timelockPeriodHours} onChange={(v) => set("timelockPeriodHours", v)} min="0" />
                  </Field>
                </div>

                <div className="rounded-xl px-4 py-3 space-y-1.5"
                  style={{ background: "var(--bg-input)", border: "1px solid var(--border-1)" }}>
                  {[
                    ["Quorum",        "Minimum % of total supply that must vote for a proposal to pass."],
                    ["Threshold",     "Minimum tokens a wallet must hold to create a proposal."],
                    ["Voting period", "How long voting stays open after a proposal is created."],
                    ["Timelock",      "Delay between a proposal passing and it being executed."],
                  ].map(([term, def]) => (
                    <p key={term} className="text-[11px] font-mono text-text-muted">
                      <span style={{ color: "var(--neon-blue)" }}>{term}</span>{" — "}{def}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* ── Step 3: Launch ──────────────────────────────────────── */}
            {step === 3 && (
              <div className="space-y-5">
                {/* Payment */}
                <Field label="Pay creation fee with">
                  <div className="flex flex-col gap-2">
                    {PAYMENT_METHODS.map((p) => {
                      const isDisabled = p.value === 1;
                      const isChecked  = form.paymentMethod === p.value;
                      return (
                        <label key={p.value}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150"
                          style={{
                            background: isDisabled ? "transparent" : isChecked ? "var(--bg-input-g)" : "var(--bg-input)",
                            border:     isDisabled ? `1px solid var(--border-1)` : isChecked ? `1px solid var(--border-g2)` : `1px solid var(--border-1)`,
                            cursor:     isDisabled ? "not-allowed" : "pointer",
                            opacity:    isDisabled ? 0.4 : 1,
                          }}>
                          <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ border: isChecked && !isDisabled ? "2px solid var(--neon-green)" : "2px solid var(--border-2)" }}>
                            {isChecked && !isDisabled && (
                              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--neon-green)" }} />
                            )}
                          </div>
                          <input type="radio" name="paymentMethod" value={p.value} checked={isChecked} disabled={isDisabled}
                            onChange={() => !isDisabled && set("paymentMethod", p.value)} className="sr-only" />
                          <span className="text-sm font-mono"
                            style={{ color: isDisabled ? "var(--c-text-muted)" : isChecked ? "var(--neon-green)" : "var(--c-text-2)" }}>
                            {p.label}
                          </span>
                          {isDisabled && (
                            <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded"
                              style={{ background: "var(--bg-input)", color: "var(--c-text-muted)", border: "1px solid var(--border-1)" }}>
                              coming soon
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </Field>

                {/* Fee display */}
                <div className="rounded-xl px-4 py-3"
                  style={{ background: "var(--bg-input-g)", border: "1px solid var(--border-g1)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-text-secondary">
                      {form.paymentMethod === 0 ? "ETH fee" : "Token fee"}
                    </span>
                    <span className="text-sm font-mono font-semibold" style={{ color: "var(--neon-green)" }}>
                      {form.paymentMethod === 0
                        ? ethFee   !== null ? `${ethFee} ETH`         : factoryAddress ? "Loading…" : "—"
                        : tokenFee !== null ? `${tokenFee} tokens`    : factoryAddress ? "Loading…" : "—"}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono mt-1 text-text-muted">
                    Set by the contract · paid automatically on submit
                  </p>
                </div>

                {/* Social links */}
                <div>
                  <p className="text-xs font-mono mb-3 text-text-secondary">
                    Social Links <span className="text-text-muted">(optional)</span>
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Website">
                      <Input value={form.website}  onChange={(v) => set("website",  v)} placeholder="https://…"   icon={<Globe        size={14} />} />
                    </Field>
                    <Field label="Twitter">
                      <Input value={form.twitter}  onChange={(v) => set("twitter",  v)} placeholder="@handle"     icon={<Twitter      size={14} />} />
                    </Field>
                    <Field label="Discord">
                      <Input value={form.discord}  onChange={(v) => set("discord",  v)} placeholder="discord.gg/…" icon={<MessageSquare size={14} />} />
                    </Field>
                    <Field label="Telegram">
                      <Input value={form.telegram} onChange={(v) => set("telegram", v)} placeholder="@handle"     icon={<Send         size={14} />} />
                    </Field>
                  </div>
                </div>

                {/* Chain warning */}
                {!factoryAddress && (
                  <div className="flex items-start gap-3 rounded-xl px-4 py-3"
                    style={{ background: "rgba(255,200,0,0.06)", border: "1px solid rgba(255,200,0,0.2)" }}>
                    <AlertTriangle size={15} style={{ color: "#fbbf24", flexShrink: 0, marginTop: 1 }} />
                    <p className="text-xs font-mono" style={{ color: "#fbbf24" }}>
                      DAO factory not deployed on this chain. Switch to Base or Base Sepolia.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button type="button" onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-mono transition-all duration-150"
                style={{ background: "var(--bg-input)", border: "1px solid var(--border-1)", color: "var(--c-text-2)" }}>
                <ChevronLeft size={15} />Back
              </button>
            )}

            {step < 3 ? (
              <button type="button" onClick={handleContinue}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-150"
                style={{ background: "var(--bg-input)", border: "1px solid var(--border-3)", color: "var(--neon-blue)", boxShadow: "0 0 20px var(--border-1)" }}>
                Continue <ChevronRight size={15} />
              </button>
            ) : (
              <button type="submit" disabled={isLoading || !address || !factoryAddress}
                className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all duration-150"
                style={isLoading || !address || !factoryAddress
                  ? { background: "transparent", border: "1px solid var(--border-g1)", color: "var(--c-text-muted)", cursor: "not-allowed" }
                  : { background: "var(--bg-input-g)", border: "1px solid var(--border-g3)", color: "var(--neon-green)", boxShadow: "0 0 24px var(--border-g1)" }
                }>
                {!address ? "Connect Wallet" : isLoading ? "Launching…" : "Launch DAO"}
              </button>
            )}
          </div>
        </div>

        {/* ── Right column: live preview ───────────────────────────── */}
        <div className="space-y-4 lg:sticky lg:top-8">
          <div className="rounded-2xl p-5"
            style={{ background: "var(--bg-glass)", border: "1px solid var(--border-1)", boxShadow: "var(--shadow-card)" }}>
            <p className="text-[10px] font-mono uppercase tracking-widest mb-4 text-text-muted">Preview</p>

            <div className="flex items-center gap-3 mb-4">
              {form.imageUrl ? (
                <img src={form.imageUrl} alt="" className="h-12 w-12 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, var(--neon-blue), var(--neon-green))", color: "var(--bg-base)" }}>
                  {form.daoName ? form.daoName.charAt(0).toUpperCase() : "?"}
                </div>
              )}
              <div>
                <p className="font-semibold text-sm" style={{ color: form.daoName ? "var(--c-text-1)" : "var(--c-text-muted)" }}>
                  {form.daoName || "DAO Name"}
                </p>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                  style={{ background: "var(--bg-input)", border: "1px solid var(--border-2)", color: "var(--neon-blue)" }}>
                  {selectedGenreName}
                </span>
              </div>
            </div>

            {form.description && (
              <p className="text-xs leading-relaxed mb-4 line-clamp-3 text-text-secondary">{form.description}</p>
            )}

            <div className="space-y-2">
              {[
                { label: "Quorum",    value: `${form.quorum}%`            },
                { label: "Voting",    value: `${form.votingPeriodHours}h`  },
                { label: "Timelock",  value: `${form.timelockPeriodHours}h`},
                { label: "Threshold", value: form.threshold                },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-xs font-mono">
                  <span className="text-text-secondary">{label}</span>
                  <span style={{ color: "var(--neon-blue)" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-5 space-y-3"
            style={{ background: "var(--bg-input-g)", border: "1px solid var(--border-g1)" }}>
            <div className="flex items-center gap-2">
              <Zap size={13} style={{ color: "var(--neon-green)" }} />
              <span className="text-xs font-mono font-bold" style={{ color: "var(--neon-green)" }}>How it works</span>
            </div>
            {[
              "Deploy your DAO smart contract on-chain",
              "Token holders create and vote on proposals",
              "Passed proposals execute after the timelock delay",
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-bold flex-shrink-0 mt-0.5"
                  style={{ background: "var(--bg-input-g)", color: "var(--neon-green)", border: "1px solid var(--border-g2)" }}>
                  {i + 1}
                </div>
                <p className="text-xs leading-relaxed text-text-secondary">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-mono mb-1.5 text-text-secondary">
        {label}
        {required && <span style={{ color: "var(--neon-green)", marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({
  value, onChange, placeholder, type = "text", min, max, mono, icon,
}: {
  value:        string;
  onChange:     (v: string) => void;
  placeholder?: string;
  type?:        string;
  min?:         string;
  max?:         string;
  mono?:        boolean;
  icon?:        React.ReactNode;
}) {
  return (
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">{icon}</div>
      )}
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} min={min} max={max}
        className="w-full rounded-xl py-2.5 text-sm focus:outline-none"
        style={{
          background:    "var(--bg-input)",
          border:        "1px solid var(--border-1)",
          color:         "var(--c-text-1)",
          paddingLeft:   icon ? "2.25rem" : "0.75rem",
          paddingRight:  "0.75rem",
          fontFamily:    mono ? "'Space Mono', monospace" : "'Outfit', sans-serif",
        }}
        onFocus={(e) => ((e.currentTarget as HTMLInputElement).style.borderColor = "var(--border-3)")}
        onBlur={(e)  => ((e.currentTarget as HTMLInputElement).style.borderColor = "var(--border-1)")}
      />
    </div>
  );
}
