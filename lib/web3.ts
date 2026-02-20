/**
 * LEDGER — Web3 Configuration
 *
 * Wagmi + RainbowKit config targeting Base mainnet with Base Sepolia as testnet.
 * Uses WalletConnect v2 for mobile wallet support.
 *
 * Required env vars:
 *   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID  — from https://cloud.walletconnect.com
 *   NEXT_PUBLIC_ALCHEMY_API_KEY           — from https://alchemy.com (optional, falls back to public RPC)
 */

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { base, baseSepolia } from "wagmi/chains";
import { http } from "wagmi";

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "ledger-dev-placeholder";

const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

export const wagmiConfig = getDefaultConfig({
  appName: "Ledger — Trading Card Exchange",
  projectId,
  chains: [base, baseSepolia],
  transports: {
    [base.id]: http(
      alchemyKey
        ? `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`
        : "https://mainnet.base.org"
    ),
    [baseSepolia.id]: http(
      alchemyKey
        ? `https://base-sepolia.g.alchemy.com/v2/${alchemyKey}`
        : "https://sepolia.base.org"
    ),
  },
  ssr: true,
});

/** Shortened wallet address for display: 0x1234…5678 */
export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
