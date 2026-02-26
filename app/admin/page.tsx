"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { colors, layout } from "@/lib/theme";
import { Loader2, Check } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { SignInModal } from "@/components/auth/SignInModal";

export default function AdminPage() {
    const { isAuthenticated } = useAuth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [shippedItems, setShippedItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showSignIn, setShowSignIn] = useState(false);

    useEffect(() => {
        async function fetchShipped() {
            setIsLoading(true);
            try {
                const data = await apiGet<any[]>("/api/admin/approve");
                setShippedItems(data || []);
            } catch {
                setShippedItems([]);
            }
            setIsLoading(false);
        }

        if (isAuthenticated) fetchShipped();
        else setIsLoading(false);
    }, [isAuthenticated]);

    async function approveItem(id: string) {
        // Optimistic UI
        setShippedItems((prev) => prev.filter((item) => item.id !== id));

        try {
            await apiPatch("/api/admin/approve", { holdingId: id });
        } catch (err) {
            console.error("Failed to approve:", err);
        }
    }

    if (!isAuthenticated && !isLoading) {
        return (
            <div
                className="flex flex-col items-center justify-center gap-4"
                style={{ minHeight: `calc(100dvh - ${layout.chromeHeight})`, background: colors.background }}
            >
                <div style={{ padding: 32, borderRadius: 16, border: `1px solid ${colors.border}`, background: colors.surfaceOverlay, textAlign: "center", maxWidth: 400 }}>
                    <h2 style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Admin Access Required</h2>
                    <p style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 24 }}>You must be logged in to access the admin dashboard.</p>
                    <button
                        onClick={() => setShowSignIn(true)}
                        style={{ width: "100%", background: colors.green, color: colors.background, padding: "12px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, transition: "transform 0.15s" }}
                    >
                        Sign In
                    </button>
                </div>
                {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
            </div>
        );
    }

    return (
        <div style={{ minHeight: `calc(100dvh - ${layout.chromeHeight})`, background: colors.background, padding: 32 }}>
            <div style={{ maxWidth: 800, margin: "0 auto" }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.textPrimary, marginBottom: 8 }}>
                    Intake Administration
                </h1>
                <p style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 32 }}>
                    Approve physical assets that have been received via mail to immediately grant digital trading rights to the owner.
                </p>

                {isLoading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
                        <Loader2 size={24} style={{ color: colors.textMuted, animation: "spin 1s linear infinite" }} />
                    </div>
                ) : shippedItems.length === 0 ? (
                    <div style={{ padding: 48, textAlign: "center", background: colors.surfaceOverlay, border: `1px dashed ${colors.border}`, borderRadius: 16 }}>
                        <p style={{ fontSize: 14, color: colors.textMuted, fontWeight: 500 }}>No shipped items pending approval.</p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {shippedItems.map((item) => (
                            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 16, background: colors.surfaceOverlay, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 16 }}>

                                {/* Image */}
                                <div style={{ width: 60, height: 84, borderRadius: 6, background: colors.surface, flexShrink: 0, overflow: "hidden", border: `1px solid ${colors.borderSubtle}` }}>
                                    {item.image_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={item.image_url} alt="card" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : null}
                                </div>

                                {/* Details */}
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                        <span style={{ fontSize: 15, fontWeight: 700, color: colors.textPrimary }}>{item.symbol}</span>
                                        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: item.status === "shipped" ? "rgba(245,200,66,0.15)" : "rgba(245,130,66,0.15)", color: item.status === "shipped" ? "#F5C842" : "#F58242", textTransform: "uppercase" }}>
                                            {item.status === "shipped" ? "Shipped" : "Pending"}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 2 }}>
                                        Owner: <span style={{ color: colors.textPrimary, fontWeight: 500 }}>{item.profiles?.name || item.profiles?.email || "Unknown"}</span>
                                    </p>
                                    <p style={{ fontSize: 13, color: colors.textSecondary }}>
                                        Acquisition Price: <span style={{ color: colors.textPrimary, fontWeight: 500 }}>{formatCurrency(Number(item.acquisition_price))}</span>
                                    </p>
                                </div>

                                {/* Actions */}
                                <button
                                    onClick={() => approveItem(item.id)}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6,
                                        padding: "10px 16px",
                                        borderRadius: 8,
                                        background: colors.green,
                                        color: colors.textInverse,
                                        border: "none",
                                        fontWeight: 700,
                                        fontSize: 13,
                                        cursor: "pointer",
                                        transition: "transform 0.1s",
                                    }}
                                    onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
                                    onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                                >
                                    <Check size={14} strokeWidth={3} />
                                    Approve & Vault
                                </button>

                            </div>
                        ))}
                    </div>
                )}
            </div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
