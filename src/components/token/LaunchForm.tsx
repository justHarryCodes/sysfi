"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  Rocket,
  Info,
  Globe,
  Twitter,
  Send,
  MessageSquare,
} from "lucide-react";
import { formatEther, decodeEventLog } from "viem";
import { useChainId } from "wagmi";

import GlassCard from "@/components/ui/GlassCard";
import NeonButton from "@/components/ui/NeonButton";
import ImageUpload from "@/components/ui/ImageUpload";
import { useWallet } from "@/context/WalletContext";
import { useCreateToken, useCreationFee } from "@/hooks/useTokenFactory";
import { getChainMeta } from "@/lib/chains";
import { TOKEN_FACTORY_ABI } from "@/lib/contracts";

type Step = "details" | "media" | "review";

export default function LaunchForm() {
  const router = useRouter();
  const chainId = useChainId();
  const chainMeta = getChainMeta(chainId);
  const { isConnected, isUnsupportedChain, switchChain } = useWallet();

  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [logoData, setLogoData] = useState("");
  const [bannerData, setBannerData] = useState("");
  const [website, setWebsite] = useState("");
  const [twitter, setTwitter] = useState("");
  const [telegram, setTelegram] = useState("");
  const [discord, setDiscord] = useState("");
  const [saving, setSaving] = useState(false);
  const [metaSaved, setMetaSaved] = useState(false);

  const { data: fee } = useCreationFee();

  const { createToken, isPending, isConfirming, isSuccess, receipt, error } =
    useCreateToken();

  const feeNative = fee ? formatEther(fee) : "0.05";

  const detailsValid =
    name.trim().length > 0 &&
    symbol.trim().length > 0 &&
    symbol.trim().length <= 16 &&
    name.trim().length <= 64;

  // ── Save metadata + redirect once receipt is available ───────────────────
  useEffect(() => {
    if (!isSuccess || !receipt || metaSaved) return;

    async function saveAndRedirect() {
      setMetaSaved(true);
      setSaving(true);

      try {
        // Parse TokenCreated event — all three addresses are indexed (in topics)
        let poolAddress: string | null = null;
        let tokenAddress: string | null = null;
        let creatorAddress: string | null = null;

        if (!receipt) return;

        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: TOKEN_FACTORY_ABI,
              data: log.data,
              topics: log.topics,
            });

            if (decoded.eventName === "TokenCreated" && decoded.args) {
              const args = decoded.args as {
                pool: string;
                token: string;
                creator: string;
              };
              poolAddress = args.pool;
              tokenAddress = args.token;
              creatorAddress = args.creator;
              break;
            }
          } catch {
            // log doesn't match TOKEN_FACTORY_ABI — skip
          }
        }

        if (!poolAddress || !tokenAddress) {
          console.warn("Could not parse addresses from receipt logs.");
          toast.success("Token launched! 🚀", { duration: 5000 });
          router.push("/");
          return;
        }

        await fetch("/api/metadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            poolAddress,
            tokenAddress, // ← required by the API
            creatorAddress: creatorAddress ?? "",
            chainId,
            name: name.trim(),
            symbol: symbol.trim().toUpperCase(),
            description: description.trim(),
            ...(logoData && { logoData }), // omit empty strings
            ...(bannerData && { bannerData }),
            ...(website.trim() && { website: website.trim() }),
            ...(twitter.trim() && { twitter: twitter.trim() }),
            ...(telegram.trim() && { telegram: telegram.trim() }),
            ...(discord.trim() && { discord: discord.trim() }),
          }),
        });

        toast.success("Token launched! 🚀", { duration: 5000 });
        router.push("/");
      } catch (err) {
        console.error("Failed to save metadata:", err);
        toast.success("Token launched! 🚀", { duration: 5000 });
        router.push("/"); // still redirect even if metadata save fails
      } finally {
        setSaving(false);
      }
    }

    saveAndRedirect();
  }, [isSuccess, receipt, metaSaved]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error && !isPending && !isConfirming) {
    toast.error(
      (error as Error).message?.slice(0, 100) ?? "Transaction failed",
    );
  }

  async function handleSubmit() {
    if (!detailsValid || !fee || !isConnected || isUnsupportedChain) return;
    createToken(name.trim(), symbol.trim().toUpperCase(), fee);
  }

  const STEPS: { id: Step; label: string }[] = [
    { id: "details", label: "1. Details" },
    { id: "media", label: "2. Media" },
    { id: "review", label: "3. Review" },
  ];

  return (
    <div className="max-w-xl mx-auto">
      {/* Chain indicator */}
      <div
        className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-lg"
        style={{
          background: chainMeta.bgColor,
          border: `1px solid ${chainMeta.color}25`,
        }}
      >
        <Image
          src={chainMeta.iconSrc}
          alt={chainMeta.chain.name}
          width={14}
          height={14}
          className="rounded-full object-contain"
        />
        <span className="text-xs font-mono" style={{ color: chainMeta.color }}>
          Launching on {chainMeta.chain.name}
        </span>
      </div>

      {/* Step tabs */}
      <div
        className="flex gap-1 mb-6 p-1 rounded-xl"
        style={{ background: "rgba(0,0,0,0.3)" }}
      >
        {STEPS.map((s) => (
          <button
            key={s.id}
            onClick={() => setStep(s.id)}
            className="flex-1 py-2 rounded-lg text-xs font-mono transition-all"
            style={
              step === s.id
                ? {
                    background: "rgba(0,212,255,0.12)",
                    border: "1px solid rgba(0,212,255,0.3)",
                    color: "var(--neon-blue)",
                  }
                : { color: "#475569" }
            }
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Step 1 */}
      {step === "details" && (
        <div className="space-y-4 animate-fade-in">
          <GlassCard glow="blue" className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-mono text-text-secondary mb-2 tracking-wider uppercase">
                Token Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. PepeCoin"
                maxLength={64}
                className="input-glass w-full px-4 py-3 rounded-xl font-body text-base"
              />
              <p className="mt-1 text-[10px] font-mono text-text-muted text-right">
                {name.length}/64
              </p>
            </div>

            <div>
              <label className="block text-xs font-mono text-text-secondary mb-2 tracking-wider uppercase">
                Ticker Symbol *
              </label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="PEPE"
                maxLength={16}
                className="input-glass w-full px-4 py-3 rounded-xl font-mono text-base tracking-widest"
              />
              <p className="mt-1 text-[10px] font-mono text-text-muted text-right">
                {symbol.length}/16
              </p>
            </div>

            <div>
              <label className="block text-xs font-mono text-text-secondary mb-2 tracking-wider uppercase">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's the story behind your token?"
                maxLength={500}
                rows={3}
                className="input-glass w-full px-4 py-3 rounded-xl font-body text-sm resize-none"
              />
              <p className="mt-1 text-[10px] font-mono text-text-muted text-right">
                {description.length}/500
              </p>
            </div>
          </GlassCard>

          <NeonButton
            variant="blue"
            size="lg"
            className="w-full"
            disabled={!detailsValid}
            onClick={() => setStep("media")}
          >
            Continue →
          </NeonButton>
        </div>
      )}

      {/* Step 2 */}
      {step === "media" && (
        <div className="space-y-4 animate-fade-in">
          <GlassCard glow="blue" className="p-5 space-y-5">
            <ImageUpload
              type="logo"
              value={logoData}
              onChange={setLogoData}
              label="Token Logo"
            />
            <ImageUpload
              type="banner"
              value={bannerData}
              onChange={setBannerData}
              label="Banner Image"
            />
          </GlassCard>

          <GlassCard className="p-5 space-y-3">
            <p className="text-xs font-mono text-text-secondary uppercase tracking-wider mb-1">
              Social Links{" "}
              <span className="text-text-muted normal-case">(optional)</span>
            </p>

            {[
              {
                icon: Globe,
                placeholder: "https://yourtoken.xyz",
                val: website,
                set: setWebsite,
                label: "Website",
              },
              {
                icon: Twitter,
                placeholder: "https://twitter.com/...",
                val: twitter,
                set: setTwitter,
                label: "Twitter",
              },
              {
                icon: Send,
                placeholder: "https://t.me/...",
                val: telegram,
                set: setTelegram,
                label: "Telegram",
              },
              {
                icon: MessageSquare,
                placeholder: "https://discord.gg/...",
                val: discord,
                set: setDiscord,
                label: "Discord",
              },
            ].map(({ icon: Icon, placeholder, val, set, label }) => (
              <div key={label} className="flex items-center gap-3">
                <Icon size={14} className="text-text-secondary shrink-0" />
                <input
                  type="url"
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  placeholder={placeholder}
                  className="input-glass flex-1 px-3 py-2 rounded-lg font-mono text-xs"
                />
              </div>
            ))}
          </GlassCard>

          <div className="flex gap-3">
            <NeonButton
              variant="ghost"
              size="lg"
              className="flex-1"
              onClick={() => setStep("details")}
            >
              ← Back
            </NeonButton>
            <NeonButton
              variant="blue"
              size="lg"
              className="flex-1"
              onClick={() => setStep("review")}
            >
              Review →
            </NeonButton>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === "review" && (
        <div className="space-y-4 animate-fade-in">
          <GlassCard glow="green" className="overflow-hidden">
            <div className="relative w-full h-28">
              {bannerData ? (
                <img
                  src={bannerData}
                  alt="banner"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full"
                  style={{
                    background: `linear-gradient(135deg, ${chainMeta.bgColor}, rgba(0,255,135,0.08))`,
                  }}
                />
              )}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to bottom, transparent 50%, rgba(13,13,31,0.95))",
                }}
              />
              <div className="absolute -bottom-4 left-4">
                <div
                  className="w-10 h-10 rounded-xl overflow-hidden border-2"
                  style={{ borderColor: "rgba(0,255,135,0.4)" }}
                >
                  {logoData ? (
                    <img
                      src={logoData}
                      alt="logo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center font-mono font-bold text-xs"
                      style={{
                        background: chainMeta.bgColor,
                        color: chainMeta.color,
                      }}
                    >
                      {symbol.slice(0, 2) || "??"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-4 pt-7 pb-4">
              <p className="font-display font-bold text-text-primary">
                {name || "Token Name"}
              </p>
              <p className="font-mono text-sm text-text-secondary mb-2">
                ${symbol || "TKN"}
              </p>
              {description && (
                <p className="text-xs text-text-secondary font-body leading-relaxed">
                  {description}
                </p>
              )}
              <div className="flex gap-3 mt-2">
                {website && (
                  <a
                    href={website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-text-muted hover:text-neon-blue transition-colors"
                  >
                    <Globe size={13} />
                  </a>
                )}
                {twitter && (
                  <a
                    href={twitter}
                    target="_blank"
                    rel="noreferrer"
                    className="text-text-muted hover:text-neon-blue transition-colors"
                  >
                    <Twitter size={13} />
                  </a>
                )}
                {telegram && (
                  <a
                    href={telegram}
                    target="_blank"
                    rel="noreferrer"
                    className="text-text-muted hover:text-neon-blue transition-colors"
                  >
                    <Send size={13} />
                  </a>
                )}
                {discord && (
                  <a
                    href={discord}
                    target="_blank"
                    rel="noreferrer"
                    className="text-text-muted hover:text-neon-blue transition-colors"
                  >
                    <MessageSquare size={13} />
                  </a>
                )}
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-start gap-2 mb-3">
              <Info size={12} className="text-neon-blue mt-0.5 shrink-0" />
              <p className="text-xs text-text-secondary">
                These parameters are fixed for all tokens.
              </p>
            </div>
            <div className="space-y-2">
              {[
                ["Total Supply", "1,000,000,000"],
                ["Pool", "950M (95%)"],
                ["Creator lock", "50M (5%, 60 days)"],
                [
                  "Graduation",
                  `10 ${chainMeta.nativeCurrencyLabel} → Uniswap V3`,
                ],
                ["Trading fee", "0.5% per trade → creator"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="text-text-secondary">{k}</span>
                  <span className="font-mono text-text-primary">{v}</span>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard glow="green" className="p-5">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-text-secondary">Creation fee</span>
              <span
                className="font-mono font-bold text-xl"
                style={{
                  color: "var(--neon-green)",
                  textShadow: "0 0 10px rgba(0,255,135,0.3)",
                }}
              >
                {feeNative} {chainMeta.nativeCurrencyLabel}
              </span>
            </div>

            {!isConnected ? (
              <NeonButton variant="blue" size="lg" className="w-full" disabled>
                Connect Wallet to Launch
              </NeonButton>
            ) : isUnsupportedChain ? (
              <NeonButton
                variant="blue"
                size="lg"
                className="w-full"
                onClick={() => switchChain(chainId)}
              >
                Switch Network
              </NeonButton>
            ) : (
              <NeonButton
                variant="solid-green"
                size="lg"
                className="w-full flex items-center justify-center gap-2"
                onClick={handleSubmit}
                disabled={!detailsValid || !fee}
                loading={isPending || isConfirming || saving}
              >
                <Rocket size={16} />
                {isPending
                  ? "Confirm in wallet…"
                  : isConfirming
                    ? "Deploying…"
                    : saving
                      ? "Saving metadata…"
                      : `Launch on ${chainMeta.chain.name}`}
              </NeonButton>
            )}
          </GlassCard>

          <button
            onClick={() => setStep("media")}
            className="w-full text-xs font-mono text-text-muted hover:text-text-secondary py-2 transition-colors"
          >
            ← Back to Media
          </button>
        </div>
      )}
    </div>
  );
}
