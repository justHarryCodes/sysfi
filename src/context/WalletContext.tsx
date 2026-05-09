"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useAccount, useBalance, useChainId, useSwitchChain } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { getChainMeta, SUPPORTED_CHAIN_IDS } from "@/lib/chains";

interface WalletContextType {
  address:          `0x${string}` | undefined;
  isConnected:      boolean;
  isConnecting:     boolean;
  chainId:          number;
  chainMeta:        ReturnType<typeof getChainMeta>;
  isUnsupportedChain: boolean;
  balance:          bigint | undefined;
  balanceFormatted: string;
  switchChain:      (id: number) => void;
  supportedChainIds: number[];
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected, isConnecting } = useAccount();
  const chainId = useChainId();
  const { switchChain: wagmiSwitch } = useSwitchChain();

  const { data: balanceData } = useBalance({
    address,
    query: { enabled: !!address },
  });

  const isUnsupportedChain = isConnected && !SUPPORTED_CHAIN_IDS.includes(chainId);
  const chainMeta = getChainMeta(chainId);

  const balanceFormatted = useMemo(() => {
    if (!balanceData) return "0.0000";
    return parseFloat(balanceData.formatted).toLocaleString("en-US", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    });
  }, [balanceData]);

  const switchChain = (id: number) => wagmiSwitch({ chainId: id });

  return (
    <WalletContext.Provider value={{
      address,
      isConnected,
      isConnecting,
      chainId: chainId ?? baseSepolia.id,
      chainMeta,
      isUnsupportedChain,
      balance:          balanceData?.value,
      balanceFormatted,
      switchChain,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be inside WalletProvider");
  return ctx;
}
