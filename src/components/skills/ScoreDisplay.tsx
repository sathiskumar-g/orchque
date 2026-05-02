"use client";

import type { OptimizerResult } from "@/types/skill";

interface ScoreRingProps {
  score: number;
}

function scoreColor(score: number): string {
  if (score >= 75) return "text-emerald-400";
  if (score >= 50) return "text-yellow-400";
  return "text-red-400";
}

function ringStroke(score: number): string {
  if (score >= 75) return "stroke-emerald-400";
  if (score >= 50) return "stroke-yellow-400";
  return "stroke-red-400";
}

function axisColor(val: number): { bar: string; text: string } {
  if (val >= 75) return { bar: "bg-emerald-400", text: "text-emerald-400" };
  if (val >= 50) return { bar: "bg-yellow-400", text: "text-yellow-400" };
  return { bar: "bg-red-400", text: "text-red-400" };
}

export function ScoreRing({ score }: ScoreRingProps) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="relative flex items-center justify-center w-24 h-24 shrink-0">
      <svg width="96" height="96" className="-rotate-90 absolute inset-0">
        <circle cx="48" cy="48" r={r} fill="none" className="stroke-muted/50" strokeWidth="5" />
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          className={ringStroke(score)}
          strokeWidth="5"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="flex flex-col items-center relative z-10 gap-0.5">
        <span className={`text-2xl font-bold tabular-nums leading-none ${scoreColor(score)}`}>{score}</span>
        <span className="text-[10px] text-muted-foreground font-medium">/ 100</span>
      </div>
    </div>
  );
}

interface ScoreAxesProps {
  axes: OptimizerResult["axes"];
}

const AXIS_LABELS: Record<keyof OptimizerResult["axes"], string> = {
  clarity: "Clarity",
  specificity: "Specificity",
  completeness: "Completeness",
  safety: "Safety",
};

export function ScoreAxes({ axes }: ScoreAxesProps) {
  return (
    <div className="space-y-2">
      {(Object.keys(AXIS_LABELS) as Array<keyof typeof AXIS_LABELS>).map((key) => {
        const val = axes[key] ?? 0;
        const { bar, text } = axisColor(val);
        return (
          <div key={key} className="flex items-center gap-2.5">
            <span className="text-xs text-muted-foreground w-24 shrink-0">{AXIS_LABELS[key]}</span>
            <div className="flex-1 h-1.5 bg-muted/60 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${bar}`}
                style={{ width: `${val}%` }}
              />
            </div>
            <span className={`text-xs font-bold w-7 text-right tabular-nums ${text}`}>{val}</span>
          </div>
        );
      })}
    </div>
  );
}

interface SecurityFlagListProps {
  flags: string[];
}

export function SecurityFlagList({ flags }: SecurityFlagListProps) {
  if (flags.length === 0) return null;
  return (
    <div className="space-y-2.5">
      {flags.map((flag, i) => (
        <div
          key={i}
          className="flex items-start gap-3 text-sm bg-red-950/50 text-foreground border border-red-500/25 rounded-lg px-4 py-3"
        >
          <span className="mt-0.5 shrink-0 text-red-400 text-base leading-none">⚠</span>
          <span className="leading-relaxed">{flag}</span>
        </div>
      ))}
    </div>
  );
}

interface ImprovementListProps {
  improvements: string[];
}

export function ImprovementList({ improvements }: ImprovementListProps) {
  if (improvements.length === 0) return null;
  return (
    <ol className="space-y-3.5">
      {improvements.map((item, i) => (
        <li key={i} className="flex items-start gap-3.5">
          <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-400 text-xs flex items-center justify-center font-bold mt-0.5 border border-emerald-500/25">
            {i + 1}
          </span>
          <span className="text-sm text-foreground/85 leading-relaxed">{item}</span>
        </li>
      ))}
    </ol>
  );
}

interface VersionBadgeProps {
  version: string;
  active?: boolean;
}

export function VersionBadge({ version, active }: VersionBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono font-semibold border ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-muted text-muted-foreground border-border"
      }`}
    >
      {version}
    </span>
  );
}

interface TokenEstimateProps {
  tokens: number;
}

export function TokenEstimate({ tokens }: TokenEstimateProps) {
  const color =
    tokens < 500 ? "text-emerald-400" : tokens < 1000 ? "text-yellow-400" : "text-red-400";
  return (
    <span className={`text-xs font-mono font-semibold ${color}`}>
      ~{tokens.toLocaleString()} tokens
    </span>
  );
}
