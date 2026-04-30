/**
 * Product configuration — the ONLY file you need to edit when copying this
 * template for a new product. Change name, color, pricing, hero copy, and
 * feature list here. Everything else reads from PRODUCT / CREDITS.
 */

export const PRODUCT = {
  name: "Orchque",
  tagline: "Orchestrate your AI skills for security, cost, reliability, and production use.",
  description: "Orchque analyzes, optimizes, and versions your AI skills — reducing token waste and improving output quality in one click.",
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
      name: "Free",
      price: 0,
      actions: 10,
      /** Label for the action unit */
      actionLabel: "credits",
      features: [
        "10 total actions / month",
        "File upload, drag-drop + URL skill loading",
        "Business context for targeted output",
        "Token estimate + security flag detection",
        "Download optimized skill (.md)",
        "3 anonymous trial actions — no signup",
      ],
    },
    pro: {
      name: "Pro",
      price: 7,
      currency: "USD",
      /** Lemon Squeezy variant ID — fill in when wiring payments */
      variantId: "",
      actions: 50,
      actionLabel: "credits",
      features: [
        "50 total actions / month",
        "Full version history + diff view",
        "Token breakdown + reduction tracking",
        "Memory file embedding (log.md + memory.md)",
        "Own skill library — saved, versioned, searchable",
        "Shareable skill links for team collaboration",
        "Priority support — 24h response",
        "Early access to new features",
      ],
    },
  },

  hero: {
    headline: "Orchestrate your AI skills. Secure, efficient, reliability.",
    subhead: "Paste any existing Claude skill or agent prompt. Orchque detects token waste, security vulnerabilities, and missing constraints — then rewrites it to production standard in seconds.",
    cta: "Optimize Your Skill Free",
    ctaHref: "/auth/signup",
    secondaryCta: "See how it works",
    secondaryCtaHref: "/#features",
  },

  features: [
    {
      icon: "Zap",
      title: "Instant Optimization",
      description: "Upload any AI skill or prompt. Orchque finds token waste, duplicate instructions, and missing constraints — then fixes them automatically.",
    },
    {
      icon: "Shield",
      title: "Security Scanning",
      description: "Detect injection vectors, over-permissive scope, and missing output boundaries before your skill goes to production.",
    },
    {
      icon: "BarChart",
      title: "Version Control",
      description: "Every optimization creates a new version. Compare v1.0 vs v1.1 side-by-side. Roll back in one click. Never lose your original.",
    },
  ],
} as const;

/**
 * Credit constants — determines how many credits users get per plan
 * and how many are consumed per action.
 */
export const CREDITS = {
  FREE_MONTHLY: 10,
  PRO_MONTHLY: 50,
  COST_PER_ACTION: 1,
} as const;
