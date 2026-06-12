"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider }                              from "wagmi";
import { QueryClient, QueryClientProvider }           from "@tanstack/react-query";
import { Toaster }                                    from "react-hot-toast";
import { wagmiConfig }                                from "@/lib/wagmi";
import { WalletProvider }                             from "@/context/WalletContext";
import { useTheme }                                   from "@/lib/theme";
import React, { useState }                            from "react";

const mkDark = () =>
  darkTheme({ accentColor: "#00d4ff", accentColorForeground: "#060611", borderRadius: "medium", fontStack: "system", overlayBlur: "small" });

const mkLight = () =>
  lightTheme({ accentColor: "#0070c0", accentColorForeground: "#ffffff", borderRadius: "medium", fontStack: "system", overlayBlur: "small" });

function ThemedRainbowKit({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <RainbowKitProvider theme={theme === "light" ? mkLight() : mkDark()} modalSize="compact">
      {children}
    </RainbowKitProvider>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 10_000, refetchOnWindowFocus: false } } }),
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ThemedRainbowKit>
          <WalletProvider>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background:     "var(--bg-glass)",
                  border:         "1px solid var(--border-2)",
                  color:          "var(--c-text-1)",
                  fontFamily:     "'Outfit', sans-serif",
                  backdropFilter: "blur(20px)",
                  boxShadow:      "var(--shadow-hover)",
                },
                success: { iconTheme: { primary: "var(--neon-green)", secondary: "var(--bg-base)" } },
                error:   { iconTheme: { primary: "#ff2d78",           secondary: "var(--bg-base)" } },
              }}
            />
          </WalletProvider>
        </ThemedRainbowKit>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
