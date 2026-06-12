"use client";

import Link from "next/link";
import type { DAOInfo } from "@/lib/dao-contracts";

export function DAOCard({ dao }: { dao: DAOInfo }) {
  return (
    <Link
      href={`/dao/${dao.chainId}/${dao.daoAddress}`}
      className="group block rounded-2xl p-5 transition-all duration-200"
      style={{ background: "var(--bg-glass)", border: "1px solid var(--border-1)", boxShadow: "var(--shadow-card)" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border-3)";
        (e.currentTarget as HTMLAnchorElement).style.boxShadow   = "var(--shadow-hover)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border-1)";
        (e.currentTarget as HTMLAnchorElement).style.boxShadow   = "var(--shadow-card)";
      }}
    >
      <div className="flex items-start gap-4">
        {dao.imageUrl ? (
          <img src={dao.imageUrl} alt={dao.daoName} className="h-12 w-12 rounded-full object-cover flex-shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <div className="h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: "linear-gradient(135deg, var(--neon-blue), var(--neon-green))", color: "var(--bg-base)" }}>
            {dao.daoName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-semibold truncate transition-colors text-text-primary" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {dao.daoName}
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border-1)", color: "var(--neon-blue)" }}>
              {dao.genre}
            </span>
          </div>

          {dao.offChain?.description && (
            <p className="text-xs leading-relaxed line-clamp-2 text-text-secondary">{dao.offChain.description}</p>
          )}

          <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-mono text-text-secondary">
            {[
              { label: "Quorum",   value: `${dao.quorum}%`             },
              { label: "Voting",   value: `${dao.votingPeriodHours}h`  },
              { label: "Timelock", value: `${dao.timelockPeriodHours}h`},
            ].map(({ label, value }) => (
              <span key={label}>
                {label} <span style={{ color: "var(--neon-blue)" }}>{value}</span>
              </span>
            ))}
            <span className="text-text-muted">{dao.chainName}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
