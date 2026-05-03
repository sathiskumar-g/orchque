type ColorVariant = "default" | "green" | "yellow" | "red" | "blue" | "purple";

interface StatsCardProps {
  label: string;
  value: string | number;
  description?: string;
  emoji: string;
  color?: ColorVariant;
  subValue?: string;
}

const colorMap: Record<ColorVariant, { card: string; value: string; dot: string }> = {
  default: { card: "border bg-card",                                     value: "text-foreground",     dot: "bg-muted-foreground/40" },
  green:   { card: "border border-emerald-500/25 bg-emerald-500/5",      value: "text-emerald-400",    dot: "bg-emerald-400" },
  yellow:  { card: "border border-yellow-500/25 bg-yellow-500/5",        value: "text-yellow-400",     dot: "bg-yellow-400" },
  red:     { card: "border border-red-500/25 bg-red-500/5",              value: "text-red-400",        dot: "bg-red-400" },
  blue:    { card: "border border-blue-500/25 bg-blue-500/5",            value: "text-blue-400",       dot: "bg-blue-400" },
  purple:  { card: "border border-purple-500/25 bg-purple-500/5",        value: "text-purple-400",     dot: "bg-purple-400" },
};

export default function StatsCard({ label, value, description, emoji, color = "default", subValue }: StatsCardProps) {
  const c = colorMap[color];
  return (
    <div className={`rounded-2xl shadow-sm flex flex-col ${c.card}`} style={{ width: 225, height: 225 }}>
      {/* Emoji area — top 55% */}
      <div className="flex-1 flex items-center justify-center">
        <span className="text-6xl select-none leading-none" role="img">{emoji}</span>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-border/60" />

      {/* 3-row list — bottom 45% */}
      <div className="px-4 py-3 space-y-1.5">
        {/* Row 1 — label */}
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${c.dot}`} />
          <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium truncate">{label}</span>
        </div>
        {/* Row 2 — value */}
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${c.dot}`} />
          <span className={`text-sm font-bold truncate ${c.value}`}>{value}</span>
        </div>
        {/* Row 3 — description */}
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${c.dot}`} />
          <span className="text-xs text-muted-foreground truncate">{subValue ?? description ?? "—"}</span>
        </div>
      </div>
    </div>
  );
}

