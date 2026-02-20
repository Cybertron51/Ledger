"use client";

/**
 * Web3Provider — Client-side wrapper for RainbowKit + Wagmi + TanStack Query.
 *
 * Must be a client component ("use client") and wrap the entire app tree.
 * RainbowKit's built-in dark theme is overridden to match Ledger's design system.
 */

import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "@/lib/web3";
import { colors } from "@/lib/theme";

import "@rainbow-me/rainbowkit/styles.css";

const queryClient = new QueryClient();

/** Ledger-branded RainbowKit theme override */
const ledgerTheme = darkTheme({
  accentColor: colors.green,
  accentColorForeground: colors.textInverse,
  borderRadius: "medium",
  fontStack: "system",
  overlayBlur: "small",
});

// Further override specific tokens to match Ledger's exact palette
ledgerTheme.colors.modalBackground = colors.surface;
ledgerTheme.colors.modalBorder = colors.border;
ledgerTheme.colors.menuItemBackground = colors.surfaceRaised;
ledgerTheme.colors.profileForeground = colors.surfaceRaised;
ledgerTheme.colors.selectedOptionBorder = colors.green;
ledgerTheme.colors.connectButtonBackground = colors.surface;
ledgerTheme.colors.connectButtonText = colors.textPrimary;

interface Web3ProviderProps {
  children: React.ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={ledgerTheme} modalSize="compact">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
