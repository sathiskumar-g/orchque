/**
 * Product configuration — the ONLY file you need to edit when copying this
 * template for a new product. Change name, color, pricing, hero copy, and
 * feature list here. Everything else reads from PRODUCT / CREDITS.
 */

export const PRODUCT = {
  name: "Orchque",
  tagline: "Orchestrate your AI skills for security, task completion, and production reliability.",
  description: "Orchque analyzes, optimizes, and versions your AI skills — detecting security vulnerabilities, reducing token waste, and ensuring task completion before your skill goes to production.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  domain: "orchque.com",
  supportEmail: "support@orchque.com",
  notifyEmail: "notify@orchque.com",

  color: {
    /** Hex without # — used in email templates */
    hex: "1e293b",
    /** Full hex — used in inline styles */
    primary: "#1e293b",
  },

  nav: {
    links: [
      { label: "Features", href: "/#features" },
      { label: "Pricing", href: "/pricing" },
    ],
  },

  pricing: {
    free: {
      name: "Starter",
      price: 0,
      actions: 10,
      /** Label for the action unit */
      actionLabel: "lifetime credits",
      features: [
        "10 lifetime credits (optimize + generate combined)",
        "3 saved skills — each with up to 3 versions",
        "Security vulnerability detection",
        "Token estimate + reduction tracking",
        "Score analytics — all 4 axes (Clarity, Specificity, Completeness, Safety)",
        "Export / download optimized skill (.md)",
        "Context field for targeted optimization",
        "3 anonymous trial actions — no signup",
      ],
      limits: {
        skills: 3,
        versionsPerSkill: 3,
        credits: 10,
      },
    },
    pro: {
      name: "Pro",
      price: 7,
      currency: "USD",
      /** Lemon Squeezy variant ID — fill in when wiring payments */
      variantId: "",
      actions: null, // unlimited
      actionLabel: "unlimited",
      features: [
        "Unlimited optimizations & generations",
        "Unlimited saved skills & versions",
        "Full version history + diff view",
        "Bulk folder upload (SKILL.md + memory.md + log.md)",
        "Export all skills as .zip",
        "Security scanning with fix suggestions",
        "Token breakdown + reduction tracking",
        "Priority processing",
        "Priority support — 24h response",
        "Early access to new features",
        "Everything in Starter",
      ],
      limits: {
        skills: null,
        versionsPerSkill: null,
        credits: null,
      },
    },
  },

  hero: {
    headline: "AI skills that are secure, complete, and production-ready.",
    subhead: "Paste any Claude skill or agent prompt. Orchque detects security vulnerabilities, token waste, and incomplete task logic — then rewrites it to production standard in seconds.",
    cta: "Optimize Your Skill Free",
    ctaHref: "/auth/signup",
    secondaryCta: "See how it works",
    secondaryCtaHref: "/#features",
  },

  features: [
    {
      icon: "Shield",
      title: "Security Scanning",
      description: "Detect injection vectors, credential leaks, over-permissive scope, and missing output boundaries before your skill goes to production.",
    },
    {
      icon: "CheckCircle",
      title: "Task Completion",
      description: "Orchque finds missing constraints, ambiguous steps, and incomplete output specs — ensuring your skill actually completes what it promises.",
    },
    {
      icon: "BarChart",
      title: "Version Control",
      description: "Every optimization creates a new version. Compare v1.0 vs v1.1 side-by-side. Roll back in one click. Never lose your original.",
    },
  ],
} as const;

/**
 * Credit constants — Free users get 10 lifetime credits (not monthly).
 * Credits are consumed by optimize and generate actions (1 credit each).
 * Pro users have unlimited actions — credits do not apply.
 */
export const CREDITS = {
  /** Free tier: 10 lifetime credits total, never reset */
  FREE_LIFETIME: 10,
  /** Cost per optimize or generate action */
  COST_PER_ACTION: 1,
  /** Free tier: max saved skills */
  FREE_SKILLS_LIMIT: 3,
  /** Free tier: max versions per skill */
  FREE_VERSIONS_LIMIT: 3,
} as const;
