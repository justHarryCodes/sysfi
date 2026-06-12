"use client";

import type { ProposalInfo } from "@/lib/dao-contracts";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-500/20 text-green-300 border border-green-500/30",
  passed: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  failed: "bg-red-500/20 text-red-300 border border-red-500/30",
  executed: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
  cancelled: "bg-gray-500/20 text-gray-400 border border-gray-500/30",
};

const TYPE_LABELS: Record<string, string> = {
  generic: "General",
  funding: "Funding",
  protocol_upgrade: "Protocol",
};

function VoteBar({ yes, no, abstain }: { yes: string; no: string; abstain: string }) {
  const total =
    BigInt(yes || "0") + BigInt(no || "0") + BigInt(abstain || "0");
  if (total === 0n) return null;

  const yesPct = Number((BigInt(yes || "0") * 100n) / total);
  const noPct = Number((BigInt(no || "0") * 100n) / total);
  const abstainPct = 100 - yesPct - noPct;

  return (
    <div className="mt-3">
      <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5">
        {yesPct > 0 && (
          <div
            className="bg-green-500 rounded-l-full"
            style={{ width: `${yesPct}%` }}
          />
        )}
        {noPct > 0 && (
          <div
            className="bg-red-500"
            style={{ width: `${noPct}%` }}
          />
        )}
        {abstainPct > 0 && (
          <div
            className="bg-gray-500 rounded-r-full"
            style={{ width: `${abstainPct}%` }}
          />
        )}
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span className="text-green-400">For {yesPct}%</span>
        <span className="text-red-400">Against {noPct}%</span>
        <span>Abstain {abstainPct}%</span>
      </div>
    </div>
  );
}

export function ProposalCard({
  proposal,
  onClick,
}: {
  proposal: ProposalInfo;
  onClick?: () => void;
}) {
  const statusStyle = STATUS_STYLES[proposal.status] ?? STATUS_STYLES.active;
  const isActive = proposal.status === "active";
  const endsIn = isActive
    ? Math.max(0, (proposal.endTime ?? 0) - Math.floor(Date.now() / 1000))
    : null;

  const formatCountdown = (secs: number) => {
    if (secs <= 0) return "Ended";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-white/10 bg-white/5 p-4 hover:border-white/20 hover:bg-white/[0.07] transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">#{proposal.proposalId}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-gray-400">
              {TYPE_LABELS[proposal.type] ?? proposal.type}
            </span>
          </div>
          <h4 className="mt-1 font-medium text-white">{proposal.title}</h4>
          {proposal.description && (
            <p className="mt-1 text-sm text-gray-400 line-clamp-2">{proposal.description}</p>
          )}
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${statusStyle}`}>
          {proposal.status}
        </span>
      </div>

      <VoteBar
        yes={proposal.votesFor}
        no={proposal.votesAgainst}
        abstain={proposal.votesAbstain}
      />

      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>{proposal.totalVoters} voter{proposal.totalVoters !== 1 ? "s" : ""}</span>
        {endsIn !== null && (
          <span className={endsIn > 0 ? "text-yellow-400" : "text-gray-500"}>
            {formatCountdown(endsIn)}
          </span>
        )}
      </div>
    </button>
  );
}
