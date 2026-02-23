"use client";

/**
 * TASH — Auth Context (Mock)
 *
 * A simple mock authentication provider for demonstration purposes.
 * Provides a useAuth() hook that mimics a real backend/wallet connect flow.
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
  cashBalance: number;
  walletAddress: string;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  signIn: () => void;
  signOut: () => void;
  updateBalance: (delta: number) => void;
}

// ─────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const signIn = useCallback(() => {
    // Mock user login
    setUser({
      id: "usr_mock123",
      name: "Demo User",
      email: "demo@example.com",
      initials: "DU",
      cashBalance: 24_500.0,
      walletAddress: "0x1234000000000000000000000000000000005678",
    });
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
  }, []);

  const updateBalance = useCallback((delta: number) => {
    setUser((prev) =>
      prev ? { ...prev, cashBalance: Math.max(0, prev.cashBalance + delta) } : null
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
