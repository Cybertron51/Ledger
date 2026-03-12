"use client";

/**
 * TASH — Global Providers
 *
 * Wraps the application with our mock AuthProvider and the PortfolioProvider.
 */

import React from "react";
import { AuthProvider } from "@/lib/auth";
import { PortfolioProvider } from "@/lib/portfolio-context";

import { GlobalRouteCheck } from "./GlobalRouteCheck";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <PortfolioProvider>
                <GlobalRouteCheck>
                    {children}
                </GlobalRouteCheck>
            </PortfolioProvider>
        </AuthProvider>
    );
}
