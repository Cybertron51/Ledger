"use client";

/**
 * LEDGER — Auth Context
 *
 * Provides user identity and account balance throughout the app.
 * The cash balance is denominated in USD — the underlying settlement
 * mechanism is an implementation detail hidden from the user.
 *
 * Replace createMockSession() with real auth (Privy, Auth.js, etc.)
 * when connecting to the backend.
 */

import React, { createContext, useContext, useState, useCallback } from "react";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  initials: string;
  /** Available buying power in USD */
  cashBalance: number;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => void;
  updateBalance: (delta: number) => void;
}

// ─────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─────────────────────────────────────────────────────────
// Mock session factory — swap with real auth later
// ─────────────────────────────────────────────────────────

function createMockUser(email: string): User {
  const name = email.split("@")[0].replace(/[._]/g, " ");
  const words = name.split(" ");
  const initials = words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return {
    id: `usr_${Math.random().toString(36).slice(2, 9)}`,
    name: words.map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" "),
    email,
    initials: initials || "?",
    cashBalance: 24_500.0,
  };
}

// ─────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const signIn = useCallback(async (email: string) => {
    // Simulate network latency
    await new Promise((r) => setTimeout(r, 800));
    setUser(createMockUser(email));
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
  }, []);

  const updateBalance = useCallback((delta: number) => {
    setUser((prev) =>
      prev ? { ...prev, cashBalance: Math.max(0, prev.cashBalance + delta) } : prev
    );
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, signIn, signOut, updateBalance }}
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
