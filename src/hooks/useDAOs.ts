"use client";

import { useQuery } from "@tanstack/react-query";
import { useChainId } from "wagmi";
import type { DAOInfo } from "@/lib/dao-contracts";

async function fetchDAOs(chainId: number): Promise<DAOInfo[]> {
  const res = await fetch(`/api/daos/chain/${chainId}`);
  if (!res.ok) throw new Error("Failed to fetch DAOs");
  const json = await res.json();
  return json.data as DAOInfo[];
}

export function useDAOs() {
  const chainId = useChainId();

  return useQuery({
    queryKey: ["daos", chainId],
    queryFn: () => fetchDAOs(chainId),
    staleTime: 30_000,
    retry: 2,
  });
}

export function useAllDAOs() {
  return useQuery({
    queryKey: ["daos", "all"],
    queryFn: async (): Promise<DAOInfo[]> => {
      const res = await fetch("/api/daos");
      if (!res.ok) throw new Error("Failed to fetch DAOs");
      const json = await res.json();
      return json.data as DAOInfo[];
    },
    staleTime: 30_000,
    retry: 2,
  });
}
