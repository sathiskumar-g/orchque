import Link from "next/link";
import { PRODUCT } from "@/lib/config";
import CreditChip from "@/components/dashboard/CreditChip";

interface PlanCardProps {
  plan: "free" | "pro";
}

export default function PlanCard({ plan }: PlanCardProps) {
  const planConfig = PRODUCT.pricing[plan];

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold mb-1">Your plan</h2>
        <p className="text-sm text-muted-foreground">Current plan and usage</p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xl font-bold">{planConfig.name}</span>
        <span className="rounded-full border px-2 py-0.5 text-xs font-medium">
          {plan === "free" ? "Free" : `$${planConfig.price}/mo`}
        </span>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        Credits remaining: <CreditChip />
      </div>

      {plan === "free" && (
        <div>
          {/* Disabled until Lemon Squeezy is wired — see template.md Part 2.6 */}
          <button
            disabled
            title="Coming soon"
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium opacity-50 cursor-not-allowed"
          >
            Upgrade to Pro — ${PRODUCT.pricing.pro.price}/mo
          </button>
          <p className="text-xs text-muted-foreground mt-2">Payments coming soon.</p>
        </div>
      )}
    </div>
  );
}
