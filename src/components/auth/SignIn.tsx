"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { PRODUCT } from "@/lib/config";

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "email_not_verified") {
          toast.error("Email not verified", { description: data.error });
        } else if (data.code === "network_error" || res.status === 503) {
          toast.error("Could not reach authentication service", {
            description: "Check your internet connection and try again.",
          });
        } else {
          toast.error(data.error || "Sign in failed");
        }
        return;
      }

      toast.success("Signed in successfully");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-[#0b0f1a]">

      {/* Night sky */}
      <div className="absolute inset-0 pointer-events-none select-none">

        {/* Stars */}
        <span className="absolute text-[6px] opacity-60 top-[8%] left-[12%]">✦</span>
        <span className="absolute text-[8px] opacity-40 top-[5%] left-[35%]">✦</span>
        <span className="absolute text-[5px] opacity-70 top-[12%] left-[58%]">✦</span>
        <span className="absolute text-[7px] opacity-50 top-[7%] left-[78%]">✦</span>
        <span className="absolute text-[6px] opacity-60 top-[18%] left-[22%]">✦</span>
        <span className="absolute text-[5px] opacity-40 top-[3%] left-[90%]">✦</span>
        <span className="absolute text-[9px] opacity-30 top-[14%] left-[47%]">✦</span>
        <span className="absolute text-[5px] opacity-60 top-[20%] left-[67%]">✦</span>
        <span className="absolute text-[6px] opacity-50 top-[9%] left-[5%]">✦</span>

        {/* Moon */}
        <span className="absolute text-6xl top-[6%] right-[10%] drop-shadow-[0_0_24px_rgba(255,230,120,0.5)]">🌕</span>

        {/* Elephant — big, standing on ground right side */}
        <span className="absolute text-[8rem] bottom-0 right-[18%] leading-none opacity-95">🐘</span>

        {/* Birds flying near moon */}
        <span className="absolute text-2xl top-[13%] right-[22%] opacity-70 rotate-[-10deg]">🕊️</span>
        <span className="absolute text-xl top-[19%] right-[30%] opacity-50 rotate-[6deg]">🕊️</span>

        {/* Big trees - left side */}
        <span className="absolute text-[11rem] bottom-0 left-0 leading-none opacity-95">🌲</span>
        <span className="absolute text-[9rem] bottom-0 left-[9%] leading-none opacity-80">🌲</span>
        <span className="absolute text-[10rem] bottom-0 left-[18%] leading-none opacity-70">🌲</span>

        {/* Big trees - right side */}
        <span className="absolute text-[11rem] bottom-0 right-0 leading-none opacity-95">🌲</span>
        <span className="absolute text-[9rem] bottom-0 right-[9%] leading-none opacity-80">🌲</span>

        {/* Fireflies / sparkles mid-scene */}
        <span className="absolute text-lg bottom-[32%] left-[36%] opacity-50">✨</span>
        <span className="absolute text-base bottom-[38%] left-[44%] opacity-40">✨</span>
        <span className="absolute text-lg bottom-[29%] right-[36%] opacity-50">✨</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-white">{PRODUCT.name}</h1>
          <p className="text-white/50 mt-1 text-sm">Sign in to your account</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-white/80">
                Email
              </label>
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

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-white/80">
                  Password
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="flex h-9 w-full rounded-md border border-white/10 bg-white/5 px-3 py-1 text-sm text-white shadow-sm transition-colors placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-9 rounded-md bg-white/10 hover:bg-white/20 border border-white/15 text-white text-sm font-medium shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-white/40 mt-4">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="text-white/70 font-medium hover:text-white transition-colors">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}
