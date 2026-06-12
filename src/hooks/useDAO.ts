"use client";

import { useQuery } from "@tanstack/react-query";
import type { DAOInfo } from "@/lib/dao-contracts";

async function fetchDAO(chainId: number, daoAddress: string): Promise<DAOInfo> {
  const res = await fetch(`/api/daos/${chainId}/${daoAddress}`);
  if (!res.ok) throw new Error("Failed to fetch DAO");
  const json = await res.json();
  return json.data as DAOInfo;
}

export function useDAO(chainId: number | undefined, daoAddress: string | undefined) {
  return useQuery({
    queryKey: ["dao", chainId, daoAddress],
    queryFn: () => fetchDAO(chainId!, daoAddress!),
    enabled: !!chainId && !!daoAddress,
    staleTime: 30_000,
    retry: 2,
  });
}
