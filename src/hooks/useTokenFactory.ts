"use client";

import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useChainId } from "wagmi";
import { getContracts } from "@/lib/chains";
import { TOKEN_FACTORY_ABI } from "@/lib/contracts";

export interface TokenInfo {
  token: `0x${string}`;
  pool: `0x${string}`;
  creator: `0x${string}`;
  createdAt: bigint;
}

function useFactoryAddr() {
  const chainId = useChainId();
  return getContracts(chainId).TOKEN_FACTORY;
}

// ─── Read: creation fee ───────────────────────────────────────────────────────
export function useCreationFee() {
  const addr = useFactoryAddr();
  return useReadContract({
    address: addr,
    abi: TOKEN_FACTORY_ABI,
    functionName: "creationFee",
  });
}

// ─── Read: total tokens ───────────────────────────────────────────────────────
export function useTotalTokens() {
  const addr = useFactoryAddr();
  return useReadContract({
    address: addr,
    abi: TOKEN_FACTORY_ABI,
    functionName: "totalTokens",
  });
}

// ─── Read: paginated list ─────────────────────────────────────────────────────
export function useTokensPaginated(start: number, count: number) {
  const addr = useFactoryAddr();
  return useReadContract({
    address: addr,
    abi: TOKEN_FACTORY_ABI,
    functionName: "getTokensPaginated",
    args: [BigInt(start), BigInt(count)],
    query: { enabled: count > 0 },
  });
}

// ─── Read: single info ────────────────────────────────────────────────────────
export function useTokenInfo(index: number) {
  const addr = useFactoryAddr();
  return useReadContract({
    address: addr,
    abi: TOKEN_FACTORY_ABI,
    functionName: "getTokenInfo",
    args: [BigInt(index)],
    query: { enabled: index >= 0 },
  });
}

// ─── Read: can graduate ───────────────────────────────────────────────────────
export function useCanGraduate(poolAddr: `0x${string}` | undefined) {
  const addr = useFactoryAddr();
  return useReadContract({
    address: addr,
    abi: TOKEN_FACTORY_ABI,
    functionName: "canGraduate",
    args: poolAddr ? [poolAddr] : undefined,
    query: { enabled: !!poolAddr },
  });
}

// ─── Read: pending refund ─────────────────────────────────────────────────────
export function usePendingRefund(userAddr: `0x${string}` | undefined) {
  const addr = useFactoryAddr();
  return useReadContract({
    address: addr,
    abi: TOKEN_FACTORY_ABI,
    functionName: "pendingRefunds",
    args: userAddr ? [userAddr] : undefined,
    query: { enabled: !!userAddr },
  });
}

// ─── Write: create token ──────────────────────────────────────────────────────
export function useCreateToken() {
  const addr = useFactoryAddr();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const {
    isLoading: isConfirming,
    isSuccess,
    data: receipt, // ← expose receipt so LaunchForm can parse the pool address
  } = useWaitForTransactionReceipt({ hash });

  const createToken = (name: string, symbol: string, fee: bigint, extra = 0n) =>
    writeContract({
      address: addr,
      abi: TOKEN_FACTORY_ABI,
      functionName: "createToken",
      args: [name, symbol],
      value: fee + extra,
    });

  return {
    createToken,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    receipt,
    error,
  };
}

// ─── Write: claim refund ──────────────────────────────────────────────────────
export function useClaimRefund() {
  const addr = useFactoryAddr();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });
  const claimRefund = () =>
    writeContract({
      address: addr,
      abi: TOKEN_FACTORY_ABI,
      functionName: "claimRefund",
    });
  return { claimRefund, hash, isPending, isSuccess };
}
