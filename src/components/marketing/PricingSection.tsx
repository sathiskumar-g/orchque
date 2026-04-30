import Link from "next/link";
import { CheckCircle2, Crown, Zap } from "lucide-react";
import { PRODUCT } from "@/lib/config";

const FREE_FEATURES = [
  "10 total actions / month",
  "File upload, drag-drop + URL skill loading",
  "Business context for targeted output",
  "Token estimate + security flag detection",
  "Download optimized skill (.md)",
  "3 anonymous trial actions — no signup",
];

const PRO_FEATURES = [
  "50 total actions / month",
  "Full version history + diff view",
  "Token breakdown + reduction tracking",
  "Memory file embedding (log.md + memory.md)",
  "Own skill library — saved, versioned, searchable",
  "Shareable skill links for team collaboration",
  "Priority support — 24h response",
  "Early access to new features",
];

export default function PricingSection() {
  return (
    <section id="pricing" className="container mx-auto px-4 py-16">
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
                  Pro plan launching soon — founding member price locked at $7/mo.
                </span>
                <span className="relative inline-flex items-center">
                  <span className="absolute inset-0 rounded-full animate-ping opacity-60" style={{ background: "rgba(99,102,241,0.3)" }} />
                  <span className="relative text-xs px-2 py-0.5 rounded-full font-semibold text-white" style={{ background: "#6366f1" }}>
                    Early Access
                  </span>
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Sign up now to be first in line. No card required.
              </p>
            </div>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Free */}
          <div className="rounded-xl border border-border/60 bg-card p-6">
            <h3 className="text-xl font-semibold">Free</h3>
            <div className="text-3xl font-bold mt-2 mb-1">$0</div>
            <p className="text-sm text-muted-foreground mb-6">10 credits/month — no card required</p>
            <div className="space-y-3 mb-8">
              {FREE_FEATURES.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  {f}
                </div>
              ))}
            </div>
            <Link
              href="/auth/signup"
              className="block w-full h-10 rounded-lg border border-border text-sm font-semibold text-center leading-10 hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Start Free
            </Link>
          </div>

          {/* Pro — Most Popular */}
          <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                Most Popular
              </span>
            </div>
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
                ${PRODUCT.pricing.pro.price}
                <span className="text-base font-normal text-muted-foreground">/mo</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              50 credits/month — price locked forever for founding members
            </p>
            <div className="space-y-3 mb-8">
              {PRO_FEATURES.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  {f}
                </div>
              ))}
            </div>
            <button
              disabled
              className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 opacity-60 cursor-not-allowed"
              title="Payments coming soon"
            >
              <Crown className="h-4 w-4" />
              Coming Soon — $7/mo
            </button>
          </div>

          {/* Enterprise */}
          <div className="rounded-xl border border-border/60 bg-card p-6">
            <h3 className="text-xl font-semibold">Enterprise</h3>
            <div className="text-3xl font-bold mt-2 mb-1">Custom</div>
            <p className="text-sm text-muted-foreground mb-6">Bespoke skill pipeline built to your spec</p>
            <div className="space-y-3 mb-8">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Everything in Pro:</p>
              {[
                "Custom skill taxonomy + naming",
                "Private codebase delivery",
                "Security review + documentation",
                "Ongoing maintenance option",
                "Dedicated support channel",
              ].map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  {f}
                </div>
              ))}
            </div>
            <a
              href={`mailto:${PRODUCT.supportEmail}`}
              className="block w-full h-10 rounded-lg border border-border text-sm font-semibold text-center leading-10 hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Get in Touch
            </a>
          </div>
        </div>

        {/* Bottom note */}
        <p className="text-xs text-center text-muted-foreground mt-6">
          Free plan is free forever. Pro launches soon — founding price locked for early signups.
        </p>
      </div>
    </section>
  );
}
