"use client";

import { useEffect, useState } from "react";

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
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        balance === 0
          ? "bg-destructive/10 text-destructive"
          : balance <= 1
          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
          : "bg-primary/10 text-primary"
      }`}
    >
      {balance} credit{balance !== 1 ? "s" : ""}
    </span>
  );
}
