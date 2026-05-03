"use client";

import { useState, useEffect } from "react";
import CreditChip from "@/components/dashboard/CreditChip";
import { OptimizerWidget } from "@/components/skills/OptimizerWidget";
import { SkillGenerator } from "@/components/skills/SkillGenerator";
import { Switch } from "@/components/ui/Switch";
import type { OptimizerResult, GeneratorResult } from "@/types/skill";
import { Zap, Sparkles } from "lucide-react";

type PageTab = "optimize" | "generate";

export default function ProductPage() {
  const [tab, setTab] = useState<PageTab>("optimize");
  const [refreshKey, setRefreshKey] = useState(0);
  const [saveToSkills, setSaveToSkills] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [plan, setPlan] = useState<"free" | "pro">("free");

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((d) => { if (d.plan === "pro") setPlan("pro"); })
      .catch(() => {});
  }, []);

  function handleOptimizeResult(_result: OptimizerResult) {
    setRefreshKey((k) => k + 1);
  }

  function handleGenerateResult(_result: GeneratorResult) {
    setRefreshKey((k) => k + 1);
  }

  function handleTabChange(next: PageTab) {
    setTab(next);
    setSaveStatus("idle");
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

      {/* Tab switcher + Auto-save toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 border border-border/40">
          <button
            onClick={() => handleTabChange("optimize")}
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
            onClick={() => handleTabChange("generate")}
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

        {/* Auto-save toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            id="auto-save"
            checked={saveToSkills}
            onCheckedChange={(v) => { setSaveToSkills(v); setSaveStatus("idle"); }}
          />
          <label htmlFor="auto-save" className={`text-xs font-medium cursor-pointer select-none flex items-center gap-1.5 transition-colors duration-200 ${saveToSkills ? "text-emerald-500" : "text-muted-foreground"}`}>
            Auto saved
            {saveToSkills && saveStatus === "saving" && <span className="animate-pulse">· saving…</span>}
            {saveToSkills && saveStatus === "saved" && <span>· ✓ saved</span>}
            {saveToSkills && saveStatus === "error" && <span className="text-destructive">· failed</span>}
          </label>
        </div>
      </div>

      {/* Widget panel */}
      <div className="rounded-xl border border-border/60 bg-card p-6">
        {tab === "optimize" ? (
          <OptimizerWidget
            mode="skill"
            saveToSkills={saveToSkills}
            onResult={handleOptimizeResult}
            onSaveStatus={setSaveStatus}
          />
        ) : (
          <SkillGenerator
            mode="skill"
            plan={plan}
            saveToSkills={saveToSkills}
            onResult={handleGenerateResult}
            onSaveStatus={setSaveStatus}
          />
        )}
      </div>
    </div>
  );
}
