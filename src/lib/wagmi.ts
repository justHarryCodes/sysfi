import { getDefaultConfig }   from "@rainbow-me/rainbowkit";
import { SUPPORTED_CHAINS, TRANSPORTS } from "./chains";

export const wagmiConfig = getDefaultConfig({
  appName:    "Token Launchpad",
  projectId:  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "fb8522debf91ce0b0e479b359969bccc",
  chains:     SUPPORTED_CHAINS as Parameters<typeof getDefaultConfig>[0]["chains"],
  transports: TRANSPORTS,
  ssr:        true,
});

// Re-export for convenience
export { SUPPORTED_CHAINS };
