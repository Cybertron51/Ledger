"use client";

/**
 * SignInModal — Branded entry point for sign-in.
 *
 * Hand off to the authentication provider.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";
import { colors } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

interface SignInModalProps {
  onClose: () => void;
}

export function SignInModal({ onClose }: SignInModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setErrorMsg("");

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      onClose();
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to authenticate.");
    } finally {
      setLoading(false);
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Panel */}
      <div
        className="relative w-full max-w-[380px] rounded-[16px] p-6"
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          boxShadow: "0 24px 64px rgba(0,0,0,0.8)",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-[#2A2A2A]"
          style={{ color: colors.textMuted }}
        >
          <X size={15} strokeWidth={2} />
        </button>

        {/* Logo mark */}
        <div
          className="mb-5 flex h-10 w-10 items-center justify-center rounded-[10px]"
          style={{ background: colors.green }}
        >
          <span className="text-[16px] font-black" style={{ color: colors.textInverse }}>
            t
          </span>
        </div>

        <h2
          className="text-[20px] font-bold tracking-tight"
          style={{ color: colors.textPrimary }}
        >
          Sign in to tash
        </h2>
        <p className="mt-1 text-[13px]" style={{ color: colors.textSecondary }}>
          Trade and manage your card portfolio.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          {errorMsg && (
            <div className="rounded-[8px] p-3 text-[12px] font-medium" style={{ background: "rgba(255, 60, 60, 0.1)", color: colors.red, border: `1px solid rgba(255, 60, 60, 0.2)` }}>
              {errorMsg}
            </div>
          )}
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-[10px] border px-4 py-[11px] text-[13px] outline-none transition-colors"
            style={{
              background: "transparent",
              borderColor: colors.borderSubtle,
              color: colors.textPrimary
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-[10px] border px-4 py-[11px] text-[13px] outline-none transition-colors"
            style={{
              background: "transparent",
              borderColor: colors.borderSubtle,
              color: colors.textPrimary
            }}
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-[10px] py-[11px] text-[13px] font-bold transition-all duration-150 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
            style={{ background: colors.green, color: colors.textInverse }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Sign In"}
          </button>
        </form>

        <p className="mt-5 text-center text-[12px]" style={{ color: colors.textMuted }}>
          Don't have an account?{" "}
          <button
            type="button"
            onClick={() => { onClose(); router.push("/sign-up"); }}
            className="font-semibold transition-colors hover:text-white"
            style={{ color: colors.green }}
          >
            Sign Up
          </button>
        </p>

        <p className="mt-4 text-center text-[11px]" style={{ color: colors.textMuted }}>
          By continuing, you agree to tash&apos;s{" "}
          <span style={{ color: colors.textSecondary, cursor: "pointer" }}>Terms of Service</span>
          {" "}and{" "}
          <span style={{ color: colors.textSecondary, cursor: "pointer" }}>Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
