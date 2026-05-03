"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { PRODUCT } from "@/lib/config";

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json() as Record<string, unknown>;

      if (!res.ok) {
        if (data.code === "network_timeout" || res.status === 503) {
          toast.error("Could not reach authentication service", {
            description: "Check your internet connection and try again.",
          });
          return;
        }
        toast.error((data.error as string) || "Sign up failed");
        return;
      }

      setDone(true);
    } catch {
      toast.error("Network error — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const underwaterBg = (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
      {/* Deep ocean gradient overlay — light shafts from above */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(56,189,248,0.18) 0%, transparent 70%), " +
            "radial-gradient(ellipse 40% 30% at 20% 0%, rgba(99,210,255,0.10) 0%, transparent 60%)",
        }}
      />

      {/* Bubbles — rising */}
      <span className="absolute text-[8px] opacity-40 top-[30%] left-[15%]">🫧</span>
      <span className="absolute text-[10px] opacity-30 top-[45%] left-[28%]">🫧</span>
      <span className="absolute text-[7px] opacity-50 top-[20%] left-[55%]">🫧</span>
      <span className="absolute text-[9px] opacity-35 top-[38%] left-[70%]">🫧</span>
      <span className="absolute text-[8px] opacity-40 top-[55%] left-[82%]">🫧</span>
      <span className="absolute text-[6px] opacity-30 top-[15%] left-[40%]">🫧</span>
      <span className="absolute text-[10px] opacity-25 top-[10%] left-[75%]">🫧</span>
      <span className="absolute text-[7px] opacity-45 top-[62%] left-[10%]">🫧</span>

      {/* Dolphin — leaping upper right */}
      <span className="absolute text-[6rem] top-[8%] right-[8%] leading-none opacity-90 rotate-[25deg]">🐬</span>

      {/* Whale — left mid */}
      <span className="absolute text-[10rem] top-[12%] left-[-2%] leading-none opacity-80">🐋</span>


      {/* Small fish cluster — scattered */}
      <span className="absolute text-3xl top-[32%] left-[8%] opacity-65">🐠</span>
      <span className="absolute text-2xl top-[40%] left-[14%] opacity-50">🐟</span>
      <span className="absolute text-2xl top-[28%] right-[22%] opacity-55">🐡</span>
      <span className="absolute text-xl top-[48%] right-[12%] opacity-45">🐠</span>
      <span className="absolute text-lg top-[36%] left-[60%] opacity-40">🐟</span>
      <span className="absolute text-xl top-[22%] right-[36%] opacity-50">🐠</span>

      {/* Octopus — bottom left */}
      <span className="absolute text-[5rem] bottom-[10%] left-[6%] leading-none opacity-80">🐙</span>

      {/* Shark — bottom right, menacing */}
      <span className="absolute text-[5.5rem] bottom-[8%] right-[10%] leading-none opacity-75">🦈</span>

      {/* Crab — very bottom center */}
      <span className="absolute text-[3rem] bottom-0 left-[44%] leading-none opacity-70">🦀</span>

      {/* Seaweed / coral — bottom */}
      <span className="absolute text-[5rem] bottom-0 left-[20%] leading-none opacity-50">🌿</span>
      <span className="absolute text-[4rem] bottom-0 left-[35%] leading-none opacity-40">🪸</span>
      <span className="absolute text-[5rem] bottom-0 right-[22%] leading-none opacity-50">🌿</span>
      <span className="absolute text-[4rem] bottom-0 right-[33%] leading-none opacity-40">🪸</span>

      {/* Jellyfish — floating mid */}
      <span className="absolute text-[2.5rem] top-[44%] left-[36%] leading-none opacity-45">🪼</span>
    </div>
  );

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: "#020d1f" }}>
        {underwaterBg}
        <div className="w-full max-w-sm text-center relative z-10">
          <div className="text-5xl mb-4">📬</div>
          <h2 className="text-xl font-semibold mb-2 text-white">Check your email</h2>
          <p className="text-white/50 text-sm">
            We&apos;ve sent a verification link to <strong className="text-white/80">{email}</strong>.
            Click the link to activate your account.
          </p>
          <button
            onClick={() => { setDone(false); setEmail(""); setPassword(""); router.push("/auth/signin"); }}
            className="mt-6 text-sm text-white/40 hover:text-white/70 transition-colors underline"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: "#020d1f" }}>
      {underwaterBg}

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-white">{PRODUCT.name}</h1>
          <p className="text-white/50 mt-1 text-sm">Create your free account</p>
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
                className="flex h-9 w-full rounded-md border border-white/10 bg-white/5 px-3 py-1 text-sm text-white shadow-sm transition-colors placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-400/50 disabled:opacity-50"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-white/80">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                minLength={8}
                autoComplete="new-password"
                className="flex h-9 w-full rounded-md border border-white/10 bg-white/5 px-3 py-1 text-sm text-white shadow-sm transition-colors placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-400/50 disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-9 rounded-md bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/30 text-white text-sm font-medium shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-white/30 mt-4">
          By creating an account you agree to our{" "}
          <Link href="/legal/terms" className="underline hover:text-white/60 transition-colors">Terms</Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="underline hover:text-white/60 transition-colors">Privacy Policy</Link>.
        </p>

        <p className="text-center text-sm text-white/40 mt-2">
          Already have an account?{" "}
          <Link href="/auth/signin" className="text-white/70 font-medium hover:text-white transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
