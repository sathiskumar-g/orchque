"use client";

import React, { useState } from "react";
import { Loader2, Sparkles, Download, ArrowRight, X } from "lucide-react";
import Link from "next/link";
import type { GeneratorResult } from "@/types/skill";

interface SkillGeneratorProps {
  mode: "anonymous" | "skill";
  onResult?: (result: GeneratorResult) => void;
  saveToSkills?: boolean;
  onSaveStatus?: (status: "idle" | "saving" | "saved" | "error") => void;
}

const EXAMPLE_DESCRIPTIONS = [
  "A skill that reviews pull requests and gives feedback on code quality, security, and test coverage",
  "A customer support skill that handles refund requests for an e-commerce store, following the 30-day return policy",
  "A skill that summarizes Slack threads into bullet points with action items and owners",
];

function downloadMd(title: string, content: string) {
  const slug = title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug || "skill"}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function SkillGenerator({ mode, onResult, saveToSkills = true, onSaveStatus }: SkillGeneratorProps) {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratorResult | null>(null);
  const [trialUsed, setTrialUsed] = useState(false);
  // internal save state (for result view status display)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const canSubmit = description.trim().length >= 10 && !loading;

  async function handleGenerate() {
    if (!canSubmit) return;

    // Scroll demo section into view so the loading state is visible
    if (mode === "anonymous") {
      document.getElementById("demo")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const endpoint = mode === "anonymous" ? "/api/generate/anonymous" : "/api/generate";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
        }),
      });

      const data = (await res.json()) as Record<string, unknown>;

      if (!res.ok) {
        if (
          res.status === 429 && (data.code as string) === "trial_used" ||
          res.status === 402 || (data.code as string) === "insufficient_credits"
        ) {
          setTrialUsed(true);
          return;
        }
        setError((data.error as string) ?? "Something went wrong. Please try again.");
        return;
      }

      const generatorResult = data as GeneratorResult;
      setResult(generatorResult);
      onResult?.(generatorResult);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setResult(null);
    setTrialUsed(false);
    setError(null);
    setSaveStatus("idle");
    setSaveError(null);
    onSaveStatus?.("idle");
  }

  // ── Result view ───────────────────────────────────────────────────────────────
  // Save generated skill if toggle is ON and not already saved
  async function handleSaveSkill() {
    if (!result || saveStatus === "saving" || mode === "anonymous") return;
    setSaveStatus("saving");
    onSaveStatus?.("saving");
    setSaveError(null);
    try {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, "0");
      const autoName = `untitled-${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: autoName, content: result.content, source: "generated" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveStatus("error");
        onSaveStatus?.("error");
        setSaveError(data.error || "Failed to save skill.");
        return;
      }
      setSaveStatus("saved");
      onSaveStatus?.("saved");
    } catch {
      setSaveStatus("error");
      onSaveStatus?.("error");
      setSaveError("Network error. Please try again.");
    }
  }

  // Auto-save on generation if toggle is ON and not anonymous
  React.useEffect(() => {
    if (result && saveToSkills && mode === "skill" && saveStatus === "idle") {
      handleSaveSkill();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, saveToSkills, mode]);

  if (result) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">{result.title}</span>
            </div>
            <p className="text-xs text-muted-foreground">{result.description}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">~{result.token_estimate} tokens</span>
            <button
              onClick={() => downloadMd(result.title, result.content)}
              className="h-8 px-3 rounded-md bg-primary/10 border border-primary/25 text-primary text-xs font-medium flex items-center gap-1.5 hover:bg-primary/20 transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> Download .md
            </button>
          </div>
        </div>

        {/* Save status (shown in result view when not using parent toggle) */}
        {mode === "skill" && saveStatus !== "idle" && (
          <div className="flex items-center gap-2 text-xs">
            {saveStatus === "saving" && <span className="text-muted-foreground animate-pulse">Saving to skills…</span>}
            {saveStatus === "saved" && <span className="text-emerald-500">✓ Saved to skills</span>}
            {saveStatus === "error" && <span className="text-destructive">{saveError ?? "Failed to save"}</span>}
          </div>
        )}

        {/* Generated content preview */}
        <div className="rounded-lg border border-border/60 bg-muted/30 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-muted/40">
            <span className="text-xs font-mono text-muted-foreground">skill.md</span>
            <button
              onClick={() => navigator.clipboard.writeText(result.content)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Copy
            </button>
          </div>
          <pre className="text-xs font-mono text-foreground/80 p-4 overflow-auto max-h-96 whitespace-pre-wrap break-words leading-relaxed">
            {result.content}
          </pre>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={handleReset}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <X className="h-3 w-3" /> Generate another
          </button>
          {mode === "anonymous" && (
            <Link
              href="/auth/signup"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Sign up for more <ArrowRight className="h-3 w-3" />
            </Link>
          )}
          {mode === "skill" && saveStatus === "idle" && !saveToSkills && (
            <button
              onClick={handleSaveSkill}
              className="text-xs text-primary hover:underline ml-2"
              disabled={saveStatus === "saving"}
            >
              Save to skills
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Trial used ────────────────────────────────────────────────────────────────
  if (trialUsed) {
    return (
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-5 text-center space-y-3">
        {mode === "anonymous" ? (
          <>
            <p className="text-sm font-medium">You&apos;ve used all 3 free anonymous actions.</p>
            <p className="text-xs text-muted-foreground">Sign up to get 10 monthly credits — no credit card required.</p>
            <Link href="/auth/signup" className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-5 py-2 text-sm font-medium hover:bg-primary/90 transition-colors">
              Sign up free <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm font-medium">No generations left this month.</p>
            <p className="text-xs text-muted-foreground">Upgrade to Pro for more.</p>
            <Link href="/pricing" className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-5 py-2 text-sm font-medium hover:bg-primary/90 transition-colors">
              Upgrade to Pro <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </>
        )}
      </div>
    );
  }

  // ── Input form ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          What should this skill do?
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the skill in plain language — e.g. 'A code review skill that checks for security issues, test coverage, and SOLID principles'"
          className="w-full min-h-48 rounded-lg border border-border/60 bg-muted/40 px-4 py-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
          disabled={loading}
          maxLength={2000}
        />
        <div className="flex items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            {EXAMPLE_DESCRIPTIONS.slice(0, 2).map((ex, i) => (
              <button
                key={i}
                onClick={() => setDescription(ex)}
                className="text-xs text-primary/70 hover:text-primary underline underline-offset-2 transition-colors"
                disabled={loading}
              >
                Example {i + 1}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">{description.length}/2000</span>
        </div>
      </div>

      {/* Business context toggle */}
      {/* Removed - no longer part of generation flow */}

      {/* Error */}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm px-4 py-3">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleGenerate}
        disabled={!canSubmit}
        className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Generating skill…</>
        ) : mode === "anonymous" ? (
          <><Sparkles className="h-4 w-4" /> Generate Free Skill</>
        ) : (
          <><Sparkles className="h-4 w-4" /> Generate Skill</>
        )}
      </button>

      {mode === "anonymous" && (
        <p className="text-xs text-muted-foreground text-center">
          3 anonymous trial actions · <Link href="/auth/signup" className="text-primary hover:underline">Sign up</Link> for 10 monthly credits
        </p>
      )}
    </div>
  );
}
