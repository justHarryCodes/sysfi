"use client";

import { useState } from "react";
import Link from "next/link";
import { useDAOs } from "@/hooks/useDAOs";
import { DAOCard } from "@/components/dao/DAOCard";
import { GENRE_LABELS } from "@/lib/dao-contracts";
import { Users, Plus } from "lucide-react";

export default function DAOListPage() {
  const { data: daos, isLoading, error } = useDAOs();
  const [search,        setSearch]        = useState("");
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);

  const filtered = (daos ?? []).filter((d) => {
    const matchesSearch = !search || d.daoName.toLowerCase().includes(search.toLowerCase()) || d.offChain?.description?.toLowerCase().includes(search.toLowerCase());
    const matchesGenre  = selectedGenre === null || d.genreId === selectedGenre;
    return matchesSearch && matchesGenre;
  });

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1
            className="text-3xl lg:text-4xl font-display font-bold mb-2"
            style={{ background: "linear-gradient(90deg, var(--neon-blue), var(--neon-green))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            DAOs
          </h1>
          <p className="text-sm font-body text-text-secondary">Discover and join decentralized autonomous organizations.</p>
        </div>

        <Link href="/dao/create"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 flex-shrink-0"
          style={{ background: "linear-gradient(135deg, var(--bg-input-g), transparent)", border: "1px solid var(--border-g3)", color: "var(--neon-green)", boxShadow: "0 0 20px var(--border-g1)" }}>
          <Plus size={15} />Launch DAO
        </Link>
      </div>

      {/* Search + genre filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search DAOs…"
          className="flex-1 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none"
          style={{ background: "var(--bg-input)", border: "1px solid var(--border-1)", color: "var(--c-text-1)" }}
          onFocus={(e) => ((e.currentTarget as HTMLInputElement).style.borderColor = "var(--border-3)")}
          onBlur={(e)  => ((e.currentTarget as HTMLInputElement).style.borderColor  = "var(--border-1)")}
        />
        <div className="flex gap-2 overflow-x-auto pb-1">
          <FilterChip label="All" active={selectedGenre === null} onClick={() => setSelectedGenre(null)} />
          {GENRE_LABELS.map((g) => (
            <FilterChip key={g.id} label={g.name} active={selectedGenre === g.id} onClick={() => setSelectedGenre(selectedGenre === g.id ? null : g.id)} />
          ))}
        </div>
      </div>

      {!isLoading && daos && (
        <p className="text-xs font-mono mb-5 text-text-secondary">
          <span style={{ color: "var(--neon-blue)" }}>{daos.length}</span> total
          {filtered.length !== daos.length && <> · <span style={{ color: "var(--neon-green)" }}>{filtered.length}</span> matching</>}
        </p>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 rounded-2xl animate-pulse" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-1)" }} />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-20 text-sm font-mono" style={{ color: "#f87171" }}>
          Failed to load DAOs. Make sure your wallet is connected.
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="font-mono text-sm mb-4 text-text-secondary">No DAOs found</p>
          <Link href="/dao/create" className="text-sm font-mono transition-colors" style={{ color: "var(--neon-blue)" }}>
            Be the first to launch one →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((dao) => <DAOCard key={`${dao.chainId}-${dao.daoAddress}`} dao={dao} />)}
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex-shrink-0 px-3 py-2 rounded-lg text-xs font-mono transition-all duration-150"
      style={active
        ? { background: "var(--bg-input)",  border: "1px solid var(--border-3)", color: "var(--neon-blue)" }
        : { background: "transparent",      border: "1px solid var(--border-1)", color: "var(--c-text-2)" }
      }
    >{label}</button>
  );
}
