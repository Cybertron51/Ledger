"use client";

/**
 * TASH — Auth Context (Mock)
 *
 * A simple mock authentication provider for demonstration purposes.
 * Provides a useAuth() hook that mimics a real backend/wallet connect flow.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";

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
  session: any | null;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    if (!supabase) return;

    async function fetchProfile(userId: string, email: string) {
      if (!supabase) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("name, cash_balance")
        .eq("id", userId)
        .single();

      if (error || !data) {
        console.error("Failed to fetch user profile", error);
        return;
      }

      setUser({
        id: userId,
        name: data.name || "User",
        email: email,
        initials: (data.name || "U")[0].toUpperCase(),
        cashBalance: Number(data.cash_balance),
        walletAddress: "0x0000000000000000000000000000000000000000", // placeholder
      });
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      setSession(initSession);
      if (initSession?.user) {
        fetchProfile(initSession.user.id, initSession.user.email!);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === "SIGNED_IN" && newSession?.user) {
        fetchProfile(newSession.user.id, newSession.user.email!);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(() => { }, []);

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
  }, []);

  const updateBalance = useCallback((delta: number) => {
    // Note: Local optimistic update. Actual balance updates happen server-side via RPC.
    setUser((prev) =>
      prev ? { ...prev, cashBalance: Math.max(0, prev.cashBalance + delta) } : null
    );
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, session, isAuthenticated: !!user, signIn, signOut, updateBalance }}
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
