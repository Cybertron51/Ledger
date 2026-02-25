"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Gamepad2, TrendingUp, Search, UserCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { apiPatch } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function OnboardingPage() {
    const router = useRouter();
    const { session, user } = useAuth();
    const [step, setStep] = useState(1);

    // Form State
    const [username, setUsername] = useState("");
    const [favoriteTcgs, setFavoriteTcgs] = useState<string[]>([]);
    const [primaryGoal, setPrimaryGoal] = useState("");

    // UI State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // If user is already fully onboarded, redirect them away
    useEffect(() => {
        if (user?.username && user?.favoriteTcgs?.length > 0 && user?.primaryGoal) {
            router.push("/portfolio");
        }
    }, [user, router]);

    // If not logged in and not on step 1, force step 1
    useEffect(() => {
        if (!session && step > 1) {
            setStep(1);
        } else if (session && step === 1) {
            // Auto-advance if they just logged in
            setStep(2);
        }
    }, [session, step]);

    const handleLogin = async () => {
        if (!supabase) return;
        await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/onboarding`,
            },
        });
    };

    const toggleTcg = (tcg: string) => {
        setFavoriteTcgs(prev =>
            prev.includes(tcg)
                ? prev.filter(t => t !== tcg)
                : [...prev, tcg]
        );
    };

    const handleComplete = async () => {
        if (!session?.user?.id) return;

        setIsSubmitting(true);
        setError(null);

        try {
            await apiPatch("/api/user/profile", {
                username,
                favorite_tcgs: favoriteTcgs,
                primary_goal: primaryGoal,
            });

            // Success - redirect to dashboard/portfolio
            router.push("/portfolio");
            router.refresh();
        } catch (err: unknown) {
            console.error(err);
            const msg = err instanceof Error ? err.message : "";
            if (msg.includes("23505") || msg.includes("already taken")) {
                setError("That username is already taken. Please choose another.");
            } else {
                setError("Failed to save profile. Please try again.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const nextStep = () => {
        if (step === 2 && !username.trim()) {
            setError("Please enter a username.");
            return;
        }
        if (step === 3 && favoriteTcgs.length === 0) {
            setError("Please select at least one TCG.");
            return;
        }
        setError(null);
        setStep(s => s + 1);
    };

    const prevStep = () => {
        setError(null);
        setStep(s => s - 1);
    };

    return (
        <div className="min-h-screen bg-black text-white flex">
            {/* Left Pane - Form/Content */}
            <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 relative z-10 w-full max-w-2xl mx-auto lg:mx-0">

                {/* Progress Dots */}
                {step > 1 && (
                    <div className="absolute top-12 left-8 sm:left-16 lg:left-24 flex items-center space-x-2">
                        {[2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className={`h-1.5 rounded-full transition-all duration-300 ${step >= i ? "w-8 bg-blue-500" : "w-4 bg-zinc-800"
                                    }`}
                            />
                        ))}
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="space-y-8"
                        >
                            <div>
                                <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                                    Welcome to <span className="text-blue-500">tash</span>
                                </h1>
                                <p className="text-zinc-400 text-lg">
                                    The premier portfolio and trading platform for collectors. Sign in to begin your journey.
                                </p>
                            </div>

                            <button
                                onClick={handleLogin}
                                className="w-full flex items-center justify-center space-x-3 bg-white text-black py-4 px-6 rounded-xl font-medium hover:bg-zinc-200 transition-colors"
                            >
                                <svg className="w-6 h-6" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                <span>Continue with Google</span>
                            </button>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="space-y-8"
                        >
                            <div>
                                <h2 className="text-3xl font-bold mb-2">Claim your identity</h2>
                                <p className="text-zinc-400">Choose a unique username for your collector profile.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <UserCircle2 className="h-5 w-5 text-zinc-500" />
                                    </div>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                        placeholder="username"
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-4 pl-12 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                                        maxLength={20}
                                    />
                                </div>
                                {error && <p className="text-red-400 text-sm">{error}</p>}
                                <p className="text-zinc-500 text-sm">Use letters, numbers, and underscores only.</p>
                            </div>

                            <div className="flex justify-between pt-4">
                                <div /> {/* Placeholder for flex spacing */}
                                <button
                                    onClick={nextStep}
                                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-medium transition-colors"
                                >
                                    <span>Next</span>
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="space-y-8"
                        >
                            <div>
                                <h2 className="text-3xl font-bold mb-2">What do you collect?</h2>
                                <p className="text-zinc-400">Select the TCGs you're most interested in tracking and trading.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { id: "pokemon", name: "Pokémon", color: "from-yellow-500/20 to-yellow-600/20", border: "hover:border-yellow-500/50" },
                                    { id: "mtg", name: "Magic: The Gathering", color: "from-amber-700/20 to-amber-900/20", border: "hover:border-amber-700/50" },
                                    { id: "yugioh", name: "Yu-Gi-Oh!", color: "from-indigo-500/20 to-indigo-700/20", border: "hover:border-indigo-500/50" },
                                    { id: "lorcana", name: "Lorcana", color: "from-purple-500/20 to-purple-700/20", border: "hover:border-purple-500/50" }
                                ].map((tcg) => (
                                    <button
                                        key={tcg.id}
                                        onClick={() => toggleTcg(tcg.id)}
                                        className={`relative overflow-hidden p-6 rounded-2xl border text-left transition-all duration-200 ${favoriteTcgs.includes(tcg.id)
                                            ? "border-blue-500 bg-blue-500/10"
                                            : `border-zinc-800 bg-zinc-900/50 ${tcg.border}`
                                            }`}
                                    >
                                        <div className={`absolute inset-0 bg-gradient-to-br ${tcg.color} opacity-0 hover:opacity-100 transition-opacity`} />
                                        <span className="relative z-10 font-medium">{tcg.name}</span>
                                    </button>
                                ))}
                            </div>

                            {error && <p className="text-red-400 text-sm">{error}</p>}

                            <div className="flex justify-between pt-4">
                                <button
                                    onClick={prevStep}
                                    className="flex items-center space-x-2 text-zinc-400 hover:text-white px-4 py-3 rounded-xl font-medium transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    <span>Back</span>
                                </button>
                                <button
                                    onClick={nextStep}
                                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-medium transition-colors"
                                >
                                    <span>Next</span>
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 4 && (
                        <motion.div
                            key="step4"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-8"
                        >
                            <div>
                                <h2 className="text-3xl font-bold mb-2">What brings you here?</h2>
                                <p className="text-zinc-400">Help us personalize your experience.</p>
                            </div>

                            <div className="space-y-4">
                                {[
                                    { id: "portfolio", title: "Tracking Portfolio", desc: "I want to track the value of my collection.", icon: TrendingUp },
                                    { id: "trading", title: "Trading & Flipping", desc: "I'm looking to buy, sell, and trade cards.", icon: Gamepad2 },
                                    { id: "scanning", title: "Scanning Collection", desc: "I just want to digitize my physical cards.", icon: Search },
                                ].map((goal) => {
                                    const Icon = goal.icon;
                                    return (
                                        <button
                                            key={goal.id}
                                            onClick={() => setPrimaryGoal(goal.id)}
                                            className={`w-full flex items-center p-4 rounded-xl border transition-all text-left ${primaryGoal === goal.id
                                                ? "border-blue-500 bg-blue-500/10"
                                                : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-600"
                                                }`}
                                        >
                                            <div className={`p-3 rounded-lg mr-4 ${primaryGoal === goal.id ? "bg-blue-500/20 text-blue-400" : "bg-zinc-800 text-zinc-400"}`}>
                                                <Icon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-white">{goal.title}</div>
                                                <div className="text-sm text-zinc-500">{goal.desc}</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {error && <p className="text-red-400 text-sm">{error}</p>}

                            <div className="flex justify-between pt-4">
                                <button
                                    onClick={prevStep}
                                    className="flex items-center space-x-2 text-zinc-400 hover:text-white px-4 py-3 rounded-xl font-medium transition-colors"
                                    disabled={isSubmitting}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    <span>Back</span>
                                </button>
                                <button
                                    onClick={handleComplete}
                                    disabled={!primaryGoal || isSubmitting}
                                    className={`flex items-center space-x-2 px-8 py-3 rounded-xl font-medium transition-colors ${!primaryGoal || isSubmitting
                                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                        : "bg-white text-black hover:bg-zinc-200"
                                        }`}
                                >
                                    <span>{isSubmitting ? "Completing..." : "Complete Setup"}</span>
                                    {!isSubmitting && <ChevronRight className="w-4 h-4" />}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Right Pane - Visuals (hidden on mobile) */}
            <div className="hidden lg:flex flex-1 relative bg-zinc-900 border-l border-zinc-800 items-center justify-center overflow-hidden">
                {/* Dynamic Background Elements */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px]" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px]" />
                </div>

                {/* Decorative holographic card visual */}
                <div className="relative z-10 w-72 h-96 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm shadow-2xl overflow-hidden flex items-center justify-center group">
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="w-24 h-24 rounded-full border border-white/20 flex items-center justify-center">
                        <span className="text-white/40 font-mono text-xs tracking-widest">TASH</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
