"use client";

import Link from "next/link";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import type { Skill, SkillVersion } from "@/types/skill";

type SkillWithLatest = Skill & {
  latest_version: Pick<SkillVersion, "version" | "score" | "token_estimate" | "is_active" | "created_at"> | null;
  version_count: number;
};

interface SkillCardProps {
  skill: SkillWithLatest;
}

// 50 famous animal/bird/sea emojis — skips weird/obscure ones
const EMOJIS = [
  "🦁","🐯","🐻","🐼","🦊","🐺","🐘","🦒","🦓","🦏",
  "🐆","🦬","🐪","🦙","🐅","🦅","🦆","🦉","🦚","🦜",
  "🦩","🦢","🕊️","🐧","🦃","🐬","🐳","🐋","🦈","🐙",
  "🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐢","🐸","🐒",
  "🦍","🐇","🐈","🐕","🦮","🐝","🦋","🐄","🐖","🐑",
];

const COLORS = [
  { border: "border-violet-500/25", bg: "bg-violet-500/5",  dot: "bg-violet-400"  },
  { border: "border-blue-500/25",   bg: "bg-blue-500/5",    dot: "bg-blue-400"    },
  { border: "border-emerald-500/25",bg: "bg-emerald-500/5", dot: "bg-emerald-400" },
  { border: "border-amber-500/25",  bg: "bg-amber-500/5",   dot: "bg-amber-400"   },
  { border: "border-rose-500/25",   bg: "bg-rose-500/5",    dot: "bg-rose-400"    },
  { border: "border-cyan-500/25",   bg: "bg-cyan-500/5",    dot: "bg-cyan-400"    },
  { border: "border-indigo-500/25", bg: "bg-indigo-500/5",  dot: "bg-indigo-400"  },
  { border: "border-teal-500/25",   bg: "bg-teal-500/5",    dot: "bg-teal-400"    },
  { border: "border-pink-500/25",   bg: "bg-pink-500/5",    dot: "bg-pink-400"    },
  { border: "border-orange-500/25", bg: "bg-orange-500/5",  dot: "bg-orange-400"  },
];

function hashId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash;
}

function getPalette(id: string) {
  const h = hashId(id);
  return {
    ...COLORS[h % COLORS.length],
    emoji: EMOJIS[h % EMOJIS.length],
  };
}

export function SkillCard({ skill }: SkillCardProps) {
  const latest = skill.latest_version;
  const palette = getPalette(skill.id);

  const dateStr = latest
    ? new Date(latest.created_at).toLocaleDateString()
    : new Date(skill.created_at).toLocaleDateString();

  const versionLabel = latest?.version ?? "—";
  const scoreLabel = latest?.score != null ? `Score ${latest.score}` : "Not scored";

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/share/${skill.id}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Link copied! Share it with anyone.");
    }).catch(() => {
      toast.error("Could not copy link.");
    });
  };

  return (
    <Link
      href={`/dashboard/skills/${skill.id}`}
      className={`group relative block rounded-2xl border ${palette.border} ${palette.bg} aspect-square flex flex-col hover:border-primary/40 transition-colors shadow-sm`}
    >
      {/* Share button — top-right corner */}
      <button
        onClick={handleShare}
        aria-label="Share skill"
        className="absolute top-2.5 right-2.5 h-7 w-7 rounded-full flex items-center justify-center bg-background/80 border border-border/60 hover:bg-accent z-10"
      >
        <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {/* Security badge — top-left corner, only when scored */}
      {latest?.score != null && (
        <div
          aria-label={`Security checked — Score ${latest.score}`}
          title={`Security checked — Score ${latest.score}`}
          className="absolute top-2.5 left-2.5 h-7 w-7 rounded-full flex items-center justify-center bg-emerald-500/15 border border-emerald-500/30 z-10"
        >
          <span className="text-sm leading-none select-none">🛡️</span>
        </div>
      )}

      {/* Emoji area — top ~55% */}
      <div className="flex-1 flex items-center justify-center">
        <span className="text-5xl select-none leading-none" role="img">{palette.emoji}</span>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-border/60" />

      {/* 3-row list — bottom */}
      <div className="px-4 py-3 space-y-1.5">
        {/* Row 1 — skill name */}
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${palette.dot}`} />
          <span className="text-xs font-semibold truncate group-hover:text-primary transition-colors">
            {skill.name}
          </span>
          {skill.source === "optimized" && (
            <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25 leading-none">✨ Optimized</span>
          )}
          {skill.source === "generated" && (
            <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 leading-none">⚡ Generated</span>
          )}
        </div>
        {/* Row 2 — version */}
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${palette.dot}`} />
          <span className="text-xs text-muted-foreground truncate">{versionLabel} · {scoreLabel}</span>
        </div>
        {/* Row 3 — date */}
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${palette.dot}`} />
          <span className="text-xs text-muted-foreground truncate">{dateStr}</span>
        </div>
      </div>
    </Link>
  );
}
