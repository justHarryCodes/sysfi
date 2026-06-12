"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import toast from "react-hot-toast";
import { DAO_CORE_ABI } from "@/lib/dao-contracts";
import { useRecordVote } from "@/hooks/useProposals";
import type { ProposalInfo } from "@/lib/dao-contracts";

interface Props {
  proposal: ProposalInfo;
  daoAddress: string;
  chainId: number;
  onClose: () => void;
}

const VOTE_OPTIONS = [
  { value: 0, label: "For", color: "bg-green-600 hover:bg-green-500" },
  { value: 1, label: "Against", color: "bg-red-600 hover:bg-red-500" },
  { value: 2, label: "Abstain", color: "bg-gray-600 hover:bg-gray-500" },
];

export function VoteModal({ proposal, daoAddress, chainId, onClose }: Props) {
  const { address } = useAccount();
  const recordVote = useRecordVote();
  const [selected, setSelected] = useState<number | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const { writeContractAsync, isPending: isTxPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });

  const isLoading = isTxPending || isConfirming;

  const handleVote = async () => {
    if (selected === null) return toast.error("Choose a vote option");
    if (!address) return toast.error("Connect wallet first");

    try {
      const hash = await writeContractAsync({
        address: daoAddress as `0x${string}`,
        abi: DAO_CORE_ABI,
        functionName: "vote",
        args: [BigInt(proposal.proposalId), selected],
      });

      setTxHash(hash);

      await recordVote.mutateAsync({
        chainId,
        daoAddress,
        proposalId: proposal.proposalId,
        userAddress: address,
        vote: selected,
        txHash: hash,
      });

      toast.success("Vote cast!");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Vote failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0f0f14] p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-white mb-1">Cast Vote</h2>
        <p className="text-sm text-gray-400 mb-5 line-clamp-2">{proposal.title}</p>

        <div className="space-y-2 mb-5">
          {VOTE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              className={`w-full py-3 rounded-xl font-medium transition-all ${
                selected === opt.value
                  ? `${opt.color} text-white ring-2 ring-white/30`
                  : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleVote}
            disabled={selected === null || isLoading}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Confirming..." : "Submit Vote"}
          </button>
        </div>
      </div>
    </div>
  );
}
