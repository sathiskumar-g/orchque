"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FolderOpen, FileText, X, File, Type, Upload } from "lucide-react";
import { MAX_INPUT_CHARS } from "@/lib/skill-optimizer-prompt";
import { TokenEstimate } from "@/components/skills/ScoreDisplay";

type InputTab = "paste" | "file" | "folder";

type FileItem = {
  name: string;
  path: string;
  content: string;
  selected: boolean;
};

const PRIMARY_FILES = ["skill.md", "prompt.md", "main.md", "readme.md"];
const SECONDARY_FILES = ["memory.md", "log.md", "notes.md"];

function readFileEntry(entry: FileSystemFileEntry): Promise<{ path: string; content: string }> {
  return new Promise((resolve, reject) => {
    entry.file(
      (file) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve({ path: entry.fullPath, content: (ev.target?.result as string) ?? "" });
        reader.onerror = reject;
        reader.readAsText(file);
      },
      reject
    );
  });
}

async function scanDirectory(dirEntry: FileSystemDirectoryEntry): Promise<{ path: string; content: string }[]> {
  const results: { path: string; content: string }[] = [];
  const reader = dirEntry.createReader();
  await new Promise<void>((resolve) => {
    const readBatch = () => {
      reader.readEntries(async (entries) => {
        if (entries.length === 0) { resolve(); return; }
        for (const entry of entries) {
          if (entry.isFile) {
            const fe = entry as FileSystemFileEntry;
            if (fe.name.endsWith(".md") || fe.name.endsWith(".txt")) {
              try { results.push(await readFileEntry(fe)); } catch { /* skip */ }
            }
          } else if (entry.isDirectory && !entry.name.startsWith(".") && entry.name !== "node_modules") {
            results.push(...await scanDirectory(entry as FileSystemDirectoryEntry));
          }
        }
        readBatch();
      });
    };
    readBatch();
  });
  return results;
}

function buildFileItems(rawFiles: { path: string; content: string }[]): FileItem[] {
  return rawFiles
    .map((f) => {
      const filename = f.path.split("/").pop()?.toLowerCase() ?? "";
      return {
        name: f.path.split("/").pop() ?? f.path,
        path: f.path,
        content: f.content,
        selected: PRIMARY_FILES.includes(filename) || SECONDARY_FILES.includes(filename),
      };
    })
    .sort((a, b) => {
      const aP = PRIMARY_FILES.includes(a.name.toLowerCase());
      const bP = PRIMARY_FILES.includes(b.name.toLowerCase());
      const aS = SECONDARY_FILES.includes(a.name.toLowerCase());
      const bS = SECONDARY_FILES.includes(b.name.toLowerCase());
      if (aP && !bP) return -1; if (!aP && bP) return 1;
      if (aS && !bS) return -1; if (!aS && bS) return 1;
      return a.name.localeCompare(b.name);
    });
}

export default function NewSkillPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [context, setContext] = useState("");
  const [tab, setTab] = useState<InputTab>("paste");

  // Paste tab
  const [pasteContent, setPasteContent] = useState("");

  // File tab (single .md file)
  const [singleFile, setSingleFile] = useState<{ name: string; content: string } | null>(null);

  // Folder tab
  const [folderFiles, setFolderFiles] = useState<FileItem[]>([]);
  const [dragging, setDragging] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  // ── Computed content ─────────────────────────────────────────────────────────

  const activeContent = (() => {
    if (tab === "paste") return pasteContent;
    if (tab === "file") return singleFile?.content ?? "";
    // folder — combine selected files
    return folderFiles
      .filter((f) => f.selected)
      .map((f) => `<!-- ${f.path.replace(/^\//, "")} -->\n${f.content}`)
      .join("\n\n---\n\n");
  })();

  const tokens = Math.ceil(activeContent.length / 4);
  const overLimit = activeContent.length > MAX_INPUT_CHARS;
  const canSubmit = name.trim().length > 0 && activeContent.trim().length > 0 && !overLimit && !loading;

  // ── File handlers ─────────────────────────────────────────────────────────────

  function handleSingleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".md") && !file.name.endsWith(".txt")) {
      setError("Only .md and .txt files are supported.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text === "string") {
        setSingleFile({ name: file.name, content: text });
        if (!name) setName(file.name.replace(/\.(md|txt)$/, ""));
        setError(null);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleFolderInput(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = Array.from(e.target.files ?? []);
    if (fileList.length === 0) return;
    const folderName = fileList[0].webkitRelativePath?.split("/")[0] ?? "skill";
    const eligible = fileList.filter((f) => f.name.endsWith(".md") || f.name.endsWith(".txt"));
    if (eligible.length === 0) {
      setError("No .md or .txt files found in the selected folder.");
      return;
    }
    const rawFiles: { path: string; content: string }[] = [];
    let done = 0;
    for (const f of eligible) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        rawFiles.push({ path: f.webkitRelativePath || f.name, content: (ev.target?.result as string) ?? "" });
        done++;
        if (done === eligible.length) {
          setFolderFiles(buildFileItems(rawFiles));
          if (!name) setName(folderName);
          setError(null);
        }
      };
      reader.readAsText(f);
    }
    e.target.value = "";
  }

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      setError(null);
      const items = Array.from(e.dataTransfer.items).filter((i) => i.kind === "file");
      const rawFiles: { path: string; content: string }[] = [];
      let inferredName = "";

      for (const item of items) {
        const entry = item.webkitGetAsEntry();
        if (!entry) continue;
        if (entry.isDirectory) {
          inferredName = inferredName || entry.name;
          rawFiles.push(...await scanDirectory(entry as FileSystemDirectoryEntry));
        } else if (entry.isFile) {
          const fe = entry as FileSystemFileEntry;
          if (fe.name.endsWith(".md") || fe.name.endsWith(".txt")) {
            try {
              rawFiles.push(await readFileEntry(fe));
              inferredName = inferredName || fe.name.replace(/\.(md|txt)$/, "");
            } catch { /* skip */ }
          }
        }
      }

      if (rawFiles.length === 0) {
        setError("No .md or .txt files found. Drop a skill folder or a .md file.");
        return;
      }

      if (rawFiles.length === 1) {
        setSingleFile({ name: rawFiles[0].path.split("/").pop() ?? "skill.md", content: rawFiles[0].content });
        setTab("file");
      } else {
        setFolderFiles(buildFileItems(rawFiles));
        setTab("folder");
      }
      if (!name) setName(inferredName);
    },
    [name]
  );

  // ── Submit ────────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), content: activeContent.trim(), context: context.trim() || undefined }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        setError((data.error as string) ?? "Failed to create skill.");
        return;
      }
      router.push(`/dashboard/skills/${data.skill_id as string}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">New Skill</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Paste, upload a file, or drop an entire skill folder (SKILL.md, memory.md, log.md).
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Skill name */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="skill-name">Skill name</label>
          <input
            id="skill-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Code Review Prompt"
            className="w-full h-10 rounded-md border bg-muted/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={loading}
            maxLength={120}
          />
        </div>

        {/* Skill context */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium" htmlFor="skill-context">Skill context</label>
            <span className={`text-xs ${context.length > 230 ? "text-amber-500" : "text-muted-foreground"}`}>
              {context.length}/250
            </span>
          </div>
          <textarea
            id="skill-context"
            value={context}
            onChange={(e) => setContext(e.target.value.slice(0, 250))}
            placeholder="Describe why this skill exists, what problem it solves, and its impact. e.g. Used in code review pipeline - reduces review time by 40% by catching common patterns before human review."
            rows={2}
            className="w-full rounded-md border bg-muted/40 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
            disabled={loading}
          />
        </div>

        {/* Input tabs */}
        <div>
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 border border-border/40 mb-4">
            {([
              { id: "paste"  as const, Icon: Type,       label: "Paste text" },
              { id: "file"   as const, Icon: FileText,   label: "Upload file" },
              { id: "folder" as const, Icon: FolderOpen, label: "Drop folder" },
            ] as const).map(({ id, Icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex items-center justify-center gap-1.5 flex-1 h-8 rounded-md text-xs font-medium transition-all ${
                  tab === id
                    ? "bg-background text-foreground shadow-sm border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {label}
              </button>
            ))}
          </div>

          {/* ── Paste tab ── */}
          {tab === "paste" && (
            <textarea
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              placeholder="Paste your AI skill, agent prompt, or instructions here…"
              className="w-full min-h-52 rounded-lg border border-border/60 bg-muted/40 px-4 py-3 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
              disabled={loading}
            />
          )}

          {/* ── File tab ── */}
          {tab === "file" && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }}
              onDrop={handleDrop}
              className={`rounded-lg border-2 border-dashed transition-colors ${
                dragging ? "border-primary bg-primary/5" : "border-border/60"
              }`}
            >
              {singleFile ? (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium min-w-0">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span className="truncate">{singleFile.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">~{Math.ceil(singleFile.content.length / 4)} tok</span>
                    </div>
                    <button type="button" onClick={() => setSingleFile(null)}
                      className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors shrink-0">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <pre className="text-xs bg-muted/60 rounded-md p-3 overflow-auto max-h-36 whitespace-pre-wrap break-words font-mono text-foreground/70 leading-relaxed">
                    {singleFile.content.slice(0, 600)}{singleFile.content.length > 600 ? "\n…" : ""}
                  </pre>
                </div>
              ) : (
                <div className="p-8 flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{dragging ? "Release to load" : "Drop a .md or .txt file here"}</p>
                    <p className="text-xs text-muted-foreground mt-1">Or click to browse</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="text-xs font-semibold text-primary hover:text-primary/80 underline-offset-2 hover:underline transition-colors"
                  >
                    Browse file
                  </button>
                  <input ref={fileRef} type="file" accept=".md,.txt" className="hidden" onChange={handleSingleFileInput} />
                </div>
              )}
            </div>
          )}

          {/* ── Folder tab ── */}
          {tab === "folder" && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }}
              onDrop={handleDrop}
              className={`rounded-lg border-2 border-dashed transition-colors ${
                dragging ? "border-primary bg-primary/5" : "border-border/60"
              }`}
            >
              {folderFiles.length > 0 ? (
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{folderFiles.length} files found</span>
                    <button type="button" onClick={() => setFolderFiles([])}
                      className="ml-auto rounded p-0.5 text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                    {folderFiles.map((f, i) => (
                      <label key={f.path}
                        className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted/40 cursor-pointer">
                        <input type="checkbox" checked={f.selected}
                          onChange={(ev) => {
                            const updated = [...folderFiles];
                            updated[i] = { ...f, selected: ev.target.checked };
                            setFolderFiles(updated);
                          }}
                          className="h-3.5 w-3.5 rounded border" />
                        <File className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs font-mono truncate flex-1">{f.path.replace(/^\//, "")}</span>
                        <span className="text-xs text-muted-foreground shrink-0">~{Math.ceil(f.content.length / 4)} tok</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Checked files are combined into v1.0. skill.md + memory.md + log.md are pre-selected.
                  </p>
                </div>
              ) : (
                <div className="p-8 flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center">
                    <FolderOpen className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{dragging ? "Release to load folder" : "Drop your skill folder here"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Reads all .md files — SKILL.md, memory.md, log.md auto-selected
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => folderRef.current?.click()}
                    className="text-xs font-semibold text-primary hover:text-primary/80 underline-offset-2 hover:underline transition-colors"
                  >
                    Browse folder
                  </button>
                  <input
                    ref={folderRef}
                    type="file"
                    className="hidden"
                    onChange={handleFolderInput}
                    {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Token count */}
        <div className="flex items-center justify-between">
          {activeContent.length > 0 ? (
            <TokenEstimate tokens={tokens} />
          ) : (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              {tab === "paste" ? "Paste your skill content above" :
               tab === "file"  ? "Upload or drag & drop a .md file" :
                                 "Drop or browse your skill folder"}
            </span>
          )}
          {overLimit && <span className="text-xs text-destructive">Exceeds 5,000-token limit</span>}
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={!canSubmit}
            className="h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : "Save as v1.0"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="h-10 px-4 rounded-md border text-sm font-medium hover:bg-accent transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
