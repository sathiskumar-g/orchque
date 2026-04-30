import { Zap, Shield, BarChart3, GitBranch, FolderOpen, BookMarked, Share2, Database, AlertTriangle, Lock, Gauge } from "lucide-react";

const FEATURE_CARDS = [
  {
    icon: Zap,
    title: "One-Click AI Optimization",
    desc: "Paste your skill or drop a folder. Claude analyzes and rewrites it — clearer, tighter, better-structured — in seconds.",
  },
  {
    icon: GitBranch,
    title: "Version History + Diff View",
    desc: "Every optimization creates a versioned snapshot. Compare v1.0 vs v1.3 side-by-side with a full diff view.",
  },
  {
    icon: BarChart3,
    title: "Token Reduction Tracking",
    desc: "See exactly how many tokens your optimized skill uses vs the original. Track reduction % across every version.",
  },
  {
    icon: FolderOpen,
    title: "Drag-Drop Folder Upload",
    desc: "Drop an entire skill folder. Orchque reads SKILL.md, follows its references, and includes only the linked files.",
  },
  {
    icon: Database,
    title: "Memory File Embedding",
    desc: "Embed log.md and memory.md alongside your skill. Persistent agent context and change history travel with every optimization.",
  },
  {
    icon: BookMarked,
    title: "Own Skill Library",
    desc: "Every optimized skill is saved to your personal library — versioned, searchable, and ready to reuse across projects.",
  },
  {
    icon: Share2,
    title: "Shareable Skills",
    desc: "Generate a public link to any skill in your library. Share optimized, production-ready prompts with your team or the world.",
  },
  {
    icon: Shield,
    title: "Security Flag Detection",
    desc: "Claude flags prompt injection risks, unbounded inputs, and unsafe patterns before your skill reaches production.",
  },
];

const SECURITY_CARDS = [
  {
    icon: Shield,
    title: "Validated Inputs Only",
    desc: "Every skill is validated before Claude sees it — binary content rejected, length enforced, null bytes blocked.",
  },
  {
    icon: AlertTriangle,
    title: "Prompt Security Scanning",
    desc: "Claude flags injection risks and dangerous patterns in your skills. 4 security axes scored on every optimization run.",
  },
  {
    icon: Lock,
    title: "Your Skills Stay Yours",
    desc: "Row-level security on every skill. No sharing, no training, no third-party access — your data is isolated.",
  },
  {
    icon: Gauge,
    title: "Rate Limiting + Credits",
    desc: "Per-user rate limiting and a credit system protect against abuse. Credits deducted before Claude, refunded on failure.",
  },
];

export default function Features() {
  return (
    <>
      {/* Main feature cards */}
      <section id="features" className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 tracking-tight">
            Everything Your AI Skills Need
          </h2>
          <p className="text-center text-muted-foreground mb-12 text-lg max-w-2xl mx-auto">
            From raw prompt to versioned, optimized, callable worker — in one click.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURE_CARDS.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl border-2 border-primary/10 bg-card p-6 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <Icon className="h-12 w-12 mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security section — green cards */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 tracking-tight">
            Build Secure AI Skills from Day One
          </h2>
          <p className="text-center text-muted-foreground mb-12 text-lg max-w-2xl mx-auto">
            Security and validation are baked in — not bolted on after the fact.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SECURITY_CARDS.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl border-2 border-green-500/20 bg-green-500/5 p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold">{title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* CTA callout */}
          <div className="mt-10 p-6 rounded-xl bg-gradient-to-r from-primary/10 via-blue-500/10 to-purple-500/10 border-2 border-primary/20">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1">Why Skill Security Matters</h3>
                <p className="text-sm text-muted-foreground">
                  AI skills have direct access to your LLM pipelines and production systems. A single prompt injection or unbounded input can leak data or cause runaway costs. Orchque flags these risks before you ship.
                </p>
              </div>
              <div className="flex-shrink-0">
                <a
                  href="/auth/signup"
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-border text-sm font-medium hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Build Secure Skills Now
                </a>
              </div>
            </div>
          </div>


        </div>
      </section>
    </>
  );
}
