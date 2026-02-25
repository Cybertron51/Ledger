"use client";

/**
 * LEDGER — Portfolio Context
 *
 * Global holdings state so TradePanel and the Portfolio page
 * stay in sync. When a buy is confirmed in the TradePanel,
 * addHolding() is called and the portfolio page reflects it
 * immediately without a page reload.
 *
 * In production: hydrate from DB on login, persist on every mutation.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { type VaultHolding } from "@/lib/vault-data";
import { useAuth } from "@/lib/auth";

// ─────────────────────────────────────────────────────────
// Context type
// ─────────────────────────────────────────────────────────

interface PortfolioContextValue {
  holdings: VaultHolding[];
  /** Add a newly purchased card to the portfolio */
  addHolding: (holding: VaultHolding) => void;
  /** Remove a holding by ID (sold / withdrawn) */
  removeHolding: (id: string) => void;
  /** Partial update — e.g. change status to "listed" */
  updateHolding: (id: string, patch: Partial<VaultHolding>) => void;
}

// ─────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

// ─────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();

  // Start with mock vault holdings if not authenticated, otherwise empty until load
  const [holdings, setHoldings] = useState<VaultHolding[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from Supabase when user auth state changes
  useEffect(() => {
    async function fetchHoldings() {
      if (!isAuthenticated || !user) {
        setHoldings([]); // default empty for unauth
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // Note: getUserVaultHoldings is dynamically imported to avoid circular dependencies in context
        const { getUserVaultHoldings } = await import("@/lib/db/vault");
        const data = await getUserVaultHoldings();

        // Also merge any local scanned cards that haven't been synced?
        // For simplicity in the escrow demo, we just trust the DB. 
        setHoldings(data);
      } catch (err) {
        console.error("Failed to load portfolio", err);
        setHoldings([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchHoldings();
  }, [isAuthenticated, user]);

  const addHolding = useCallback((holding: VaultHolding) => {
    setHoldings((prev) => [holding, ...prev]);
  }, []);

  const removeHolding = useCallback((id: string) => {
    setHoldings((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const updateHolding = useCallback((id: string, patch: Partial<VaultHolding>) => {
    setHoldings((prev) =>
      prev.map((h) => (h.id === id ? { ...h, ...patch } : h))
    );
  }, []);

  return (
    <PortfolioContext.Provider value={{ holdings, addHolding, removeHolding, updateHolding }}>
      {children}
    </PortfolioContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────

export function usePortfolio(): PortfolioContextValue {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error("usePortfolio must be used inside <PortfolioProvider>");
  return ctx;
}
