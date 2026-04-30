"use client";

import { useState } from "react";
import { Download } from "lucide-react";

interface ShareDownloadButtonProps {
  skillId: string;
  skillName: string;
}

export default function ShareDownloadButton({ skillId, skillName }: ShareDownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/skills/${skillId}/download`);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = skillName.replace(/[^a-z0-9]/gi, "_").toLowerCase().slice(0, 40);
      a.download = `${safeName}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // silent fail — browser handles network errors visually
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="flex items-center gap-2 h-9 px-4 rounded-md border bg-background text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50 shrink-0"
    >
      <Download className="h-4 w-4" />
      {downloading ? "Downloading…" : "Download .zip"}
    </button>
  );
}
