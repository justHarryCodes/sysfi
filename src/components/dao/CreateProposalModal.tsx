"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import toast from "react-hot-toast";
import { DAO_CORE_ABI } from "@/lib/dao-contracts";
import { useCreateProposal } from "@/hooks/useProposals";

interface Props {
  daoAddress: string;
  chainId: number;
  onClose: () => void;
}

type ProposalType = "generic" | "funding";

export function CreateProposalModal({ daoAddress, chainId, onClose }: Props) {
  const { address } = useAccount();
  const createProposal = useCreateProposal();

  const [type, setType] = useState<ProposalType>("generic");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");

  const { writeContractAsync, isPending: isTxPending } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const isLoading = isTxPending || isConfirming;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return toast.error("Connect wallet first");
    if (!title.trim()) return toast.error("Title is required");

    try {
      let hash: `0x${string}`;

      if (type === "funding") {
        if (!amount || !recipient) return toast.error("Amount and recipient required for funding");
        hash = await writeContractAsync({
          address: daoAddress as `0x${string}`,
          abi: DAO_CORE_ABI,
          functionName: "createFundingProposal",
          args: [title, description, BigInt(amount), recipient as `0x${string}`],
        });
      } else {
        hash = await writeContractAsync({
          address: daoAddress as `0x${string}`,
          abi: DAO_CORE_ABI,
          functionName: "createGenericProposal",
          args: [title, description],
        });
      }

      setTxHash(hash);

      await createProposal.mutateAsync({
        daoAddress,
        chainId,
        proposalId: Date.now(),
        title,
        description,
        type,
        proposer: address,
        amount: type === "funding" ? amount : undefined,
        targetAddress: type === "funding" ? recipient : undefined,
        startTime: Math.floor(Date.now() / 1000),
        endTime: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
        txHash: hash,
      });

      toast.success("Proposal created!");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Transaction failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0f0f14] p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-white mb-5">Create Proposal</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            {(["generic", "funding"] as ProposalType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  type === t
                    ? "bg-blue-600 text-white"
                    : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                }`}
              >
                {t === "generic" ? "General" : "Funding"}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Proposal title..."
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your proposal..."
              rows={4}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {type === "funding" && (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Amount (wei)</label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount in wei..."
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Recipient Address</label>
                <input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="0x..."
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Submitting..." : "Submit Proposal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
