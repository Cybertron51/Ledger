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

export interface OpenOrder {
  id: string;
  symbol: string;
  cardName: string;
  grade: number;
  type: "buy" | "sell";
  price: number;
  quantity: number;
  createdAt: string;
  holdingId: string | null;
}

interface PortfolioContextValue {
  holdings: VaultHolding[];
  openOrders: OpenOrder[];
  addHolding: (holding: VaultHolding) => void;
  removeHolding: (id: string) => void;
  updateHolding: (id: string, patch: Partial<VaultHolding>) => void;
  removeOpenOrder: (id: string) => void;
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();

  const [holdings, setHoldings] = useState<VaultHolding[]>([]);
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchHoldings() {
      if (!isAuthenticated || !user) {
        setHoldings([]);
        setOpenOrders([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const { getUserVaultHoldings } = await import("@/lib/db/vault");
        const holdingsData = await getUserVaultHoldings();
        setHoldings(holdingsData);

        // Fetch open orders natively via API
        const { apiGet } = await import("@/lib/api");
        const ordersData = await apiGet<{ orders: OpenOrder[] }>("/api/user/orders");
        if (ordersData?.orders) {
          setOpenOrders(ordersData.orders);
        }
      } catch (err) {
        console.error("Failed to load portfolio", err);
        setHoldings([]);
        setOpenOrders([]);
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

  const removeOpenOrder = useCallback((id: string) => {
    setOpenOrders((prev) => prev.filter((o) => o.id !== id));
  }, []);

  return (
    <PortfolioContext.Provider value={{ holdings, openOrders, addHolding, removeHolding, updateHolding, removeOpenOrder }}>
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
