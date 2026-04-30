"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PRODUCT } from "@/lib/config";
import { detectSensitiveData } from "@/lib/security-guards";

interface ProductInputProps {
  onResult: (result: string) => void;
  onCreditsChanged: () => void;
  disabled?: boolean;
}

export default function ProductInput({ onResult, onCreditsChanged, disabled }: ProductInputProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const sensitiveFindings = detectSensitiveData(input);
  const sensitiveTypes = [...new Set(sensitiveFindings.map((f) => f.type))];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) {
          onResult("__insufficient_credits__");
          return;
        }
        throw new Error(data.error ?? "Action failed");
      }
      onResult(data.result ?? "Done!");
      onCreditsChanged();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        {/* TODO: Rename label and placeholder to match your product */}
        <label className="text-sm font-medium">Your input</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`What would you like ${PRODUCT.name} to do?`}
          rows={4}
          disabled={disabled || loading}
          className="flex w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-50"
        />
      </div>
      {sensitiveFindings.length > 0 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs px-3 py-2">
          Sensitive data detected ({sensitiveTypes.slice(0, 3).join(", ")}{sensitiveTypes.length > 3 ? ", ..." : ""}). Remove secrets before submitting.
        </div>
      )}
      <button
        type="submit"
        disabled={loading || !input.trim() || disabled}
        className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Running..." : "Run"}
      </button>
    </form>
  );
}
