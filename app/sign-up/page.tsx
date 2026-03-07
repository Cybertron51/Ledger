"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { SignInModal } from "@/components/auth/SignInModal";

export default function SignUpPage() {
    const router = useRouter();
    const { user, isProfileComplete } = useAuth();
    const [email, setEmail] = useState("");
    const [token, setToken] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [showSignIn, setShowSignIn] = useState(false);
    const [otpSent, setOtpSent] = useState(false);

    // If user is already logged in, redirect them to onboarding
    // (Onboarding will redirect them to portfolio if fully onboarded)
    useEffect(() => {
        if (user) {
            if (isProfileComplete) {
                router.push("/portfolio");
            } else {
                router.push("/onboarding");
            }
        }
    }, [user, isProfileComplete, router]);

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;
        setLoading(true);
        setErrorMsg("");

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    data: { name: email.split("@")[0] },
                },
            });
            if (error) throw error;
            setOtpSent(true);
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to send code.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;
        setLoading(true);
        setErrorMsg("");

        try {
            const { error } = await supabase.auth.verifyOtp({
                email,
                token,
                type: 'email',
            });
            if (error) throw error;
            // The useEffect will handle redirecting when `user` populates
        } catch (err: any) {
            setErrorMsg(err.message || "Invalid or expired code.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleOAuth = async () => {
        if (!supabase) return;
        await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
    };

    return (
        <div className="flex min-h-screen bg-black text-white">
            {/* Left Pane - Visual Graphic Placeholder */}
            <div className="hidden lg:flex flex-1 relative bg-zinc-900 border-r border-zinc-800 items-center justify-center overflow-hidden">
                {/* Dynamic Background Elements */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px]" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px]" />
                </div>

                {/* Decorative holographic card visual (Placeholder for future asset) */}
                <div className="relative z-10 w-80 h-[28rem] rounded-2xl border border-white/10 shadow-2xl flex flex-col items-center justify-center group overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-20 pointer-events-none" />
                    <img src="/mock_jordan.png" alt="Featured Card Asset" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                </div>
            </div>

            {/* Right Pane - Sign Up Form */}
            <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 relative z-10 w-full max-w-2xl mx-auto lg:mx-0">
                <div className="w-full max-w-md mx-auto lg:ml-0">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                        Join <span style={{ color: colors.green }}>tash</span>
                    </h1>
                    <p className="text-zinc-400 text-lg mb-8">
                        The premier portfolio and trading platform for collectors.
                    </p>

                    {!otpSent ? (
                        <form onSubmit={handleSendOtp} className="space-y-4">
                            {errorMsg && (
                                <div
                                    className="rounded-[8px] p-3 text-[13px] font-medium"
                                    style={{
                                        background: "rgba(255, 60, 60, 0.1)",
                                        color: colors.red,
                                        border: `1px solid rgba(255, 60, 60, 0.2)`,
                                    }}
                                >
                                    {errorMsg}
                                </div>
                            )}

                            <input
                                type="email"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-4 px-4 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all font-mono"
                            />

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center space-x-2 py-4 px-6 rounded-xl font-medium transition-colors disabled:opacity-70"
                                style={{ background: colors.green, color: colors.textInverse }}
                            >
                                {loading ? (
                                    <Loader2 size={20} className="animate-spin" />
                                ) : (
                                    <span>Continue with Email</span>
                                )}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtp} className="space-y-4">
                            {errorMsg && (
                                <div
                                    className="rounded-[8px] p-3 text-[13px] font-medium"
                                    style={{
                                        background: "rgba(255, 60, 60, 0.1)",
                                        color: colors.red,
                                        border: `1px solid rgba(255, 60, 60, 0.2)`,
                                    }}
                                >
                                    {errorMsg}
                                </div>
                            )}

                            <div className="text-sm text-zinc-400 mb-2">
                                We sent a 6-digit code to <strong>{email}</strong>.
                            </div>

                            <input
                                type="text"
                                placeholder="000000"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                required
                                maxLength={6}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-4 px-4 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all font-mono text-center tracking-widest text-lg"
                            />

                            <button
                                type="submit"
                                disabled={loading || token.length < 6}
                                className="w-full flex items-center justify-center space-x-2 py-4 px-6 rounded-xl font-medium transition-colors disabled:opacity-70"
                                style={{ background: colors.green, color: colors.textInverse }}
                            >
                                {loading ? (
                                    <Loader2 size={20} className="animate-spin" />
                                ) : (
                                    <span>Verify Code</span>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setOtpSent(false)}
                                className="w-full text-sm text-zinc-500 hover:text-white transition-colors mt-2"
                            >
                                Use a different email
                            </button>
                        </form>
                    )}

                    <div className="my-6 flex items-center">
                        <div className="flex-1 border-t border-zinc-800"></div>
                        <span className="px-4 text-zinc-500 text-sm">OR</span>
                        <div className="flex-1 border-t border-zinc-800"></div>
                    </div>

                    <button
                        onClick={handleGoogleOAuth}
                        className="w-full flex items-center justify-center space-x-3 bg-white text-black py-4 px-6 rounded-xl font-medium hover:bg-zinc-200 transition-colors"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        <span>Continue with Google</span>
                    </button>

                    <p className="mt-8 text-center text-zinc-400">
                        Already have an account?{" "}
                        <button
                            onClick={() => setShowSignIn(true)}
                            className="font-semibold transition-colors hover:text-white"
                            style={{ color: colors.green }}
                        >
                            Sign in
                        </button>
                    </p>

                    <p className="mt-6 text-center text-xs text-zinc-600">
                        By continuing, you agree to tash&apos;s{" "}
                        <span className="text-zinc-400 cursor-pointer hover:text-white transition-colors">
                            Terms of Service
                        </span>{" "}
                        and{" "}
                        <span className="text-zinc-400 cursor-pointer hover:text-white transition-colors">
                            Privacy Policy
                        </span>
                        .
                    </p>
                </div>
            </div>

            {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
        </div>
    );
}
