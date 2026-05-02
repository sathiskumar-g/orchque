"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";

export default function CreditChip() {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/credits/balance")
      .then((r) => r.json())
      .then((data) => setBalance(typeof data.total === "number" ? data.total : null))
      .catch(() => setBalance(null));
  }, []);

  if (balance === null) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        balance === 0
          ? "bg-destructive/10 text-destructive"
          : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
      }`}
    >
      <Zap className="h-3 w-3" /> {balance} credit{balance !== 1 ? "s" : ""}
    </span>
  );
}
