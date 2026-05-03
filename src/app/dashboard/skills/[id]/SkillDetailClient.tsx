"use client";

import { useState, useRef } from "react";
import { notFound, useRouter } from "next/navigation";
import type { Skill, SkillVersion, OptimizerResult } from "@/types/skill";
import { ScoreRing, ScoreAxes, SecurityFlagList, ImprovementList, VersionBadge, TokenEstimate } from "@/components/skills/ScoreDisplay";
import { SkillDiff } from "@/components/skills/SkillDiff";
import { Download, GitCompare, Loader2, Pencil, Check, X, ChevronDown, ChevronUp, Sparkles, ArrowLeft } from "lucide-react";
import { CopyButton } from "@/components/ui/CopyButton";
import { SkillPackageViewer } from "@/components/skills/SkillPackageViewer";

const RUNNING_ANIMALS = ["🐎", "🦌", "🐕", "🐇", "🦘", "🐆"];

function AnimalLoader() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8">
      <div className="relative h-16 overflow-hidden w-full max-w-xs">
        <span className="absolute text-5xl" style={{ animation: "animal-run 1.4s linear infinite" }}>
          {RUNNING_ANIMALS[Math.floor(Date.now() / 1000) % RUNNING_ANIMALS.length]}
        </span>
      </div>
      <p className="text-sm text-muted-foreground animate-pulse">Optimizing skill…</p>
      <style>{`@keyframes animal-run { 0% { left: -10%; } 100% { left: 110%; } }`}</style>
    </div>
  );
}

interface SkillDetailClientProps {
  skill: Skill;
  versions: SkillVersion[];
  plan: "free" | "pro";
}

type PendingResult = OptimizerResult & {
  next_version: string;
  original_content: string;
  original_version: string;
};

function downloadMd(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function scoreColor(s: number) {
  return s >= 75 ? "text-emerald-400" : s >= 50 ? "text-yellow-400" : "text-red-400";
}

export function SkillDetailClient({ skill, versions: initialVersions, plan }: SkillDetailClientProps) {
  const router = useRouter();
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);
  const [versions, setVersions] = useState(initialVersions);
  const [pendingResult, setPendingResult] = useState<PendingResult | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);

  // name inline edit
  const [skillName, setSkillName] = useState(skill.name);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(skill.name);
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // context
  const [context, setContext] = useState(skill.context ?? "");
  const [contextSavedValue, setContextSavedValue] = useState(skill.context ?? "");
  const [contextDirty, setContextDirty] = useState(false);
  const [savingContext, setSavingContext] = useState(false);
  const [contextSaveStatus, setContextSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const contextRef = useRef<HTMLTextAreaElement>(null);

  const [selectedId, setSelectedId] = useState(
    initialVersions.find((v) => v.is_active)?.id ?? initialVersions[initialVersions.length - 1]?.id
  );
  const [showDiff, setShowDiff] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialVersions.length >= 5);

  // content editing
  const [editingContent, setEditingContent] = useState(false);
  const [contentDraft, setContentDraft] = useState("");
  const [savingVersion, setSavingVersion] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);

  function startEditContent() {
    setContentDraft(selected?.content ?? "");
    setVersionError(null);
    setEditingContent(true);
  }
  function cancelEditContent() { setEditingContent(false); setVersionError(null); }

  async function handleSaveAsVersion() {
    if (!contentDraft.trim() || contentDraft.trim() === selected?.content?.trim()) {
      setEditingContent(false);
      return;
    }
    setSavingVersion(true); setVersionError(null);
    try {
      const res = await fetch(`/api/skills/${skill.id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: contentDraft.trim() }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) { setVersionError((data.error as string) ?? "Failed to save version."); return; }
      const newVersion = data.version as SkillVersion;
      setVersions((prev) => [...prev.map((v) => ({ ...v, is_active: false })), newVersion]);
      setSelectedId(newVersion.id);
      setEditingContent(false);
    } catch { setVersionError("Network error. Please try again."); }
    finally { setSavingVersion(false); }
  }

  const selected = versions.find((v) => v.id === selectedId) ?? versions[versions.length - 1];
  const activeVersion = versions.find((v) => v.is_active) ?? versions[versions.length - 1];

  // â”€â”€ context â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function saveContext(value: string) {
    if (value === contextSavedValue) return;
    setSavingContext(true); setContextSaveStatus("saving");
    try {
      const res = await fetch(`/api/skills/${skill.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: value }),
      });
      if (res.ok) {
        setContextSavedValue(value); setContextDirty(false);
        setContextSaveStatus("saved");
        setTimeout(() => setContextSaveStatus("idle"), 2000);
      } else { setContextSaveStatus("error"); }
    } catch { setContextSaveStatus("error"); }
    finally { setSavingContext(false); }
  }
  function cancelContext() { setContext(contextSavedValue); setContextDirty(false); setContextSaveStatus("idle"); }

  // â”€â”€ name â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function startEditName() { setNameDraft(skillName); setNameError(null); setEditingName(true); setTimeout(() => nameRef.current?.focus(), 40); }
  function cancelEditName() { setNameDraft(skillName); setNameError(null); setEditingName(false); }
  async function commitEditName() {
    const trimmed = nameDraft.trim();
    if (!trimmed) { setNameError("Name cannot be empty."); return; }
    if (trimmed.length > 120) { setNameError("Name must be 120 characters or fewer."); return; }
    if (!/^[\p{L}\p{N} '\-_]+$/u.test(trimmed)) { setNameError("Only letters, numbers, spaces and -_' allowed."); return; }
    if (trimmed === skillName) { setEditingName(false); return; }
    setSavingName(true); setNameError(null);
    try {
      const res = await fetch(`/api/skills/${skill.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) { setNameError((data.error as string) ?? "Failed to save name."); return; }
      setSkillName(trimmed); setEditingName(false);
    } catch { setNameError("Network error."); }
    finally { setSavingName(false); }
  }

  // â”€â”€ optimize â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function handleOneClickOptimize() {
    setShowOptimizeModal(true);
    setOptimizing(true); setOptimizeError(null); setPendingResult(null);
    try {
      if (contextDirty) await saveContext(context);
      const res = await fetch(`/api/skills/${skill.id}/optimize`, { method: "POST" });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) { setOptimizeError((data.error as string) ?? "Optimization failed."); return; }
      setPendingResult(data as PendingResult);
    } catch { setOptimizeError("Network error. Please try again."); }
    finally { setOptimizing(false); }
  }

  async function handleAcceptResult() {
    if (!pendingResult) return;
    setAccepting(true);
    try {
      const res = await fetch(`/api/skills/${skill.id}/versions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: pendingResult.optimized_content,
          score: pendingResult.score,
          token_estimate: pendingResult.token_estimate,
          token_reduction_pct: pendingResult.token_reduction_pct,
          security_flags: pendingResult.security_flags,
          improvements: pendingResult.improvements,
          axes: pendingResult.axes,
        }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) { setOptimizeError((data.error as string) ?? "Failed to save."); return; }
      const newVersion = data.version as SkillVersion;
      setVersions((prev) => [...prev.map((v) => ({ ...v, is_active: false })), newVersion]);
      setSelectedId(newVersion.id);
      setPendingResult(null);
      setShowOptimizeModal(false);
    } catch { setOptimizeError("Network error. Please try again."); }
    finally { setAccepting(false); }
  }

  async function handleLoadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/skills/${skill.id}/versions?offset=${versions.length}&limit=5`);
      const data = (await res.json()) as Record<string, unknown>;
      if (res.ok && Array.isArray(data.versions)) {
        setVersions((prev) => [...prev, ...(data.versions as SkillVersion[])]);
        setHasMore(!!data.hasMore);
      }
    } finally { setLoadingMore(false); }
  }

  return (
    <div className="max-w-5xl space-y-6">

      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Skills
      </button>

      {/* â”€â”€ Header: name + actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <input
                  ref={nameRef} value={nameDraft} maxLength={200} disabled={savingName}
                  onChange={(e) => { setNameDraft(e.target.value); setNameError(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") commitEditName(); if (e.key === "Escape") cancelEditName(); }}
                  className="text-2xl font-bold bg-transparent border-b-2 border-primary outline-none w-full max-w-md disabled:opacity-60"
                />
                <button onClick={commitEditName} disabled={savingName} className="p-1 rounded hover:bg-accent text-emerald-500 disabled:opacity-50">
                  {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
                <button onClick={cancelEditName} disabled={savingName} className="p-1 rounded hover:bg-accent text-muted-foreground disabled:opacity-50">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {nameError && <p className="text-xs text-destructive">{nameError}</p>}
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1 className="text-2xl font-bold">{skillName}</h1>
              {skill.source === "optimized" && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25">✨ Optimized</span>
              )}
              {skill.source === "generated" && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">⚡ Generated</span>
              )}
              <button onClick={startEditName} className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-accent text-muted-foreground transition-opacity">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            {versions.length} version{versions.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleOneClickOptimize} disabled={optimizing || !!pendingResult}
            className="h-9 px-4 rounded-md border text-sm font-medium flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {optimizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {optimizing ? "Optimizingâ€¦" : "Optimize"}
          </button>
          {selected && (
            <button
              onClick={() => downloadMd(selected.content, `${skillName}-${selected.version}.md`)}
              className="h-9 px-3 rounded-md border text-sm font-medium flex items-center gap-2 hover:bg-accent transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> Download
            </button>
          )}
        </div>
      </div>

      {/* â”€â”€ Info row: context (left 50%) + version history (right 50%) â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">

        {/* Context card */}
        <div className="rounded-lg border border-border/60 bg-muted/20 px-4 pt-3 pb-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">Context</span>
            <span className="text-[11px] text-muted-foreground flex items-center gap-2">
              {contextSaveStatus === "saving" && <span className="animate-pulse">savingâ€¦</span>}
              {contextSaveStatus === "saved" && <span className="text-emerald-500 font-medium">âœ“ saved</span>}
              {contextSaveStatus === "error" && <span className="text-destructive">failed to save</span>}
              <span className={context.length > 230 ? "text-amber-500" : ""}>{context.length}/250</span>
            </span>
          </div>
          <textarea
            ref={contextRef} value={context} rows={3} disabled={savingContext}
            onChange={(e) => { setContext(e.target.value.slice(0, 250)); setContextDirty(true); setContextSaveStatus("idle"); }}
            className="w-full bg-transparent text-sm resize-none outline-none placeholder:text-muted-foreground/40 disabled:opacity-60 leading-relaxed"
            placeholder="Why does this skill exist? What problem it solves and its impactâ€¦"
          />
          {contextDirty && (
            <div className="flex items-center gap-2 pt-1 border-t border-border/40">
              <button onClick={() => saveContext(context)} disabled={savingContext}
                className="h-7 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {savingContext ? "Savingâ€¦" : "Save"}
              </button>
              <button onClick={cancelContext} disabled={savingContext}
                className="h-7 px-3 rounded-md border text-xs font-medium hover:bg-accent transition-colors disabled:opacity-50">
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Version history */}
        <div className="rounded-lg border border-border/60 bg-muted/20 px-4 pt-3 pb-3 flex flex-col min-h-0">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70 shrink-0">Version History</span>
          <div className="overflow-y-auto space-y-1 mt-1" style={{maxHeight: "9rem"}}>
            {[...versions].reverse().map((v) => (
              <button
                key={v.id} onClick={() => setSelectedId(v.id)}
                className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors text-left ${v.id === selectedId ? "bg-accent" : "hover:bg-muted/60"}`}
              >
                <div className="flex items-center gap-2">
                  <VersionBadge version={v.version} active={v.is_active} />
                  <span className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</span>
                </div>
                {v.score != null && (
                  <span className={`text-sm font-bold tabular-nums ${scoreColor(v.score)}`}>{v.score}</span>
                )}
              </button>
            ))}
          </div>
          {hasMore && (
            <button onClick={handleLoadMore} disabled={loadingMore}
              className="w-full h-7 text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 disabled:opacity-50">
              {loadingMore ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              {loadingMore ? "Loadingâ€¦" : "Load more"}
            </button>
          )}
        </div>
      </div>

      {optimizeError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive flex items-center justify-between">
          {optimizeError}
          <button onClick={() => setOptimizeError(null)} className="ml-2 text-destructive/60 hover:text-destructive"><X className="h-4 w-4" /></button>
        </div>
      )}
      {/* ── Original content + analytics ─────────────────────────────────────── */}
      <div className="rounded-lg border bg-card p-5 space-y-5">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm font-semibold">Content</h2>
          <VersionBadge version={selected?.version ?? ""} active={selected?.is_active} />
          {selected?.token_estimate != null && <TokenEstimate tokens={selected.token_estimate} />}
          {skill.is_package && (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">Package</span>
          )}
          <div className="ml-auto flex items-center gap-2">
            {!skill.is_package && !editingContent && (
              <>
                <CopyButton text={selected?.content ?? ""} />
                <button
                  onClick={startEditContent}
                  className="h-7 px-2.5 rounded-md border text-xs font-medium flex items-center gap-1.5 hover:bg-accent transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
              </>
            )}
            {versions.length > 1 && (
              plan === "pro" ? (
                <button
                  onClick={() => setShowDiff((s) => !s)}
                  className={`h-7 px-3 rounded-md border text-xs font-medium flex items-center gap-1.5 transition-colors ${showDiff ? "bg-accent" : "hover:bg-accent"}`}
                >
                  <GitCompare className="h-3 w-3" />
                  {showDiff ? "Hide diff" : "View diff"}
                  {showDiff ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              ) : (
                <a
                  href="/pricing"
                  className="h-7 px-3 rounded-md border text-xs font-medium flex items-center gap-1.5 text-muted-foreground hover:bg-accent transition-colors"
                  title="Diff view is a Pro feature"
                >
                  <GitCompare className="h-3 w-3" />
                  View diff
                  <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-1 py-0.5 leading-none">Pro</span>
                </a>
              )
            )}
          </div>
        </div>

        {/* Analytics: score ring + axes */}
        {selected?.score != null && (
          <div className="flex gap-6 items-start flex-wrap">
            <ScoreRing score={selected.score} />
            {selected.axes && <ScoreAxes axes={selected.axes} />}
          </div>
        )}

        {/* Package viewer or single-file editor */}
        {skill.is_package && selected?.package_files && selected.package_files.length > 0 ? (
          <SkillPackageViewer
            files={selected.package_files}
            skillId={skill.id}
            onSaved={() => window.location.reload()}
          />
        ) : editingContent ? (
          <div className="space-y-2">
            <textarea
              value={contentDraft}
              onChange={(e) => setContentDraft(e.target.value)}
              className="w-full min-h-64 rounded-md border border-border/60 bg-muted/40 px-4 py-3 text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={savingVersion}
            />
            {versionError && <p className="text-xs text-destructive">{versionError}</p>}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveAsVersion}
                disabled={savingVersion || !contentDraft.trim()}
                className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {savingVersion ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Save as new version
              </button>
              <button
                onClick={cancelEditContent}
                disabled={savingVersion}
                className="h-8 px-3 rounded-md border text-xs font-medium hover:bg-accent transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="relative">
            <pre className="text-xs bg-muted rounded-md p-4 overflow-auto max-h-96 whitespace-pre-wrap break-words font-mono leading-relaxed">
              {selected?.content ?? "—"}
            </pre>
          </div>
        )}
      </div>

      {/* â”€â”€ Diff view â€” below content, always togglable â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showDiff && versions.length > 1 && (
        <div className="rounded-lg border bg-card p-5 space-y-4">
          {/* Select versions to diff */}
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-sm font-semibold flex items-center gap-2"><GitCompare className="h-4 w-4" /> Diff</h2>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="h-8 rounded-md border bg-muted/40 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {[...versions].reverse().map((v) => (
                <option key={v.id} value={v.id}>
                  {v.version}{v.is_active ? " (active)" : ""}{v.score != null ? ` · ${v.score}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Before/after score comparison in diff */}
          {versions.length > 1 && (() => {
            const base = versions[0];
            return (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-md border border-border/60 bg-muted/10 px-4 py-3 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Before — {base.version}</p>
                  {base.score != null && (
                    <div className="flex items-center gap-3">
                      <ScoreRing score={base.score} />
                      {base.axes && <ScoreAxes axes={base.axes} />}
                    </div>
                  )}
                  {base.token_estimate != null && <p className="text-xs text-muted-foreground">{"🏷️"} {base.token_estimate} tokens</p>}
                </div>
                <div className="rounded-md border border-border/60 bg-muted/10 px-4 py-3 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">After — {selected?.version ?? "—"}</p>
                  {selected?.score != null && (
                    <div className="flex items-center gap-3">
                      <ScoreRing score={selected.score} />
                      {selected.axes && <ScoreAxes axes={selected.axes} />}
                    </div>
                  )}
                  {selected?.token_estimate != null && (
                    <p className="text-xs text-muted-foreground">
                      {"🏷️"} {selected.token_estimate} tokens
                      {selected.token_reduction_pct != null && selected.token_reduction_pct > 0 && (
                        <span className="text-emerald-400 ml-1">{"−"}{selected.token_reduction_pct}%</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Text diff */}
          {versions[0]?.id !== selected?.id && (
            <SkillDiff original={versions[0].content} optimized={selected?.content ?? ""} />
          )}
        </div>
      )}

      {/* Optimize Modal */}
      {showOptimizeModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-card border border-border/60 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 shrink-0">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    {optimizing ? "🔍 Analyzing skill…" : pendingResult ? "✅ Analysis Complete" : optimizeError ? "❌ Optimization Failed" : "Optimizing…"}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {optimizing ? "Checking security, quality, and token efficiency" : pendingResult ? "Review changes and apply to save new version" : ""}
                  </p>
                </div>
                {!optimizing && pendingResult && (
                  <div className="flex items-center gap-1 ml-2">
                    <span className={`text-3xl font-bold tabular-nums leading-none ${pendingResult.score >= 75 ? "text-emerald-400" : pendingResult.score >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                      {pendingResult.score}
                    </span>
                    <span className="text-sm text-muted-foreground self-end pb-0.5">/100</span>
                    {activeVersion?.score != null && pendingResult.score !== activeVersion.score && (
                      <span className={`text-sm font-semibold ml-1 ${pendingResult.score > activeVersion.score ? "text-emerald-400" : "text-red-400"}`}>
                        ({pendingResult.score > activeVersion.score ? "+" : ""}{pendingResult.score - activeVersion.score})
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => { setPendingResult(null); setShowOptimizeModal(false); }}
                disabled={accepting}
                className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0 ml-4 disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto min-h-0">

              {/* Loading */}
              {optimizing && (
                <div className="p-6 space-y-6">
                  <AnimalLoader />
                  <div className="opacity-50 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Current — {activeVersion?.version}
                    </p>
                    {activeVersion?.score != null && (
                      <div className="flex gap-6 items-start">
                        <ScoreRing score={activeVersion.score} />
                        <div className="flex-1 min-w-0">
                          {activeVersion.axes && <ScoreAxes axes={activeVersion.axes} />}
                        </div>
                      </div>
                    )}
                    <pre className="text-xs bg-muted rounded-md p-4 overflow-auto max-h-40 whitespace-pre-wrap break-words font-mono leading-relaxed">
                      {activeVersion?.content ?? "—"}
                    </pre>
                  </div>
                </div>
              )}

              {/* Error */}
              {!optimizing && optimizeError && (
                <div className="p-6">
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm px-4 py-3">
                    {optimizeError}
                  </div>
                </div>
              )}

              {/* Result */}
              {!optimizing && pendingResult && (
                <div className="p-6 space-y-6">
                  {/* Metrics row */}
                  <div className="flex gap-6 items-start">
                    <ScoreRing score={pendingResult.score} />
                    <div className="flex-1 min-w-0">
                      {pendingResult.axes && <ScoreAxes axes={pendingResult.axes} />}
                    </div>
                  </div>

                  {/* Token badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {pendingResult.token_estimate != null && (
                      <div className="inline-flex items-center gap-1 rounded-full bg-muted/70 border border-border/50 px-3 py-1">
                        <TokenEstimate tokens={pendingResult.token_estimate} />
                      </div>
                    )}
                    {pendingResult.token_reduction_pct != null && pendingResult.token_reduction_pct > 0 && (
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-3 py-1">
                        <span className="text-xs font-semibold text-emerald-400">↓ {pendingResult.token_reduction_pct}% smaller after optimization</span>
                      </div>
                    )}
                  </div>

                  {/* Security flags */}
                  {pendingResult.security_flags?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-3">⚠ Security Issues</p>
                      <SecurityFlagList flags={pendingResult.security_flags} />
                    </div>
                  )}

                  <div className="h-px bg-border/40" />

                  {/* Improvements list */}
                  {pendingResult.improvements?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">🛠️ Changes to apply</p>
                      <ImprovementList improvements={pendingResult.improvements} />
                    </div>
                  )}

                  {/* Diff accordion */}
                  <div className="rounded-xl border border-border/60 bg-muted/20 overflow-hidden">
                    <button
                      onClick={() => setShowDiff((v) => !v)}
                      className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium hover:bg-muted/40 transition-colors"
                    >
                      <span>Before / After Diff</span>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showDiff ? "rotate-180" : ""}`} />
                    </button>
                    {showDiff && (
                      <div className="p-4 border-t border-border/40 overflow-auto max-h-72">
                        <SkillDiff original={pendingResult.original_content} optimized={pendingResult.optimized_content} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {!optimizing && pendingResult && (
              <div className="px-6 py-4 border-t border-border/40 shrink-0 flex items-center justify-between gap-3">
                <button
                  onClick={() => { setPendingResult(null); setShowOptimizeModal(false); }}
                  disabled={accepting}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  ← Discard
                </button>
                <button
                  onClick={handleAcceptResult} disabled={accepting}
                  className="h-10 px-6 rounded-lg bg-primary text-primary-foreground font-semibold text-sm inline-flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {accepting ? "Saving…" : "Apply Changes"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export { notFound };
export { useRouter };
