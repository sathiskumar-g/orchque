"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PRODUCT } from "@/lib/config";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // Always show success (don't reveal if email exists)
      setSent(true);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const nightForestBg = (
    <div className="absolute inset-0 pointer-events-none select-none">
      {/* Stars */}
      <span className="absolute text-[6px] opacity-60 top-[7%] left-[14%]">✦</span>
      <span className="absolute text-[8px] opacity-40 top-[4%] left-[38%]">✦</span>
      <span className="absolute text-[5px] opacity-70 top-[10%] left-[60%]">✦</span>
      <span className="absolute text-[7px] opacity-50 top-[6%] left-[80%]">✦</span>
      <span className="absolute text-[6px] opacity-60 top-[17%] left-[25%]">✦</span>
      <span className="absolute text-[5px] opacity-40 top-[2%] left-[92%]">✦</span>
      <span className="absolute text-[9px] opacity-30 top-[12%] left-[50%]">✦</span>
      <span className="absolute text-[5px] opacity-60 top-[20%] left-[70%]">✦</span>
      <span className="absolute text-[6px] opacity-50 top-[9%] left-[6%]">✦</span>

      {/* Full moon — slightly larger glow */}
      <span className="absolute text-6xl top-[5%] right-[12%] drop-shadow-[0_0_30px_rgba(255,230,120,0.6)]">🌕</span>

      {/* Gorilla — standing on the ground right side */}
      <span className="absolute text-[7rem] bottom-0 right-[20%] leading-none opacity-95">🦍</span>

      {/* Deer — on the ground left-center */}
      <span className="absolute text-[5rem] bottom-0 left-[28%] leading-none opacity-80">🦌</span>

      {/* Big trees - left */}
      <span className="absolute text-[11rem] bottom-0 left-0 leading-none opacity-95">🌲</span>
      <span className="absolute text-[9rem] bottom-0 left-[9%] leading-none opacity-80">🌲</span>
      <span className="absolute text-[10rem] bottom-0 left-[18%] leading-none opacity-70">🌲</span>

      {/* Big trees - right */}
      <span className="absolute text-[11rem] bottom-0 right-0 leading-none opacity-95">🌲</span>
      <span className="absolute text-[9rem] bottom-0 right-[9%] leading-none opacity-80">🌲</span>

      {/* Fireflies */}
      <span className="absolute text-lg bottom-[33%] left-[40%] opacity-50">✨</span>
      <span className="absolute text-base bottom-[40%] left-[48%] opacity-40">✨</span>
      <span className="absolute text-lg bottom-[28%] right-[40%] opacity-50">✨</span>
    </div>
  );

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-[#0b0f1a]">
        {nightForestBg}
        <div className="w-full max-w-sm text-center relative z-10">
          <div className="text-5xl mb-4">✉️</div>
          <h2 className="text-xl font-semibold mb-2 text-white">Check your email</h2>
          <p className="text-white/50 text-sm">
            If an account exists for <strong className="text-white/80">{email}</strong>, we&apos;ve sent a password reset link.
          </p>
          <Link
            href="/auth/signin"
            className="mt-6 inline-block text-sm text-white/40 hover:text-white/70 transition-colors underline"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-[#0b0f1a]">
      {nightForestBg}

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-white">{PRODUCT.name}</h1>
          <p className="text-white/50 mt-1 text-sm">Reset your password</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-white/80">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="flex h-9 w-full rounded-md border border-white/10 bg-white/5 px-3 py-1 text-sm text-white shadow-sm transition-colors placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-9 rounded-md bg-white/10 hover:bg-white/20 border border-white/15 text-white text-sm font-medium shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-white/40 mt-4">
          <Link href="/auth/signin" className="text-white/70 font-medium hover:text-white transition-colors">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
