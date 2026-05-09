"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { LAUNCH_POOL_ABI, ERC20_ABI }                                        from "@/lib/contracts";
import { applySlippage }                                                      from "@/lib/utils";

// ─── Read: full pool snapshot ─────────────────────────────────────────────────
export function usePoolInfo(poolAddr: `0x${string}` | undefined) {
  return useReadContract({
    address: poolAddr,
    abi:     LAUNCH_POOL_ABI,
    functionName: "poolInfo",
    query:   { enabled: !!poolAddr, refetchInterval: 5_000 },
  });
}

// ─── Read: quote buy ──────────────────────────────────────────────────────────
export function useQuoteBuy(
  poolAddr: `0x${string}` | undefined,
  ethIn:    bigint
) {
  return useReadContract({
    address: poolAddr,
    abi:     LAUNCH_POOL_ABI,
    functionName: "quoteBuy",
    args:    [ethIn],
    query:   { enabled: !!poolAddr && ethIn > 0n, refetchInterval: 3_000 },
  });
}

// ─── Read: quote sell ─────────────────────────────────────────────────────────
export function useQuoteSell(
  poolAddr:    `0x${string}` | undefined,
  tokenAmount: bigint
) {
  return useReadContract({
    address: poolAddr,
    abi:     LAUNCH_POOL_ABI,
    functionName: "quoteSell",
    args:    [tokenAmount],
    query:   { enabled: !!poolAddr && tokenAmount > 0n, refetchInterval: 3_000 },
  });
}

// ─── Read: token balance ──────────────────────────────────────────────────────
export function useTokenBalance(
  tokenAddr: `0x${string}` | undefined,
  userAddr:  `0x${string}` | undefined
) {
  return useReadContract({
    address: tokenAddr,
    abi:     ERC20_ABI,
    functionName: "balanceOf",
    args:    userAddr ? [userAddr] : undefined,
    query:   { enabled: !!tokenAddr && !!userAddr, refetchInterval: 5_000 },
  });
}

// ─── Read: token allowance ────────────────────────────────────────────────────
export function useTokenAllowance(
  tokenAddr:  `0x${string}` | undefined,
  userAddr:   `0x${string}` | undefined,
  spenderAddr:`0x${string}` | undefined
) {
  return useReadContract({
    address: tokenAddr,
    abi:     ERC20_ABI,
    functionName: "allowance",
    args:    userAddr && spenderAddr ? [userAddr, spenderAddr] : undefined,
    query:   { enabled: !!tokenAddr && !!userAddr && !!spenderAddr },
  });
}

// ─── Write: approve token ─────────────────────────────────────────────────────
export function useApproveToken() {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess }   = useWaitForTransactionReceipt({ hash });

  const approve = (
    tokenAddr:   `0x${string}`,
    spenderAddr: `0x${string}`,
    amount:      bigint
  ) => {
    writeContract({
      address: tokenAddr,
      abi:     ERC20_ABI,
      functionName: "approve",
      args:    [spenderAddr, amount],
    });
  };

  return { approve, hash, isPending, isConfirming, isSuccess };
}

// ─── Write: buy tokens ────────────────────────────────────────────────────────
export function useBuyTokens() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess }          = useWaitForTransactionReceipt({ hash });

  const buy = (
    poolAddr:    `0x${string}`,
    ethValue:    bigint,
    minTokensOut:bigint,
    slippageBps: number = 200
  ) => {
    const minOut = applySlippage(minTokensOut, slippageBps);
    writeContract({
      address: poolAddr,
      abi:     LAUNCH_POOL_ABI,
      functionName: "buy",
      args:    [minOut],
      value:   ethValue,
    });
  };

  return { buy, hash, isPending, isConfirming, isSuccess, error };
}

// ─── Write: sell tokens ───────────────────────────────────────────────────────
export function useSellTokens() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess }          = useWaitForTransactionReceipt({ hash });

  const sell = (
    poolAddr:    `0x${string}`,
    tokenAmount: bigint,
    minETHOut:   bigint,
    slippageBps: number = 200
  ) => {
    const minOut = applySlippage(minETHOut, slippageBps);
    writeContract({
      address: poolAddr,
      abi:     LAUNCH_POOL_ABI,
      functionName: "sell",
      args:    [tokenAmount, minOut],
    });
  };

  return { sell, hash, isPending, isConfirming, isSuccess, error };
}

// ─── Write: claim fees ────────────────────────────────────────────────────────
export function useClaimFees(poolAddr: `0x${string}` | undefined) {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isSuccess }                            = useWaitForTransactionReceipt({ hash });

  const claimFees = () => {
    if (!poolAddr) return;
    writeContract({ address: poolAddr, abi: LAUNCH_POOL_ABI, functionName: "claimFees" });
  };

  return { claimFees, hash, isPending, isSuccess };
}

// ─── Write: claim locked tokens ───────────────────────────────────────────────
export function useClaimLocked(poolAddr: `0x${string}` | undefined) {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isSuccess }                            = useWaitForTransactionReceipt({ hash });

  const claimLocked = () => {
    if (!poolAddr) return;
    writeContract({ address: poolAddr, abi: LAUNCH_POOL_ABI, functionName: "claimLockedTokens" });
  };

  return { claimLocked, hash, isPending, isSuccess };
}
