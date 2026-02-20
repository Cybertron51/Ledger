import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Privy uses styled-components which needs to be transpiled for Next.js
  transpilePackages: ["@privy-io/react-auth"],
  images: {
    remotePatterns: [
      {
        // Pokémon TCG API — official card artwork
        protocol: "https",
        hostname: "images.pokemontcg.io",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
