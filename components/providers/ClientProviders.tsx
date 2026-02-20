"use client";

/**
 * ClientProviders — dynamically loads PrivyAuthProvider client-side only.
 *
 * This prevents styled-components (a Privy dependency) from running
 * during Next.js static generation, which would cause a React SSR error.
 */

import dynamic from "next/dynamic";
import React from "react";

const PrivyAuthProvider = dynamic(
  () => import("./PrivyAuthProvider").then((m) => m.PrivyAuthProvider),
  { ssr: false }
);

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return <PrivyAuthProvider>{children}</PrivyAuthProvider>;
}
