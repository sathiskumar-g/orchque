"use client";

import { useState } from "react";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { notFound, useRouter } from "next/navigation";
import type { Skill, SkillVersion, OptimizerResult } from "@/types/skill";
import { ScoreRing, ScoreAxes, SecurityFlagList, ImprovementList, VersionBadge, TokenEstimate } from "@/components/skills/ScoreDisplay";
import { SkillDiff } from "@/components/skills/SkillDiff";
import { OptimizerWidget } from "@/components/skills/OptimizerWidget";
import { Download, GitCompare, Loader2 } from "lucide-react";

interface SkillDetailClientProps {
  skill: Skill;
  versions: SkillVersion[];
}

function downloadMd(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function SkillDetailClient({ skill, versions: initialVersions }: SkillDetailClientProps) {
  const [optimizeOpen, setOptimizeOpen] = useState(false);
  const [versions, setVersions] = useState(initialVersions);
  const [selectedId, setSelectedId] = useState(
    initialVersions.find((v) => v.is_active)?.id ?? initialVersions[initialVersions.length - 1]?.id
  );
  const [showDiff, setShowDiff] = useState(false);
  const [optimizeKey, setOptimizeKey] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialVersions.length >= 5);

  const selected = versions.find((v) => v.id === selectedId) ?? versions[versions.length - 1];
  const v1 = versions.length > 0 ? versions[0] : null; // first in current list

  function handleOptimizeResult(result: OptimizerResult & { version_id?: string; version?: string }) {
    // Refresh versions by adding the new one
    if (result.version_id && result.version) {
      const newVersion: SkillVersion = {
        id: result.version_id,
        skill_id: skill.id,
        version: result.version,
        content: result.optimized_content,
        score: result.score,
        token_estimate: result.token_estimate,
        token_reduction_pct: result.token_reduction_pct,
        security_flags: result.security_flags,
        improvements: result.improvements,
        axes: result.axes,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      setVersions((prev) => [
        ...prev.map((v) => ({ ...v, is_active: false })),
        newVersion,
      ]);
      setSelectedId(newVersion.id);
      setOptimizeKey((k) => k + 1);
    }
  }

  async function handleLoadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/skills/${skill.id}/versions?offset=${versions.length}&limit=5`
      );
      const data = (await res.json()) as Record<string, unknown>;
      if (res.ok && Array.isArray(data.versions)) {
        const moreVersions = (data.versions as SkillVersion[]) || [];
        setVersions((prev) => [...prev, ...moreVersions]);
        setHasMore(!!data.hasMore);
      }
    } finally {
      setLoadingMore(false);
    }
  }


  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{skill.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {versions.length} version{versions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Optimize button (modal trigger) */}
          <Dialog open={optimizeOpen} onOpenChange={setOptimizeOpen}>
            <DialogTrigger asChild>
              <button
                className="h-9 px-3 rounded-md border text-sm font-medium flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                onClick={() => setOptimizeOpen(true)}
              >
                <span role="img" aria-label="Optimize">⚒️</span> Optimize
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl w-full p-0 overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><span role="img" aria-label="Optimize">🧪</span> Optimize Skill</h2>
                <OptimizerWidget
                  mode="skill"
                  skillId={skill.id}
                  initialContent={selected?.content ?? ""}
                  onResult={(r) => { handleOptimizeResult(r as OptimizerResult & { version_id?: string; version?: string }); setOptimizeOpen(false); }}
                />
              </div>
            </DialogContent>
          </Dialog>
          {/* Version selector */}
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="h-9 rounded-md border bg-muted/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {[...versions].reverse().map((v) => (
              <option key={v.id} value={v.id}>
                {v.version}{v.is_active ? " (active)" : ""}
                {v.score != null ? ` · ${v.score}` : ""}
              </option>
            ))}
          </select>
          {/* Diff toggle — only if more than 1 version */}
          {versions.length > 1 && (
            <button
              onClick={() => setShowDiff((s) => !s)}
              className={`h-9 px-3 rounded-md border text-sm font-medium flex items-center gap-2 transition-colors ${
                showDiff ? "bg-accent" : "hover:bg-accent"
              }`}
            >
              <GitCompare className="h-3.5 w-3.5" />
              {showDiff ? "Hide diff" : "Show diff"}
            </button>
          )}
          {selected && (
            <button
              onClick={() => downloadMd(selected.content, `${skill.name}-${selected.version}.md`)}
              className="h-9 px-3 rounded-md border text-sm font-medium flex items-center gap-2 hover:bg-accent transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
          )}
        </div>
      </div>

      {/* Diff view */}
      {showDiff && versions.length > 1 && v1 && selected && v1.id !== selected.id && (
        <div className="rounded-lg border bg-card p-5">
          <h2 className="text-sm font-semibold mb-4">Diff — {v1.version} vs {selected.version}</h2>
          <SkillDiff original={v1.content} optimized={selected.content} />
        </div>
      )}

      {/* Main content — single column, no optimize section inside */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Content</h2>
          <VersionBadge version={selected?.version ?? ""} active={selected?.is_active} />
          {selected?.token_estimate != null && (
            <TokenEstimate tokens={selected.token_estimate} />
          )}
        </div>
        <pre className="text-xs bg-muted rounded-md p-4 overflow-auto max-h-96 whitespace-pre-wrap break-words font-mono leading-relaxed">
          {selected?.content ?? "—"}
        </pre>
      </div>

      {/* Version history */}
      {versions.length > 1 && (
        <div className="rounded-lg border bg-card p-5">
          <h2 className="text-sm font-semibold mb-3">Version history</h2>
          <div className="space-y-2">
            {[...versions].reverse().map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedId(v.id)}
                className={`w-full flex items-center justify-between rounded-md px-3 py-2.5 text-sm transition-colors text-left ${
                  v.id === selectedId ? "bg-accent" : "hover:bg-muted/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <VersionBadge version={v.version} active={v.is_active} />
                  <span className="text-xs text-muted-foreground">
                    {new Date(v.created_at).toLocaleDateString()}
                  </span>
                </div>
                {v.score != null && (
                  <span className={`text-sm font-bold ${
                    v.score >= 75 ? "text-emerald-400" : v.score >= 50 ? "text-yellow-400" : "text-red-400"
                  }`}>
                    {v.score}
                  </span>
                )}
              </button>
            ))}
          </div>
          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="mt-4 w-full h-9 rounded-md border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {loadingMore ? "Loading..." : "Load more versions"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Re-export notFound so the server page can use it via the client module boundary
export { notFound };
export { useRouter };
