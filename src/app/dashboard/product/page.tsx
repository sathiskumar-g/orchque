"use client";

import { useState } from "react";
import CreditChip from "@/components/dashboard/CreditChip";
import { OptimizerWidget } from "@/components/skills/OptimizerWidget";
import { SkillGenerator } from "@/components/skills/SkillGenerator";
import type { OptimizerResult, GeneratorResult } from "@/types/skill";
import { Zap, Sparkles } from "lucide-react";

type PageTab = "optimize" | "generate";

export default function ProductPage() {
  const [tab, setTab] = useState<PageTab>("optimize");
  const [refreshKey, setRefreshKey] = useState(0);

  function handleOptimizeResult(_result: OptimizerResult) {
    setRefreshKey((k) => k + 1);
  }

  function handleGenerateResult(_result: GeneratorResult) {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Skills Studio</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Optimize existing skills or generate new ones from scratch.
          </p>
        </div>
        <CreditChip key={refreshKey} />
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 border border-border/40 w-fit">
        <button
          onClick={() => setTab("optimize")}
          className={`flex items-center gap-2 h-9 px-4 rounded-md text-sm font-medium transition-all ${
            tab === "optimize"
              ? "bg-background text-foreground shadow-sm border border-border/50"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Zap className="h-4 w-4" />
          Optimize
        </button>
        <button
          onClick={() => setTab("generate")}
          className={`flex items-center gap-2 h-9 px-4 rounded-md text-sm font-medium transition-all ${
            tab === "generate"
              ? "bg-background text-foreground shadow-sm border border-border/50"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Generate
        </button>
      </div>

      {/* Widget panel */}
      <div className="rounded-xl border border-border/60 bg-card p-6">
        {tab === "optimize" ? (
          <OptimizerWidget mode="skill" onResult={handleOptimizeResult} />
        ) : (
          <SkillGenerator mode="skill" onResult={handleGenerateResult} />
        )}
      </div>
    </div>
  );
}
