"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider }                  from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster }                         from "react-hot-toast";
import { wagmiConfig }                     from "@/lib/wagmi";
import { WalletProvider }                  from "@/context/WalletContext";
import React, { useState }                 from "react";

const rainbowTheme = darkTheme({
  accentColor:            "#00d4ff",
  accentColorForeground:  "#060611",
  borderRadius:           "medium",
  fontStack:              "system",
  overlayBlur:            "small",
});

// Override modal background for glassmorphism
const customTheme = {
  ...rainbowTheme,
  colors: {
    ...rainbowTheme.colors,
    modalBackground:   "#0d0d1f",
    modalBorder:       "rgba(0,212,255,0.15)",
    connectButtonBackground: "rgba(0,212,255,0.08)",
  },
};

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 10_000, refetchOnWindowFocus: false },
    },
  }));

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={customTheme} modalSize="compact">
          <WalletProvider>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background:  "rgba(13,13,31,0.95)",
                  border:      "1px solid rgba(0,212,255,0.2)",
                  color:       "#e2e8f0",
                  fontFamily:  "'Outfit', sans-serif",
                  backdropFilter: "blur(20px)",
                },
                success: {
                  iconTheme: { primary: "#00ff87", secondary: "#060611" },
                },
                error: {
                  iconTheme: { primary: "#ff2d78", secondary: "#060611" },
                },
              }}
            />
          </WalletProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
