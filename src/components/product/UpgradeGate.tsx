import { PRODUCT } from "@/lib/config";

export default function UpgradeGate() {
  return (
    <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-8 text-center">
      <div className="text-3xl mb-3">⚡</div>
      <h3 className="text-base font-semibold mb-1">You've used all your credits</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
        Free plan includes {PRODUCT.pricing.free.actions} {PRODUCT.pricing.free.actionLabel} per month.
        Upgrade to Pro for unlimited access.
      </p>
      {/* Disabled until Lemon Squeezy is wired */}
      <button
        disabled
        title="Coming soon"
        className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium opacity-50 cursor-not-allowed"
      >
        Upgrade to Pro — ${PRODUCT.pricing.pro.price}/mo
      </button>
      <p className="text-xs text-muted-foreground mt-2">Credits reset on the 1st of each month.</p>
    </div>
  );
}
