
"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Loader2, Download, ArrowRight, Type, Upload, Link2, FileText, X, Zap, ChevronDown } from "lucide-react";
import Link from "next/link";
import type { ScoreResult } from "@/types/skill";
import { ScoreRing, ScoreAxes, SecurityFlagList, TokenEstimate } from "@/components/skills/ScoreDisplay";
import { SkillDiff } from "@/components/skills/SkillDiff";
import { MAX_INPUT_CHARS } from "@/lib/skill-optimizer-prompt";
import { getAnonTrialsUsed, hasAnonTrialsLeft, consumeAnonTrial, ANON_MAX_TRIALS, anonTrialResetSeconds } from "@/lib/anon-trials";
import { detectSensitiveData } from "@/lib/security-guards";


type InputTab = "input" | "drag" | "url";
type OptimizerPhase = "input" | "scoring" | "score-result" | "rewriting" | "final";

interface LoadedSource {
  type: "drag" | "url";
  label: string;
}

import type { OptimizerResult } from "@/types/skill";

interface OptimizerWidgetProps {
  mode: "anonymous" | "skill";
  skillId?: string;
  initialContent?: string;
  onResult?: (result: OptimizerResult) => void;
  /** Called with true when optimizer leaves input phase, false when it returns */
  onBusy?: (busy: boolean) => void;
}

function downloadMd(content: string, filename = "optimized-skill.md") {
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── FileSystem helpers ─────────────────────────────────────────────────────────

const MD_ONLY_EXTS = /\.md$/i;
const SKIP_DIRS = new Set([".git", "node_modules", ".next", "dist", "build", "__pycache__", ".venv"]);
const PRIMARY_FILES = new Set(["skill.md", "prompt.md", "main.md", "readme.md"]);

function readAllDirEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve) => {
    const all: FileSystemEntry[] = [];
    function batch() {
      reader.readEntries((items) => {
        if (items.length === 0) { resolve(all); return; }
        all.push(...items);
        batch();
      }, () => resolve(all));
    }
    batch();
  });
}

async function readFSEntry(entry: FileSystemEntry, depth = 0): Promise<{ path: string; content: string }[]> {
  if (depth > 5) return [];
  const name = entry.name;
  if (name.startsWith(".")) return [];

  if (entry.isFile) {
    if (!MD_ONLY_EXTS.test(name)) return [];
    const fe = entry as FileSystemFileEntry;
    return new Promise((resolve) => {
      fe.file(
        (file) => {
          const reader = new FileReader();
          reader.onload = () => resolve([{ path: (entry as FileSystemEntry & { fullPath?: string }).fullPath ?? name, content: reader.result as string }]);
          reader.onerror = () => resolve([]);
          reader.readAsText(file);
        },
        () => resolve([])
      );
    });
  }

  if (entry.isDirectory) {
    if (SKIP_DIRS.has(name)) return [];
    const de = entry as FileSystemDirectoryEntry;
    const children = await readAllDirEntries(de.createReader());
    const nested = await Promise.all(children.map((c) => readFSEntry(c, depth + 1)));
    return nested.flat();
  }

  return [];
}

function combineFiles(files: { path: string; content: string }[]): string {
  const sorted = [...files].sort((a, b) => {
    const na = (a.path.split("/").pop() ?? "").toLowerCase();
    const nb = (b.path.split("/").pop() ?? "").toLowerCase();
    return (PRIMARY_FILES.has(na) ? 0 : 1) - (PRIMARY_FILES.has(nb) ? 0 : 1) || na.localeCompare(nb);
  });
  return sorted.map((f) => `<!-- ${f.path} -->\n${f.content.trim()}`).join("\n\n").slice(0, MAX_INPUT_CHARS);
}

// ── SKILL.md referenced-file parsing ─────────────────────────────────────────

/** Extract relative file paths referenced inside a SKILL.md. */
function extractReferencedPaths(content: string): string[] {
  const paths = new Set<string>();

  // Markdown links: [text](./path/file.md)  — skip http URLs and anchors
  for (const m of content.matchAll(/\[.*?\]\(([^)#]+)\)/g)) {
    const p = m[1].trim();
    if (!p.startsWith("http") && !p.startsWith("//") && !p.startsWith("#")) {
      paths.add(p.replace(/^\.\//, ""));
    }
  }

  // Backtick / quoted paths with folder prefix: `scripts/run.sh`, "references/api.md"
  for (const m of content.matchAll(/[`"']((?:scripts|references|assets|memory|logs?)\/?[\w./\-]+)[`"']/gi)) {
    paths.add(m[1]);
  }

  // Bare relative paths: scripts/run.sh  references/style.md  memory.md  log.md
  for (const m of content.matchAll(/\b((?:scripts|references|assets|memory|logs?)\/[\w./\-]+)/gi)) {
    paths.add(m[1]);
  }

  // Top-level companion files mentioned anywhere: memory.md, log.md
  for (const m of content.matchAll(/\b((?:memory|log|changelog|notes)\.md)\b/gi)) {
    paths.add(m[1]);
  }

  return [...paths];
}

/** Given all files from a folder drop and a SKILL.md, return only the SKILL.md
 *  plus files that are explicitly referenced inside it. */
function filterBySkillReferences(
  allFiles: { path: string; content: string }[],
  skillFile: { path: string; content: string }
): { files: { path: string; content: string }[]; missingRefs: string[] } {
  const referencedPaths = extractReferencedPaths(skillFile.content);

  if (referencedPaths.length === 0) {
    return { files: [skillFile], missingRefs: [] };
  }

  const included = new Map<string, { path: string; content: string }>();
  included.set(skillFile.path, skillFile);
  const missingRefs: string[] = [];

  for (const refPath of referencedPaths) {
    const normRef = refPath.replace(/\\/g, "/").toLowerCase();
    const match = allFiles.find((f) => {
      const normPath = f.path.replace(/\\/g, "/").toLowerCase();
      // Match by suffix: either ends with /ref or equals ref
      return normPath.endsWith("/" + normRef) || normPath === normRef || normPath.endsWith(normRef);
    });
    if (match) {
      included.set(match.path, match);
    } else {
      missingRefs.push(refPath);
    }
  }

  return { files: [...included.values()], missingRefs };
}

// ── Memory section trimming ───────────────────────────────────────────────────

// Sections always included regardless of skill content (global rules / constraints)
const ALWAYS_INCLUDE_SECTIONS = new Set([
  "constraints", "preferences", "rules", "critical", "security",
  "output", "format", "config", "settings",
]);

/** Parse a memory file into named sections. Supports [section-name] and ## Heading formats. */
function parseMemorySections(memoryContent: string): { heading: string; content: string }[] {
  const sections: { heading: string; content: string }[] = [];
  const parts = memoryContent.split(/(?=^\[[^\]]+\]|^##\s+)/m);
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const headingMatch = trimmed.match(/^(?:\[([^\]]+)\]|##\s+(.+))/);
    if (headingMatch) {
      const heading = (headingMatch[1] ?? headingMatch[2]).trim().toLowerCase();
      sections.push({ heading, content: trimmed });
    } else if (sections.length === 0) {
      // Preamble before any heading — keep as global context
      sections.push({ heading: "__preamble__", content: trimmed });
    }
  }
  return sections;
}

/**
 * Return only the sections of memory.md that are relevant to the skill content.
 * Always includes constraint/rule/preference sections.
 * Filters by heading keyword or bullet keyword overlap with the skill.
 */
function trimMemoryToSkill(skillContent: string, memoryContent: string): string {
  const sections = parseMemorySections(memoryContent);
  if (sections.length === 0) return memoryContent;

  const skillLower = skillContent.toLowerCase();

  const relevant = sections.filter(({ heading, content }) => {
    if (heading === "__preamble__") return true;
    if (ALWAYS_INCLUDE_SECTIONS.has(heading)) return true;
    if (skillLower.includes(heading)) return true;
    // Include if any keyword (≥5 chars) from this section appears in the skill
    const keywords = content.match(/\b[a-z_][a-z0-9_]{4,}\b/gi) ?? [];
    return keywords.some((kw) => skillLower.includes(kw.toLowerCase()));
  });

  if (relevant.length === 0) return memoryContent;
  return relevant.map((s) => s.content).join("\n\n");
}

// ── Component ──────────────────────────────────────────────────────────────────

export function OptimizerWidget({ mode, skillId, initialContent = "", onResult, onBusy }: OptimizerWidgetProps) {
  const [content, setContent] = useState(initialContent);
  const [businessContext, setBusinessContext] = useState("");
  const [showContext, setShowContext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<OptimizerPhase>("input");
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [optimizedContent, setOptimizedContent] = useState<string | null>(null);
  const [selectedFixes, setSelectedFixes] = useState<Set<string>>(new Set());
  const [showFullDiff, setShowFullDiff] = useState(false);
  // true when content came from a single file (not a multi-file folder drop)
  const [isSingleFile, setIsSingleFile] = useState(true);

  // Anonymous trial state
  const [trialsUsed, setTrialsUsed] = useState(0);
  const [resetCountdown, setResetCountdown] = useState(0);

  // Tab state (input modes)
  const [tab, setTab] = useState<InputTab>("input");
  const [dragOver, setDragOver] = useState(false);
  const [dragProcessing, setDragProcessing] = useState(false);
  const [loadedSource, setLoadedSource] = useState<LoadedSource | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tokens = Math.ceil(content.length / 4);
  const overLimit = content.length > MAX_INPUT_CHARS;
  const sensitiveFindings = useMemo(
    () => detectSensitiveData(`${content}\n${businessContext}`),
    [content, businessContext]
  );
  const sensitiveTypes = useMemo(
    () => [...new Set(sensitiveFindings.map((f) => f.type))],
    [sensitiveFindings]
  );

  // Update anonymous trial count on mount
  useEffect(() => {
    if (mode === "anonymous") {
      setTrialsUsed(getAnonTrialsUsed());
      const timer = setInterval(() => setResetCountdown(anonTrialResetSeconds()), 1000);
      return () => clearInterval(timer);
    }
  }, [mode]);

  // Notify parent when optimizer leaves/returns to idle state
  useEffect(() => {
    onBusy?.(phase !== "input");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function clearContent() {
    setContent("");
    setLoadedSource(null);
    setUrlInput("");
    setUrlError(null);
    setIsSingleFile(true);
  }

  // ── Drag / file handlers ────────────────────────────────────────────────────

  async function processEntries(entries: FileSystemEntry[]) {
    setDragProcessing(true);
    setError(null);
    try {
      // Read ALL .md files from the dropped folder
      const allFiles = (await Promise.all(entries.map((e) => readFSEntry(e)))).flat();
      if (allFiles.length === 0) {
        setError("No .md files found. Drop a skill folder with SKILL.md or other markdown files.");
        return;
      }

      // Single file — use directly
      if (allFiles.length === 1) {
        setContent(allFiles[0].content.slice(0, MAX_INPUT_CHARS));
        setLoadedSource({ type: "drag", label: allFiles[0].path.split("/").pop() ?? allFiles[0].path });
        setIsSingleFile(true);
        return;
      }

      // Multiple files — look for SKILL.md and use only referenced files
      const skillMd = allFiles.find(
        (f) => (f.path.split("/").pop() ?? "").toLowerCase() === "skill.md"
      );

      if (skillMd) {
        const { files: filtered } = filterBySkillReferences(allFiles, skillMd);
        // Trim memory/log files to only sections relevant to this skill
        const finalFiles = filtered.map((f) => {
          const name = (f.path.split("/").pop() ?? "").toLowerCase();
          if (name === "memory.md" || name === "log.md") {
            return { ...f, content: trimMemoryToSkill(skillMd.content, f.content) };
          }
          return f;
        });
        const combined =
          finalFiles.length === 1
            ? finalFiles[0].content.slice(0, MAX_INPUT_CHARS)
            : combineFiles(finalFiles);
        setContent(combined);
        const linkedCount = finalFiles.length - 1;
        setLoadedSource({
          type: "drag",
          label:
            linkedCount > 0
              ? `SKILL.md + ${linkedCount} linked file${linkedCount > 1 ? "s" : ""}`
              : "SKILL.md",
        });
        setIsSingleFile(finalFiles.length === 1);
      } else {
        // No SKILL.md — fall back to all .md files combined
        setContent(combineFiles(allFiles));
        setLoadedSource({ type: "drag", label: `${allFiles.length} files (no SKILL.md found)` });
        setIsSingleFile(false);
      }
    } finally {
      setDragProcessing(false);
    }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const entries = Array.from(e.dataTransfer.items)
      .map((item) => item.webkitGetAsEntry?.())
      .filter((e): e is FileSystemEntry => !!e);
    if (entries.length > 0) await processEntries(entries);
  }

  async function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) => MD_ONLY_EXTS.test(f.name));
    if (files.length === 0) {
      setError("Only .md files are supported for skill optimization.");
      return;
    }
    setDragProcessing(true);
    setError(null);
    try {
      const fileData = await Promise.all(
        files.map(
          (f) =>
            new Promise<{ path: string; content: string }>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve({ path: f.name, content: reader.result as string });
              reader.onerror = () => resolve({ path: f.name, content: "" });
              reader.readAsText(f);
            })
        )
      );
      const valid = fileData.filter((f) => f.content);
      const combined = valid.length === 1 ? valid[0].content.slice(0, MAX_INPUT_CHARS) : combineFiles(valid);
      setContent(combined);
      setLoadedSource({ type: "drag", label: valid.length === 1 ? valid[0].path : `${valid.length} files` });
      setIsSingleFile(valid.length === 1);
    } finally {
      setDragProcessing(false);
      e.target.value = "";
    }
  }

  // ── URL fetch ────────────────────────────────────────────────────────────────

  async function handleFetchUrl() {
    const url = urlInput.trim();
    if (!url) return;
    setUrlLoading(true);
    setUrlError(null);
    try {
      const res = await fetch("/api/fetch-skill-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        setUrlError((data.error as string) ?? "Failed to fetch URL.");
        return;
      }
      setContent(data.content as string);
      setLoadedSource({ type: "url", label: url });
      setIsSingleFile(true);
    } catch {
      setUrlError("Network error. Please check your connection.");
    } finally {
      setUrlLoading(false);
    }
  }

  // ── 2-call flow: Score → Rewrite ───────────────────────────────────────────

  async function handleStartScore() {
    if (!content.trim() || overLimit) return;

    // Check anonymous trial limit
    if (mode === "anonymous" && !hasAnonTrialsLeft()) {
      setPhase("input");
      setError(`You've used all ${ANON_MAX_TRIALS} free anonymous actions. Sign up to get 10 monthly credits.`);
      return;
    }

    setLoading(true);
    setError(null);
    setPhase("scoring");

    try {
      const endpoint = mode === "anonymous" ? "/api/optimize/score/anonymous" : "/api/optimize/score";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), businessContext: businessContext.trim() || undefined }),
      });

      const data = (await res.json()) as Record<string, unknown>;

      if (!res.ok) {
        if (res.status === 429 && (data.code as string) === "trial_used") {
          setPhase("input");
          setError(`You've used all ${ANON_MAX_TRIALS} free anonymous actions. Sign up to get 10 monthly credits.`);
          return;
        }
        setPhase("input");
        setError((data.error as string) ?? "Scoring failed. Please try again.");
        return;
      }

      const score = data as ScoreResult;
      setScoreResult(score);
      setSelectedFixes(new Set(score.core_improvements)); // Core fixes checked by default
      setPhase("score-result");

      // Consume trial on successful score
      if (mode === "anonymous") {
        consumeAnonTrial();
        setTrialsUsed(getAnonTrialsUsed());
      }
    } catch {
      setPhase("input");
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleApplyFixes() {
    if (!scoreResult || selectedFixes.size === 0) return;

    // Scroll demo section into view so the rewriting spinner is visible
    if (mode === "anonymous") {
      document.getElementById("demo")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    setLoading(true);
    setError(null);
    setPhase("rewriting");

    try {
      const endpoint = mode === "anonymous" ? "/api/optimize/rewrite/anonymous" : "/api/optimize/rewrite";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), selectedFixes: Array.from(selectedFixes) }),
      });

      const data = (await res.json()) as Record<string, unknown>;

      if (!res.ok) {
        setPhase("score-result");
        setError((data.error as string) ?? "Rewrite failed. Please try again.");
        return;
      }

      const optimized = (data.optimized_content as string) || "";
      setOptimizedContent(optimized);
      setPhase("final");

      onResult?.({
        optimized_content: optimized,
        score: scoreResult.score,
        axes: scoreResult.axes,
        token_estimate: scoreResult.token_estimate,
        token_reduction_pct: scoreResult.token_reduction_pct,
        security_flags: scoreResult.security_flags,
        improvements: [
          ...scoreResult.core_improvements,
          ...scoreResult.additional_improvements,
        ],
      });
    } catch {
      setPhase("score-result");
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function toggleFix(fix: string) {
    const updated = new Set(selectedFixes);
    if (updated.has(fix)) {
      updated.delete(fix);
    } else {
      updated.add(fix);
    }
    setSelectedFixes(updated);
  }

  // ── Render ─────────────────────────────────────────────────────────────────


  // Gate: Anonymous out of trials
  if (mode === "anonymous" && trialsUsed >= ANON_MAX_TRIALS && phase === "input") {
    return (
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-5 text-center space-y-3">
        <p className="text-sm font-medium">You&apos;ve used all {ANON_MAX_TRIALS} free anonymous actions.</p>
        <p className="text-xs text-muted-foreground">
          {resetCountdown > 0 ? `Resets in ${resetCountdown}s` : "Sign up for 10 monthly credits — no credit card required."}
        </p>
        {resetCountdown === 0 && (
          <Link href="/auth/signup" className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-5 py-2 text-sm font-medium hover:bg-primary/90 transition-colors">
            Sign up free <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    );
  }

  // ── Score Result Phase: Show Before panel with analytics ──
  if (phase === "score-result" && scoreResult) {
    return (
      <div className="space-y-6 overflow-auto max-h-screen">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Before panel */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Before</span>
              <span className="text-xs">🏷️ {scoreResult.token_estimate} tokens</span>
              {/* Quality checked badge removed: property does not exist on ScoreResult type */}
            </div>
            <pre className="text-xs bg-muted rounded-md p-4 overflow-auto max-h-72 whitespace-pre-wrap break-words font-mono leading-relaxed border">
              {content}
            </pre>
            <div className="mt-3">
              <ScoreRing score={scoreResult.score} />
              <div className="mt-2">
                <ScoreAxes axes={scoreResult.axes} />
              </div>
              {scoreResult.security_flags && scoreResult.security_flags.length > 0 && (
                <div className="mt-2">
                  <SecurityFlagList flags={scoreResult.security_flags} />
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Suggestions/Improvements */}
        {([...scoreResult.core_improvements, ...scoreResult.additional_improvements]).length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-semibold mb-2 flex items-center gap-1 text-emerald-500">
              <span>Suggestions</span>
            </div>
            <ul className="list-disc ml-5 text-xs text-muted-foreground">
              {[...scoreResult.core_improvements, ...scoreResult.additional_improvements].map((imp) => (
                <li key={imp}>{imp}</li>
              ))}
            </ul>
          </div>
        )}
        {/* Apply fixes button */}
        <div className="flex gap-2 mt-6">
          <button
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            onClick={handleApplyFixes}
            disabled={loading}
          >
            Apply Fixes
          </button>
          <button
            className="border px-4 py-2 rounded-md text-sm font-medium hover:bg-accent transition-colors"
            onClick={() => setPhase("input")}
            disabled={loading}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // ── Final Phase: Show Before/After panels with analytics and diff ──
  if (phase === "final" && scoreResult && optimizedContent) {
    return (
      <div className="space-y-6 overflow-auto max-h-screen">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Before panel */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Before</span>
              <span className="text-xs">🏷️ {scoreResult.token_estimate} tokens</span>
            </div>
            <pre className="text-xs bg-muted rounded-md p-4 overflow-auto max-h-72 whitespace-pre-wrap break-words font-mono leading-relaxed border">
              {content}
            </pre>
            <div className="mt-3">
              <ScoreRing score={scoreResult.score} />
              <div className="mt-2">
                <ScoreAxes axes={scoreResult.axes} />
              </div>
              {scoreResult.security_flags && scoreResult.security_flags.length > 0 && (
                <div className="mt-2">
                  <SecurityFlagList flags={scoreResult.security_flags} />
                </div>
              )}
            </div>
          </div>
          {/* After panel */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-emerald-400">After</span>
              <span className="text-xs">🏷️ {optimizedContent.length / 4 | 0} tokens</span>
              <span className="text-xs ml-2">✨ Quality Checked</span>
            </div>
            <pre className="text-xs bg-muted rounded-md p-4 overflow-auto max-h-72 whitespace-pre-wrap break-words font-mono leading-relaxed border border-emerald-400/20">
              {optimizedContent}
            </pre>
            <div className="mt-3">
              {/* Optionally, show updated analytics if available */}
              {/* <ScoreRing score={scoreResult.score} /> */}
              {/* <ScoreAxes axes={scoreResult.axes} /> */}
            </div>
          </div>
        </div>
        {/* Visual diff */}
        <div className="mt-6">
          <SkillDiff original={content} optimized={optimizedContent} />
        </div>
      </div>
    );
  }

  // Input phase
  if (phase === "input") {
    return (
      <div className="space-y-4">
        {/* Tab bar */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 border border-border/40">
          {([ 
            { id: "input" as const, Icon: Type, label: "Input" },
            { id: "drag" as const, Icon: Upload, label: "File / Folder" },
            { id: "url" as const, Icon: Link2, label: "URL" },
          ]).map(({ id, Icon, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center justify-center gap-1.5 flex-1 h-8 rounded-md text-xs font-medium transition-all ${
                tab === id
                  ? "bg-background text-foreground shadow-sm border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Input tab */}
        {tab === "input" && (
          <textarea
            value={content}
            onChange={(e) => { setContent(e.target.value); setLoadedSource(null); }}
            placeholder="Paste your AI skill or prompt here..."
            className="w-full min-h-48 rounded-lg border border-border/60 bg-muted/40 px-4 py-3 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
            disabled={loading}
          />
        )}

        {/* Drag / File tab */}
        {tab === "drag" && (
          <>
            {loadedSource?.type === "drag" ? (
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium min-w-0">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">{loadedSource.label}</span>
                  </div>
                  <button onClick={clearContent} className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors shrink-0" aria-label="Clear">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <pre className="text-xs bg-muted/60 rounded-md p-3 overflow-auto max-h-36 whitespace-pre-wrap break-words font-mono text-foreground/70 leading-relaxed">
                  {content.slice(0, 800)}{content.length > 800 ? "\n…" : ""}
                </pre>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); }}
                onDrop={handleDrop}
                className={`rounded-lg border-2 border-dashed transition-all duration-150 p-8 text-center ${
                  dragOver ? "border-primary bg-primary/5 scale-[1.01]" : "border-border/50 hover:border-border/80 bg-muted/20"
                }`}
              >
                {dragProcessing ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Reading files…</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${dragOver ? "bg-primary/20" : "bg-muted/60"}`}>
                      <Upload className={`h-7 w-7 transition-colors ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{dragOver ? "Release to load" : "Drop your skill folder here"}</p>
                      <p className="text-xs text-muted-foreground mt-1">Finds all .md files in the folder</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-px bg-border/40 w-12" />
                      <span className="text-xs text-muted-foreground">or</span>
                      <div className="h-px bg-border/40 w-12" />
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-semibold text-primary hover:text-primary/80 underline-offset-2 hover:underline transition-colors"
                    >
                      Browse files
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".md"
                      className="sr-only"
                      onChange={handleFileInputChange}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* URL tab */}
        {tab === "url" && (
          <div className="space-y-3">
            {loadedSource?.type === "url" ? (
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-medium min-w-0">
                    <Link2 className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate text-xs text-muted-foreground">{loadedSource.label}</span>
                  </div>
                  <button onClick={clearContent} className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors shrink-0" aria-label="Clear">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <pre className="text-xs bg-muted/60 rounded-md p-3 overflow-auto max-h-36 whitespace-pre-wrap break-words font-mono text-foreground/70 leading-relaxed">
                  {content.slice(0, 800)}{content.length > 800 ? "\n…" : ""}
                </pre>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !urlLoading) handleFetchUrl(); }}
                    placeholder="https://raw.githubusercontent.com/user/repo/main/skill.md"
                    className="flex-1 h-10 rounded-lg border border-border/60 bg-muted/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
                    disabled={urlLoading}
                  />
                  <button
                    onClick={handleFetchUrl}
                    disabled={urlLoading || !urlInput.trim()}
                    className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    {urlLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load"}
                  </button>
                </div>
                {urlError && <p className="text-xs text-destructive">{urlError}</p>}
                <p className="text-xs text-muted-foreground">Paste a raw .md file URL (GitHub, Gist, Pastebin, etc.)</p>
              </>
            )}
          </div>
        )}

        {/* Token count + clear */}
        {content && (
          <div className="flex items-center justify-between">
            <TokenEstimate tokens={tokens} />
            <div className="flex items-center gap-3">
              {overLimit && <span className="text-xs text-destructive">Exceeds 5,000-token limit</span>}
              {loadedSource && (
                <button
                  onClick={clearContent}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
          </div>
        )}

        {sensitiveFindings.length > 0 && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-200 text-sm px-4 py-3 space-y-1">
            <p className="font-medium">Sensitive data detected. Remove secrets or private data before running analysis.</p>
            <p className="text-xs text-amber-200/80">
              Types found: {sensitiveTypes.slice(0, 4).join(", ")}{sensitiveTypes.length > 4 ? ", ..." : ""}
            </p>
          </div>
        )}

        {/* Business context */}
        <div>
          <button
            onClick={() => setShowContext((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            disabled={loading}
          >
            <span className={`transition-transform inline-block ${showContext ? "rotate-90" : ""}`}>▶</span>
            Add business context <span className="text-muted-foreground/50 ml-1">(optional)</span>
          </button>
          {showContext && (
            <input
              type="text"
              value={businessContext}
              onChange={(e) => setBusinessContext(e.target.value)}
              placeholder="Provide additional input and optimization requirements — e.g. B2B SaaS, HIPAA compliance, Python/FastAPI backend"
              className="mt-2 w-full h-10 rounded-lg border border-border/60 bg-muted/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
              disabled={loading}
              maxLength={500}
            />
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm px-4 py-3">
            {error}
          </div>
        )}

        {/* Score button */}
        <button
          onClick={handleStartScore}
          disabled={loading || !content.trim() || overLimit}
          className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</>
          ) : mode === "anonymous" ? (
            <>Analyze Free — No signup needed</>
          ) : (
            <><Zap className="h-4 w-4" /> Analyze Skill</>
          )}
        </button>

        {mode === "anonymous" && (
          <p className="text-xs text-muted-foreground text-center">
            {ANON_MAX_TRIALS - trialsUsed} of {ANON_MAX_TRIALS} free actions remaining · <Link href="/auth/signup" className="text-primary hover:underline">Sign up</Link> for 10 monthly credits
          </p>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Anonymous optimization is processed temporarily and not saved. Avoid sharing API keys, passwords, or private client data.
        </p>
      </div>
    );
  }

  // Scoring phase
  if (phase === "scoring") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="text-center">
          <p className="text-sm font-medium">Analyzing your skill…</p>
          <p className="text-xs text-muted-foreground mt-1">Checking security, quality, and token usage</p>
        </div>
      </div>
    );
  }

  // Score result phase
  if (phase === "score-result" && scoreResult) {
    const allImprovements = [...scoreResult.core_improvements, ...scoreResult.additional_improvements];
    const selectedCount = selectedFixes.size;
    const coreChecked = scoreResult.core_improvements.filter((f) => selectedFixes.has(f)).length;
    const additionalChecked = scoreResult.additional_improvements.filter((f) => selectedFixes.has(f)).length;

    return (
      <div className="space-y-4">
        {/* Single-file tracking suggestion */}
        {isSingleFile && loadedSource?.type !== "url" && (
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-5 py-4 flex gap-3">
            <span className="text-base shrink-0">💡</span>
            <div className="min-w-0">
              <p className="text-sm font-medium">Improve skill tracking with companion files</p>
              <p className="text-xs text-muted-foreground mt-1">
                You shared a single file. Add <code className="bg-muted rounded px-1 text-xs font-mono">log.md</code> for change history and
                {" "}<code className="bg-muted rounded px-1 text-xs font-mono">memory.md</code> for persistent context — then drop the full folder next time.
              </p>
              <div className="flex gap-1.5 mt-2.5 flex-wrap">
                {["log.md", "memory.md", "references/", "scripts/"].map((f) => (
                  <span key={f} className="text-xs bg-muted/70 border border-border/50 rounded px-2 py-0.5 font-mono">{f}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Score card */}
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold tracking-tight">Optimization Score</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Analysis of your skill</p>
            </div>
            <span className={`text-3xl font-bold tabular-nums ${scoreResult.score >= 75 ? "text-emerald-400" : scoreResult.score >= 50 ? "text-yellow-400" : "text-red-400"}`}>
              {scoreResult.score}
            </span>
          </div>
          <div className="p-6 space-y-5">
            <ScoreRing score={scoreResult.score} />
            <ScoreAxes axes={scoreResult.axes} />
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <div className="flex items-center gap-1.5 rounded-full bg-muted/70 border border-border/50 px-3 py-1">
                <TokenEstimate tokens={scoreResult.token_estimate} />
              </div>
              {scoreResult.token_reduction_pct > 0 && (
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-3 py-1">
                  <span className="text-xs font-semibold text-emerald-400">↓ {scoreResult.token_reduction_pct}% smaller</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Security flags */}
        {scoreResult.security_flags.length > 0 && (
          <div className="rounded-xl border border-red-500/25 bg-card overflow-hidden">
            <div className="px-6 py-4 border-b border-red-500/20 bg-red-950/20">
              <h3 className="text-base font-semibold text-red-400 flex items-center gap-2">
                <span>⚠</span> Security Flags
              </h3>
              <p className="text-xs text-red-400/70 mt-0.5">{scoreResult.security_flags.length} issue{scoreResult.security_flags.length !== 1 ? "s" : ""} found</p>
            </div>
            <div className="p-5">
              <SecurityFlagList flags={scoreResult.security_flags} />
            </div>
          </div>
        )}

        {/* Improvements accordion with checkboxes */}
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border/40">
            <h3 className="text-base font-semibold tracking-tight">Improvements ({selectedCount} selected)</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Check the fixes you want to apply</p>
          </div>
          <div className="divide-y divide-border/40">
            {/* Core improvements */}
            {scoreResult.core_improvements.length > 0 && (
              <div className="p-5 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Core Fixes (Security & Correctness)</p>
                <div className="space-y-2">
                  {scoreResult.core_improvements.map((fix) => (
                    <label key={fix} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-muted/40 transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedFixes.has(fix)}
                        onChange={() => toggleFix(fix)}
                        className="h-4 w-4 rounded border border-border text-primary focus:ring-2 focus:ring-primary"
                      />
                      <span className="text-sm text-foreground">{fix}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Additional improvements */}
            {scoreResult.additional_improvements.length > 0 && (
              <div className="p-5 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Additional Improvements (Quality & Optimization)</p>
                <div className="space-y-2">
                  {scoreResult.additional_improvements.map((fix) => (
                    <label key={fix} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-muted/40 transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedFixes.has(fix)}
                        onChange={() => toggleFix(fix)}
                        className="h-4 w-4 rounded border border-border text-primary focus:ring-2 focus:ring-primary"
                      />
                      <span className="text-sm text-foreground">{fix}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Apply fixes button */}
        <button
          onClick={handleApplyFixes}
          disabled={loading || selectedCount === 0}
          className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Applying fixes…</>
          ) : (
            <>Apply {selectedCount} selected fixes</>
          )}
        </button>

        {/* Cancel */}
        <button
          onClick={() => { setPhase("input"); setScoreResult(null); }}
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors w-full text-center py-2"
        >
          ← Back to input
        </button>
      </div>
    );
  }

  // Final phase: show diff + optimized content
  if (phase === "final" && optimizedContent && scoreResult) {
    return (
      <div className="space-y-4">
        {/* Before/After diff accordion */}
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <button
            onClick={() => setShowFullDiff(!showFullDiff)}
            className="w-full px-6 py-4 border-b border-border/40 flex items-center justify-between hover:bg-muted/30 transition-colors"
          >
            <div className="text-left">
              <h3 className="text-base font-semibold tracking-tight">Before / After Diff</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Click to expand and review changes</p>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showFullDiff ? "rotate-180" : ""}`} />
          </button>
          {showFullDiff && (
            <div className="p-6 overflow-auto max-h-96">
              <SkillDiff original={content} optimized={optimizedContent} />
              <button
                onClick={() => setShowFullDiff(false)}
                className="text-xs text-muted-foreground hover:text-foreground mt-4 underline-offset-2 hover:underline"
              >
                Collapse
              </button>
            </div>
          )}
        </div>

        {/* Optimized content + download */}
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold tracking-tight">Optimized Skill</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Ready to use</p>
            </div>
            <button
              onClick={() => downloadMd(optimizedContent)}
              className="flex items-center gap-1.5 text-xs font-medium bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border/50 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Download .md
            </button>
          </div>
          <div className="p-5">
            <pre className="text-sm bg-muted/40 rounded-lg p-4 overflow-auto max-h-72 whitespace-pre-wrap break-words font-mono leading-relaxed text-foreground/85">
              {optimizedContent}
            </pre>
          </div>
        </div>

        {/* Signup nudge for anonymous */}
        {mode === "anonymous" && (
          <div className="rounded-xl border border-primary/25 bg-gradient-to-r from-primary/5 via-primary/8 to-primary/5 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Save your optimization history</p>
              <p className="text-xs text-muted-foreground mt-1">Sign up free · 10 actions/month · Track all versions</p>
            </div>
            <Link
              href="/auth/signup"
              className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
              Sign up <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        {/* Single-file tracking suggestion in final phase */}
        {isSingleFile && loadedSource?.type !== "url" && (
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-5 py-4 flex gap-3">
            <span className="text-base shrink-0">💡</span>
            <div className="min-w-0">
              <p className="text-sm font-medium">Add companion files for better tracking</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create <code className="bg-muted rounded px-1 text-xs font-mono">log.md</code> to record what changed and why,
                {" "}<code className="bg-muted rounded px-1 text-xs font-mono">memory.md</code> for agent context that persists across runs.
                Drop the full skill folder next time to optimize all linked files together.
              </p>
            </div>
          </div>
        )}

        {/* Try again button */}
        <button
          onClick={() => { setPhase("input"); setScoreResult(null); setOptimizedContent(null); setContent(""); setLoadedSource(null); }}
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors w-full text-center py-2"
        >
          ← Optimize another skill
        </button>
      </div>
    );
  }

  return null;
}