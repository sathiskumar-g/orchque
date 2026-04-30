"use client";

interface SkillDiffProps {
  original: string;
  optimized: string;
}

export function SkillDiff({ original, optimized }: SkillDiffProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Original</span>
        </div>
        <pre className="text-xs bg-muted rounded-md p-4 overflow-auto max-h-96 whitespace-pre-wrap break-words font-mono leading-relaxed">
          {original}
        </pre>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-emerald-400 uppercase tracking-wide">Optimized</span>
        </div>
        <pre className="text-xs bg-muted rounded-md p-4 overflow-auto max-h-96 whitespace-pre-wrap break-words font-mono leading-relaxed border border-emerald-400/20">
          {optimized}
        </pre>
      </div>
    </div>
  );
}
