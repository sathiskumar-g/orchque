"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SkillFile } from "@/types/skill";

// ─── File Icons ───────────────────────────────────────────────────────────────

function fileIcon(path: string) {
  if (path.startsWith("memory/")) return "🧠";
  if (path.startsWith("logs/")) return "📋";
  if (path.startsWith("scripts/")) return "⚙️";
  return "📄";
}

// ─── Build a simple folder tree from flat file paths ──────────────────────────

type TreeNode = { name: string; path: string; children: TreeNode[] };

function buildTree(files: SkillFile[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split("/");
    if (parts.length === 1) {
      root.push({ name: parts[0], path: file.path, children: [] });
    } else {
      const folderName = parts[0];
      let folder = root.find((n) => n.name === folderName && n.children.length > 0);
      if (!folder) {
        folder = { name: folderName, path: folderName + "/", children: [] };
        root.push(folder);
      }
      folder.children.push({ name: parts.slice(1).join("/"), path: file.path, children: [] });
    }
  }

  // Put SKILL.md first
  root.sort((a, b) => (a.name === "SKILL.md" ? -1 : b.name === "SKILL.md" ? 1 : 0));
  return root;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  files: SkillFile[];
  skillId: string;
  onSaved?: (versionId: string) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SkillPackageViewer({ files, skillId, onSaved }: Props) {
  const [localFiles, setLocalFiles] = useState<SkillFile[]>(files);
  const [activePath, setActivePath] = useState<string>(files[0]?.path ?? "");
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const activeFile = localFiles.find((f) => f.path === activePath);
  const tree = buildTree(localFiles);

  function handleContentChange(newContent: string) {
    setLocalFiles((prev) =>
      prev.map((f) => (f.path === activePath ? { ...f, content: newContent } : f))
    );
  }

  async function handleSaveVersion() {
    setSaving(true);
    setSaveError(null);
    try {
      const skillMd = localFiles.find((f) => f.path === "SKILL.md");
      const body = {
        content: skillMd?.content ?? "",
        package_files: localFiles,
        token_estimate: Math.ceil(
          localFiles.reduce((sum, f) => sum + f.content.length, 0) / 4
        ),
      };
      const res = await fetch(`/api/skills/${skillId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save version");
      }
      const data = await res.json();
      setEditMode(false);
      onSaved?.(data.version?.id ?? "");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  function handleDownloadZip() {
    // Build a simple multi-file text download (no JSZip dependency needed for MVP)
    // Each file separated by a header line
    const combined = localFiles
      .map((f) => `${"=".repeat(60)}\n# ${f.path}\n${"=".repeat(60)}\n${f.content}`)
      .join("\n\n");
    const blob = new Blob([combined], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "skill-package.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-[600px] border border-border rounded-lg overflow-hidden bg-background">
      {/* ── File Tree ── */}
      <aside className="w-52 border-r border-border bg-muted/20 flex flex-col shrink-0">
        <div className="px-3 py-2 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Files
        </div>
        <nav className="flex-1 overflow-y-auto py-1">
          {tree.map((node) =>
            node.children.length === 0 ? (
              <FileRow
                key={node.path}
                icon={fileIcon(node.path)}
                name={node.name}
                path={node.path}
                active={activePath === node.path}
                onClick={() => {
                  setActivePath(node.path);
                  setEditMode(false);
                }}
              />
            ) : (
              <FolderGroup
                key={node.path}
                name={node.name}
                children={node.children}
                activePath={activePath}
                onSelect={(p) => {
                  setActivePath(p);
                  setEditMode(false);
                }}
              />
            )
          )}
        </nav>
      </aside>

      {/* ── Editor Pane ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/10 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-mono text-foreground truncate">
              {activePath}
            </span>
            <span className="text-[10px] border border-border rounded px-1.5 py-0.5 text-muted-foreground shrink-0">
              {activeFile ? Math.ceil(activeFile.content.length / 4) + " tokens" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {editMode ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditMode(false)}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveVersion}
                  disabled={saving}
                  className="h-7 text-xs"
                >
                  {saving ? "Saving…" : "Save version"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditMode(true)}
                  className="h-7 text-xs"
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadZip}
                  className="h-7 text-xs"
                >
                  Download
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Error */}
        {saveError && (
          <div className="px-4 py-1 bg-destructive/10 text-destructive text-xs border-b border-border">
            {saveError}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {editMode ? (
            <textarea
              className="w-full h-full p-4 font-mono text-sm bg-background text-foreground resize-none focus:outline-none"
              value={activeFile?.content ?? ""}
              onChange={(e) => handleContentChange(e.target.value)}
              spellCheck={false}
            />
          ) : (
            <pre className="w-full h-full p-4 font-mono text-sm text-foreground overflow-auto whitespace-pre-wrap break-words">
              {activeFile?.content ?? ""}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FileRow({
  icon,
  name,
  path,
  active,
  onClick,
}: {
  icon: string;
  name: string;
  path: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors",
        active
          ? "bg-accent text-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
      )}
    >
      <span>{icon}</span>
      <span className="truncate font-mono text-xs">{name}</span>
    </button>
  );
}

function FolderGroup({
  name,
  children,
  activePath,
  onSelect,
}: {
  name: string;
  children: TreeNode[];
  activePath: string;
  onSelect: (path: string) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>{open ? "▾" : "▸"}</span>
        <span>{name}/</span>
      </button>
      {open &&
        children.map((child) => (
          <FileRow
            key={child.path}
            icon={fileIcon(child.path)}
            name={child.name}
            path={child.path}
            active={activePath === child.path}
            onClick={() => onSelect(child.path)}
          />
        ))}
    </div>
  );
}
