"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ProposalInfo } from "@/lib/dao-contracts";

async function fetchProposals(
  chainId: number,
  daoAddress: string,
  status?: string,
): Promise<ProposalInfo[]> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  const res = await fetch(
    `/api/proposals/${chainId}/${daoAddress}?${params.toString()}`,
  );
  if (!res.ok) throw new Error("Failed to fetch proposals");
  const json = await res.json();
  return json.data as ProposalInfo[];
}

export function useProposals(
  chainId: number | undefined,
  daoAddress: string | undefined,
  status?: string,
) {
  return useQuery({
    queryKey: ["proposals", chainId, daoAddress, status],
    queryFn: () => fetchProposals(chainId!, daoAddress!, status),
    enabled: !!chainId && !!daoAddress,
    staleTime: 15_000,
    retry: 2,
  });
}

export function useProposal(
  chainId: number | undefined,
  daoAddress: string | undefined,
  proposalId: number | undefined,
) {
  return useQuery({
    queryKey: ["proposal", chainId, daoAddress, proposalId],
    queryFn: async () => {
      const res = await fetch(`/api/proposals/${chainId}/${daoAddress}/${proposalId}`);
      if (!res.ok) throw new Error("Proposal not found");
      const json = await res.json();
      return json.data as ProposalInfo;
    },
    enabled: !!chainId && !!daoAddress && proposalId !== undefined,
    staleTime: 15_000,
  });
}

export function useUserVote(
  chainId: number | undefined,
  daoAddress: string | undefined,
  proposalId: number | undefined,
  userAddress: string | undefined,
) {
  return useQuery({
    queryKey: ["vote", chainId, daoAddress, proposalId, userAddress],
    queryFn: async () => {
      const res = await fetch(
        `/api/proposals/${chainId}/${daoAddress}/${proposalId}/vote?userAddress=${userAddress}`,
      );
      if (!res.ok) throw new Error("Failed to check vote");
      return res.json() as Promise<{ voted: boolean; data: unknown }>;
    },
    enabled: !!chainId && !!daoAddress && proposalId !== undefined && !!userAddress,
    staleTime: 10_000,
  });
}

export function useRecordVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      chainId: number;
      daoAddress: string;
      proposalId: number;
      userAddress: string;
      vote: number;
      weight?: string;
      txHash?: string;
      votesFor?: string;
      votesAgainst?: string;
      votesAbstain?: string;
      totalVoters?: number;
    }) => {
      const { chainId, daoAddress, proposalId, ...body } = data;
      const res = await fetch(
        `/api/proposals/${chainId}/${daoAddress}/${proposalId}/vote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) throw new Error("Failed to record vote");
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["proposals", variables.chainId, variables.daoAddress],
      });
      queryClient.invalidateQueries({
        queryKey: ["vote", variables.chainId, variables.daoAddress, variables.proposalId],
      });
    },
  });
}

export function useCreateProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<ProposalInfo>) => {
      const { chainId, daoAddress, ...body } = data;
      const res = await fetch(`/api/proposals/${chainId}/${daoAddress}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create proposal");
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["proposals", variables.chainId, variables.daoAddress],
      });
    },
  });
}
