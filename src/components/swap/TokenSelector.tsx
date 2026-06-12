"use client";

import { useState, useEffect } from "react";
import type { SwapToken } from "@/lib/tokenLists";
import { X } from "lucide-react";

interface Props {
  chainId: number;
  onSelect: (token: SwapToken) => void;
  onClose: () => void;
  exclude?: string;
}

export function TokenSelector({ chainId, onSelect, onClose, exclude }: Props) {
  const [tokens,    setTokens]    = useState<SwapToken[]>([]);
  const [search,    setSearch]    = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const params = new URLSearchParams({ chainId: String(chainId) });
        if (search) params.set("search", search);
        const res  = await fetch(`/api/swap/tokens?${params.toString()}`);
        const json = await res.json();
        const list: SwapToken[] = json.data?.tokens ?? [];
        setTokens(exclude ? list.filter((t) => t.address.toLowerCase() !== exclude.toLowerCase()) : list);
      } finally { setIsLoading(false); }
    };
    setIsLoading(true);
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [chainId, search, exclude]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "var(--overlay)" }} onClick={onClose} />
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
        style={{ background: "var(--bg-modal)", border: "1px solid var(--border-2)", backdropFilter: "blur(24px)", boxShadow: "var(--shadow-hover)" }}
      >
        {/* Header */}
        <div className="p-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--border-1)" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-sm" style={{ color: "var(--neon-blue)" }}>Select Token</h3>
            <button onClick={onClose} className="transition-colors text-text-secondary"
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--neon-blue)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--c-text-2)")}
            ><X size={18} /></button>
          </div>
          <input
            autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, symbol or address…"
            className="w-full rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
            style={{ background: "var(--bg-input)", border: "1px solid var(--border-1)", color: "var(--c-text-1)" }}
            onFocus={(e) => ((e.currentTarget as HTMLInputElement).style.borderColor = "var(--border-3)")}
            onBlur={(e)  => ((e.currentTarget as HTMLInputElement).style.borderColor  = "var(--border-1)")}
          />
        </div>

        {/* Token list */}
        <div className="overflow-y-auto flex-1 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-xs font-mono text-text-secondary">Loading tokens…</div>
          ) : tokens.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-xs font-mono text-text-secondary">No tokens found</div>
          ) : (
            tokens.slice(0, 100).map((token) => (
              <button
                key={token.address} onClick={() => onSelect(token)}
                className="w-full flex items-center gap-3 px-4 py-3 transition-colors"
                style={{ borderBottom: "1px solid var(--border-1)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--bg-input)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
              >
                {token.logoURI ? (
                  <img src={token.logoURI} alt="" className="h-8 w-8 rounded-full flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, var(--neon-blue), var(--neon-green))", color: "var(--bg-base)" }}>
                    {token.symbol.charAt(0)}
                  </div>
                )}
                <div className="flex-1 text-left min-w-0">
                  <div className="font-medium text-sm text-text-primary">{token.symbol}</div>
                  <div className="text-xs font-mono truncate text-text-secondary">{token.name}</div>
                </div>
                {token.isNative && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                    style={{ background: "var(--bg-input-g)", color: "var(--neon-green)", border: "1px solid var(--border-g2)" }}>
                    Native
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
