"use client";

/**
 * LEDGER — Auth Context
 *
 * Bridges Privy's auth state into a clean useAuth() hook.
 * The rest of the app never imports from @privy-io/react-auth directly —
 * everything goes through useAuth(), making it easy to swap providers.
 *
 * cashBalance is local state for now. Wire to your database in production:
 *   - On login: fetch user record → set cashBalance
 *   - On trade: PATCH /api/users/:id/balance
 */

import React, { createContext, useContext, useState, useCallback } from "react";
import { usePrivy, type User as PrivyUser } from "@privy-io/react-auth";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  initials: string;
  /** Available buying power in USD — replace with DB value in production */
  cashBalance: number;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  /** Opens Privy's login modal (email OTP + Google) */
  signIn: () => void;
  signOut: () => void;
  updateBalance: (delta: number) => void;
}

// ─────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─────────────────────────────────────────────────────────
// Build our User from Privy's user object
// ─────────────────────────────────────────────────────────

function buildUser(privyUser: PrivyUser, cashBalance: number): User {
  const email =
    privyUser.email?.address ??
    (privyUser.google as { email?: string } | undefined)?.email ??
    "";

  const googleName =
    (privyUser.google as { name?: string } | undefined)?.name ?? "";

  let name: string;
  let initials: string;

  if (googleName) {
    name = googleName;
    const parts = googleName.split(" ");
    initials = parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");
  } else {
    const emailName = email.split("@")[0].replace(/[._]/g, " ");
    const words = emailName.split(" ");
    name = words.map((w) => (w[0]?.toUpperCase() ?? "") + w.slice(1)).join(" ");
    initials = words
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("");
  }

  return {
    id: privyUser.id,
    name: name || email,
    email,
    initials: initials || "?",
    cashBalance,
  };
}

// ─────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: privyUser, authenticated, login, logout } = usePrivy();

  // TODO: replace with value fetched from DB on login
  const [cashBalance, setCashBalance] = useState(24_500.0);

  const user =
    authenticated && privyUser ? buildUser(privyUser, cashBalance) : null;

  const signIn = useCallback(() => {
    login();
  }, [login]);

  const signOut = useCallback(() => {
    logout();
  }, [logout]);

  const updateBalance = useCallback((delta: number) => {
    setCashBalance((prev) => Math.max(0, prev + delta));
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: authenticated && !!user, signIn, signOut, updateBalance }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
