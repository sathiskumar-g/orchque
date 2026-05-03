"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Crown, Zap, X, ArrowRight } from "lucide-react";
import { PRODUCT } from "@/lib/config";

const FREE_FEATURES = [
  "10 lifetime credits — optimize & generate skills",
  "Generate single-file skills from plain language",
  "Save up to 3 skills",
  "Up to 3 versions per skill",
  "File upload, drag-drop + URL skill loading",
  "Business context for targeted output",
  "Token estimate + security flag detection",
  "Download optimized skill (.md)",
  "3 anonymous trial actions — no signup",
];

const PRO_FEATURES = [
  "Unlimited optimization credits",
  "Unlimited skills + unlimited versions",
  "Full version history + diff view",
  "Token breakdown + reduction tracking",
  "Generate skill packages (SKILL.md + references, memory, logs, scripts)",
  "Own skill library — saved, versioned, searchable",
  "Shareable skill links for team collaboration",
  "Priority support — 24h response",
  "Early access to new features",
];

const ENTERPRISE_FEATURES = [
  "Custom skill taxonomy + naming",
  "Private codebase delivery",
  "Security review + full documentation",
  "Ongoing maintenance option",
  "Dedicated support channel",
  "Everything in Pro — unlimited",
];

// ─── Popup form ───────────────────────────────────────────────────────────────

const PRO_UNLOCK_OPTIONS = [
  "Unlimited credits",
  "Unlimited skills & versions",
  "Full diff view",
  "Team collaboration / sharing",
  "Skill package generation",
  "API access",
  "Bulk import / export",
  "Priority support",
];

type FormType = "pro" | "enterprise" | null;

interface FormState {
  email: string;
  useCase: string;
  issues: string;
  features: string;
  // enterprise-only
  companyName?: string;
  timeline?: string;
  skillNeeds?: string;
}

const INITIAL_FORM: FormState = { email: "", useCase: "", issues: "", features: "", companyName: "", timeline: "weeks", skillNeeds: "" };

function WaitlistModal({ type, onClose }: { type: FormType; onClose: () => void }) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!type) return null;

  const isPro = type === "pro";

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function toggleFeature(f: string) {
    setSelectedFeatures((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);
  }

  function validate() {
    const errs: Partial<FormState> = {};
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = isPro ? "Please enter a valid email." : "Please enter a valid work email.";
    }
    if (!isPro && form.companyName && form.companyName.trim().length > 120) {
      errs.companyName = "Company name must be 120 characters or fewer.";
    }
    if (!isPro) {
      if (!form.skillNeeds || form.skillNeeds.trim().length < 10)
        errs.skillNeeds = "Please describe in at least 10 characters.";
    }
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          name: "",
          email: form.email.trim(),
          issues: isPro ? form.useCase.trim() : "",
          features: isPro ? selectedFeatures.join(", ") : "",
          companyName: !isPro ? (form.companyName?.trim() || null) : null,
          timeline: !isPro ? (form.timeline || "weeks") : null,
          skillNeeds: !isPro ? (form.skillNeeds?.trim() || null) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      setSubmitted(true);
    } catch (err: unknown) {
      setErrors({ email: err instanceof Error ? err.message : "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-lg bg-background border border-border/60 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-border/40">
          <div>
            <h2 className="text-lg font-semibold">
              {isPro ? "🚀 Get Early Access — Pro Plan" : "🏢 Enterprise Enquiry"}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isPro
                ? "Get early access to Pro — 50 credits/mo at $12/mo."
                : "Tell us about your needs and we'll put together a custom plan."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors ml-4 flex-shrink-0"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
          {submitted ? (
            <div className="text-center py-10 space-y-4">
              <div className="text-5xl">🎉</div>
              <h3 className="text-xl font-semibold">
                {isPro ? "You're on the list!" : "Request received!"}
              </h3>
              <p className="text-muted-foreground text-sm">
                {isPro
                  ? "We'll email you when Pro launches. You'll get 50 credits/mo at $12/mo."
                  : "Thanks for reaching out. We'll follow up within 1–2 business days."}
              </p>
              <button
                onClick={onClose}
                className="mt-4 text-sm text-primary font-medium hover:underline"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Founding member tag — Pro only */}
              {isPro && (
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
                  style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.35)" }}
                >
                  <span className="text-base leading-none">🎉</span>
                  <span className="text-sm font-medium" style={{ color: "#16a34a" }}>
                    You&apos;re claiming founding member pricing — $12/mo, locked forever. Used all 50 credits? Just ask for a top-up.
                  </span>
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{isPro ? "Email" : "Work email"} <span className="text-destructive">*</span></label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder={isPro ? "you@example.com" : "you@company.com"}
                  maxLength={254}
                  disabled={loading}
                  className={`w-full px-3 py-2.5 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60 ${errors.email ? "border-destructive" : "border-input"}`}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              {/* Pro-only fields */}
              {isPro && (
                <>
                  {/* Use case */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      What kind of AI skills are you building?{" "}
                      <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={form.useCase}
                      onChange={(e) => set("useCase", e.target.value)}
                      placeholder="e.g. Coding assistant, customer support agent, research tools…"
                      maxLength={200}
                      disabled={loading}
                      className="w-full px-3 py-2.5 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
                    />
                  </div>

                  {/* Feature unlock chips */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      What would unlock Pro for you?{" "}
                      <span className="text-muted-foreground font-normal">(select all that apply)</span>
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PRO_UNLOCK_OPTIONS.map((f) => {
                        const active = selectedFeatures.includes(f);
                        return (
                          <button
                            key={f}
                            type="button"
                            onClick={() => toggleFeature(f)}
                            aria-pressed={active}
                            disabled={loading}
                            className={`px-3 py-1.5 rounded-md text-xs border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 ${
                              active
                                ? "bg-primary/10 border-primary text-primary"
                                : "border-border hover:border-primary/40"
                            }`}
                          >
                            {active && <span className="mr-1" aria-hidden="true">✓</span>}
                            {f}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Enterprise-only fields */}
              {!isPro && (
                <>
                  {/* Company name */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Company name <span className="text-muted-foreground font-normal">(optional)</span></label>
                    <input
                      type="text"
                      value={form.companyName}
                      onChange={(e) => set("companyName", e.target.value)}
                      placeholder="Acme Corp"
                      maxLength={120}
                      disabled={loading}
                      className={`w-full px-3 py-2.5 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60 ${errors.companyName ? "border-destructive" : "border-input"}`}
                    />
                    {errors.companyName && <p className="text-xs text-destructive">{errors.companyName}</p>}
                  </div>

                  {/* Skill needs */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      Describe your SKILL file needs <span className="text-destructive">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={form.skillNeeds}
                      onChange={(e) => set("skillNeeds", e.target.value)}
                      placeholder="What AI agents, workflows, or tasks do your skill files cover? Any security or compliance requirements?"
                      maxLength={1500}
                      disabled={loading}
                      className={`w-full px-3 py-2.5 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none disabled:opacity-60 ${errors.skillNeeds ? "border-destructive" : "border-input"}`}
                    />
                    <div className="flex justify-between">
                      {errors.skillNeeds ? <p className="text-xs text-destructive">{errors.skillNeeds}</p> : <span />}
                      <p className="text-xs text-muted-foreground tabular-nums">{(form.skillNeeds ?? "").length}/1500</p>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Timeline</label>
                    <select
                      value={form.timeline}
                      onChange={(e) => set("timeline", e.target.value)}
                      disabled={loading}
                      className="w-full px-3 py-2.5 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60 dark:[color-scheme:dark]"
                    >
                      <option value="asap">ASAP — need this week</option>
                      <option value="weeks">A few weeks</option>
                      <option value="month">Within a month</option>
                      <option value="planning">Still planning</option>
                    </select>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Submitting…" : isPro ? (
                  <><Zap className="h-4 w-4" /> Get Early Access — $12/mo →</>
                ) : (
                  <><ArrowRight className="h-4 w-4" /> Send Enquiry</>
                )}
              </button>

              <p className="text-xs text-center text-muted-foreground">
                No spam. We&apos;ll only email you about {isPro ? "Pro access" : "your enquiry"}.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

export default function PricingSection() {
  const [modal, setModal] = useState<FormType>(null);

  return (
    <section id="pricing" className="container mx-auto px-4 py-16">
      <WaitlistModal type={modal} onClose={() => setModal(null)} />

      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
            Start Free. Scale When You Need To.
          </h2>
          <p className="text-muted-foreground text-lg">
            Pay for what you use, not subscriptions you won&apos;t touch.
          </p>
        </div>

        {/* Founding member banner */}
        <div
          className="mb-8 w-fit mx-auto"
          style={{ padding: "1px", borderRadius: "0.75rem", background: "linear-gradient(135deg, #818cf8 0%, #6366f1 100%)" }}
        >
          <div className="rounded-[11px] bg-background px-5 py-4 flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 border border-primary/25">
             <Zap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground">
                  Founding member perk — used all 50 credits? Request a top-up.
                </span>
                <span className="relative inline-flex items-center">
                  <span className="absolute inset-0 rounded-full animate-ping opacity-60" style={{ background: "rgba(99,102,241,0.3)" }} />
                  <span className="relative text-xs px-2 py-0.5 rounded-full font-semibold text-white" style={{ background: "#6366f1" }}>
                    Founders Only
                  </span>
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Pro plan includes 50 credits/mo. Founding members can email us after using them up — we'll add more manually.
              </p>
            </div>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Free */}
          <div className="rounded-xl border border-border/60 bg-card p-6 flex flex-col">
            <div>
              <h3 className="text-xl font-semibold">Starter</h3>
              <div className="text-3xl font-bold mt-2 mb-1">$0</div>
              <p className="text-sm text-muted-foreground mb-6">10 lifetime credits — no card required</p>
              <div className="space-y-3 mb-8">
                {FREE_FEATURES.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-auto">
              <Link
                href="/auth/signup"
                className="block w-full h-10 rounded-lg border border-border text-sm font-semibold text-center leading-10 hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Start Free
              </Link>
            </div>
          </div>

          {/* Pro — Most Popular */}
          <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-6 relative flex flex-col">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                Most Popular
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-semibold">Pro</h3>
                <span
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold border"
                  style={{ background: "rgba(34,197,94,0.1)", color: "#16a34a", borderColor: "rgba(34,197,94,0.6)" }}
                >
                  <Crown className="h-3 w-3" /> Founding
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-2 mb-1">
                <span className="text-3xl font-bold">
                  $12
                  <span className="text-base font-normal text-muted-foreground">/mo</span>
                </span>
                <span className="text-sm text-muted-foreground line-through">$17/mo</span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                50 credits per month — founding members can request a top-up after credits run out
              </p>
              <div className="space-y-3 mb-8">
                {PRO_FEATURES.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-auto">
              <button
                onClick={() => setModal("pro")}
                className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Zap className="h-4 w-4" />
                Get Early Access
              </button>
            </div>
          </div>

          {/* Enterprise */}
          <div className="rounded-xl border border-border/60 bg-card p-6 flex flex-col">
            <div>
              <h3 className="text-xl font-semibold">Enterprise</h3>
              <div className="text-3xl font-bold mt-2 mb-1">Custom</div>
              <p className="text-sm text-muted-foreground mb-6">Bespoke skill pipeline built to your spec</p>
              <div className="space-y-3 mb-8">
                {ENTERPRISE_FEATURES.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-auto">
              <button
                onClick={() => setModal("enterprise")}
                className="w-full h-10 rounded-lg border border-border text-sm font-semibold flex items-center justify-center gap-2 hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Get in Touch
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom note */}
        <p className="text-xs text-center text-muted-foreground mt-6">
          Starter plan is free forever. Pro is $12/mo with 50 credits/mo — founding members get manual top-ups after credits run out.
        </p>
      </div>
    </section>
  );
}
