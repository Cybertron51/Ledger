"use client";

/**
 * LEDGER — Privy + Auth Provider
 *
 * Wraps the entire app with Privy (real auth) and our AuthProvider.
 * Privy handles identity, email OTP, Google OAuth, and embedded wallets.
 * Our AuthProvider bridges Privy's user state into the rest of the app
 * via useAuth() — no component outside this file needs to know about Privy.
 */

import { PrivyProvider } from "@privy-io/react-auth";
import { AuthProvider } from "@/lib/auth";
import { baseSepolia } from "wagmi/chains";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "PRIVY_APP_ID_PLACEHOLDER";

export function PrivyAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        // Only email + Google — no wallet connect UI visible to users
        loginMethods: ["email", "google"],

        appearance: {
          theme: "dark",
          accentColor: "#00C805",       // Ledger green
          showWalletLoginFirst: false,
          logo: undefined,              // add /logo.png once you have one
        },

        // Auto-create an embedded wallet for every user silently
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },

        defaultChain: baseSepolia,
        supportedChains: [baseSepolia],
      }}
    >
      <AuthProvider>
        {children}
      </AuthProvider>
    </PrivyProvider>
  );
}
