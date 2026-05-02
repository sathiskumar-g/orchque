"use client";

import { useState } from "react";
import { Sparkles, CheckCircle2, Zap } from "lucide-react";
import { PRODUCT } from "@/lib/config";
import { OptimizerWidget } from "@/components/skills/OptimizerWidget";
import { SkillGenerator } from "@/components/skills/SkillGenerator";

type HeroTab = "optimize" | "generate";

const showGenerate = process.env.NEXT_PUBLIC_SHOW_GENERATE_SKILLS === "true";

export default function Hero() {
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [heroTab, setHeroTab] = useState<HeroTab>("optimize");
  const [optimizerBusy, setOptimizerBusy] = useState(false);

  return (
    <div
      onMouseMove={(e) => setCursor({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setCursor(null)}
    >
      {/* Full-page cursor brand glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300"
        style={{
          opacity: cursor ? 1 : 0,
          background: cursor
            ? `radial-gradient(420px circle at ${cursor.x}px ${cursor.y}px, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0.05) 50%, transparent 72%)`
            : "none",
        }}
      />

      {/* ── Hero headline ─────────────────────────────────────────────── */}
      <section className="relative pt-16 md:pt-24 pb-20 md:pb-32 px-4">
        <div className="container max-w-3xl mx-auto relative z-10">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm mb-6">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>3 free anonymous actions — no signup required</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-5">
              Orchestrate your AI skills.<br />
              <span className="bg-gradient-to-r from-primary via-blue-400 to-purple-400 bg-clip-text text-transparent">
                Secure, efficient, reliability.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-8">
              {PRODUCT.hero.subhead}
            </p>

            {/* Stat pills */}
            <div className="flex flex-wrap gap-3 justify-center">
              {[
                "Paste any existing skill",
                "Token waste + security scan",
                "Rewritten to production standard",
              ].map((item) => (
                <div
                  key={item}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border/60 text-sm"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Demo section ──────────────────────────────────────────────── */}
      <section id="demo" className="relative pb-20 md:pb-28 px-4">
        <div className="container max-w-3xl mx-auto relative z-10">
          {/* Section header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-4">
              <Zap className="h-3 w-3" /> Live Demo
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
              Drop in a skill. Get results{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                in seconds.
              </span>
            </h2>
            <p className="text-muted-foreground text-sm md:text-base max-w-lg mx-auto">
              No setup. No account. Paste your prompt or AI skill file — Orchque scores it, flags security issues, and rewrites it to production standard.
            </p>
          </div>

          {/* Widget card */}
          <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
            {/* Tab bar */}
            <div className="flex items-center gap-1 p-2 border-b border-border/40 bg-muted/30">
              <button
                onClick={() => setHeroTab("optimize")}
                className={`flex items-center gap-2 h-8 px-3 rounded-md text-xs font-medium transition-all ${
                  heroTab === "optimize"
                    ? "bg-background text-foreground shadow-sm border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Zap className="h-3.5 w-3.5" /> Optimize Skill
              </button>
              {showGenerate && (
                <button
                  onClick={() => { if (!optimizerBusy) setHeroTab("generate"); }}
                  disabled={optimizerBusy}
                  title={optimizerBusy ? "Finish optimization before switching" : undefined}
                  className={`flex items-center gap-2 h-8 px-3 rounded-md text-xs transition-all ${
                    heroTab === "generate"
                      ? "bg-background text-foreground shadow-sm border border-border/50 font-medium"
                      : optimizerBusy
                      ? "text-muted-foreground/30 cursor-not-allowed"
                      : "text-muted-foreground/60 hover:text-muted-foreground"
                  }`}
                >
                  <Sparkles className="h-3 w-3" /> Generate new
                </button>
              )}
            </div>
            <div className="p-6 md:p-8">
              {heroTab === "optimize" || !showGenerate ? (
                <OptimizerWidget mode="anonymous" onBusy={setOptimizerBusy} />
              ) : (
                <SkillGenerator mode="anonymous" />
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-4">
            3 anonymous trial actions · Sign up for {PRODUCT.pricing.free.actions} {PRODUCT.pricing.free.actionLabel}/month · No card required
          </p>
        </div>
      </section>
    </div>
  );
}

