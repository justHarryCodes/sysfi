"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import Link from "next/link";
import { useDAO } from "@/hooks/useDAO";
import { useProposals } from "@/hooks/useProposals";
import { ProposalCard } from "@/components/dao/ProposalCard";
import { CreateProposalModal } from "@/components/dao/CreateProposalModal";
import { VoteModal } from "@/components/dao/VoteModal";
import type { ProposalInfo } from "@/lib/dao-contracts";

export default function DAODetailPage() {
  const params = useParams();
  const chainId = parseInt(params.chainId as string);
  const daoAddress = (params.daoAddress as string).toLowerCase();
  const { address } = useAccount();

  const { data: dao, isLoading: daoLoading } = useDAO(chainId, daoAddress);
  const { data: proposals, isLoading: proposalsLoading } = useProposals(chainId, daoAddress);

  const [showCreate, setShowCreate] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<ProposalInfo | null>(null);
  const [activeTab, setActiveTab] = useState<"proposals" | "info">("proposals");

  if (daoLoading) {
    return (
      <div className="min-h-screen bg-[#080810] flex items-center justify-center">
        <div className="text-gray-400">Loading DAO...</div>
      </div>
    );
  }

  if (!dao) {
    return (
      <div className="min-h-screen bg-[#080810] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-lg">DAO not found</p>
          <Link href="/dao" className="mt-3 text-blue-400 hover:text-blue-300">
            Back to DAOs
          </Link>
        </div>
      </div>
    );
  }

  const activeProposals = (proposals ?? []).filter((p) => p.status === "active");
  const pastProposals = (proposals ?? []).filter((p) => p.status !== "active");

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      {/* Banner / Header */}
      <div className="border-b border-white/10 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Link
            href="/dao"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-5"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            All DAOs
          </Link>

          <div className="flex items-start gap-5">
            {dao.imageUrl ? (
              <img
                src={dao.imageUrl}
                alt={dao.daoName}
                className="h-20 w-20 rounded-2xl object-cover flex-shrink-0"
              />
            ) : (
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
                {dao.daoName.charAt(0)}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">{dao.daoName}</h1>
                <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 font-medium">
                  {dao.genre}
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-gray-400">
                  {dao.chainName}
                </span>
              </div>

              {dao.offChain?.description && (
                <p className="mt-2 text-gray-400 max-w-2xl">{dao.offChain.description}</p>
              )}

              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <Stat label="Quorum" value={`${dao.quorum}%`} />
                <Stat label="Voting Period" value={`${dao.votingPeriodHours}h`} />
                <Stat label="Timelock" value={`${dao.timelockPeriodHours}h`} />
                <Stat label="Proposals" value={String(proposals?.length ?? 0)} />
              </div>

              {/* Socials */}
              {dao.offChain && (
                <div className="mt-3 flex gap-3">
                  {dao.offChain.website && (
                    <a href={dao.offChain.website} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300">
                      Website
                    </a>
                  )}
                  {dao.offChain.twitter && (
                    <a href={`https://twitter.com/${dao.offChain.twitter}`} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300">
                      Twitter
                    </a>
                  )}
                  {dao.offChain.discord && (
                    <a href={dao.offChain.discord} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300">
                      Discord
                    </a>
                  )}
                  {dao.offChain.telegram && (
                    <a href={`https://t.me/${dao.offChain.telegram}`} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300">
                      Telegram
                    </a>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowCreate(true)}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 transition-colors text-sm"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Proposal
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-white/10">
          {(["proposals", "info"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab
                  ? "border-blue-500 text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              {tab === "proposals" ? `Proposals (${proposals?.length ?? 0})` : "Info"}
            </button>
          ))}
        </div>

        {activeTab === "proposals" && (
          <div className="space-y-6">
            {proposalsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-24 rounded-xl border border-white/10 bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : (proposals ?? []).length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-400">No proposals yet.</p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-3 text-blue-400 hover:text-blue-300 text-sm"
                >
                  Create the first proposal →
                </button>
              </div>
            ) : (
              <>
                {activeProposals.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wide">
                      Active
                    </h3>
                    <div className="space-y-3">
                      {activeProposals.map((p) => (
                        <ProposalCard
                          key={p.proposalId}
                          proposal={p}
                          onClick={() => setSelectedProposal(p)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {pastProposals.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wide">
                      Past
                    </h3>
                    <div className="space-y-3">
                      {pastProposals.map((p) => (
                        <ProposalCard
                          key={p.proposalId}
                          proposal={p}
                          onClick={() => setSelectedProposal(p)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "info" && (
          <div className="space-y-4">
            <InfoRow label="Contract" value={daoAddress} isAddress explorer={dao.explorerUrl} />
            <InfoRow label="Token" value={dao.tokenAddress} isAddress />
            <InfoRow label="Chain" value={dao.chainName} />
            <InfoRow label="Quorum" value={`${dao.quorum}%`} />
            <InfoRow label="Proposal Threshold" value={dao.threshold} />
            <InfoRow label="Voting Period" value={`${dao.votingPeriodHours} hours`} />
            <InfoRow label="Timelock" value={`${dao.timelockPeriodHours} hours`} />
            <InfoRow label="Created" value={dao.createdAtDate ? new Date(dao.createdAtDate).toLocaleDateString() : "—"} />
            {dao.offChain?.creator && (
              <InfoRow label="Creator" value={dao.offChain.creator} isAddress />
            )}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateProposalModal
          daoAddress={daoAddress}
          chainId={chainId}
          onClose={() => setShowCreate(false)}
        />
      )}

      {selectedProposal && selectedProposal.status === "active" && (
        <VoteModal
          proposal={selectedProposal}
          daoAddress={daoAddress}
          chainId={chainId}
          onClose={() => setSelectedProposal(null)}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-500">{label}:</span>{" "}
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}

function InfoRow({
  label,
  value,
  isAddress,
  explorer,
}: {
  label: string;
  value: string;
  isAddress?: boolean;
  explorer?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5">
      <span className="text-gray-400 text-sm">{label}</span>
      {isAddress ? (
        <a
          href={explorer ?? `https://basescan.org/address/${value}`}
          target="_blank"
          rel="noreferrer"
          className="text-blue-400 hover:text-blue-300 font-mono text-sm"
        >
          {value.slice(0, 6)}...{value.slice(-4)}
        </a>
      ) : (
        <span className="text-white text-sm font-medium">{value}</span>
      )}
    </div>
  );
}
