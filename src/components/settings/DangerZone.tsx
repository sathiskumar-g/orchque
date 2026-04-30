"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function DangerZone() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to delete account");
      }
      toast.success("Account deleted");
      router.push("/");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="rounded-xl border border-destructive/40 bg-card p-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-destructive mb-1">Danger zone</h2>
        <p className="text-sm text-muted-foreground">
          Permanently delete your account and all data. This cannot be undone.
        </p>
      </div>

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="h-9 px-4 rounded-md border border-destructive text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors"
        >
          Delete account
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium text-destructive">
            Are you absolutely sure? All your data will be deleted immediately.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={loading}
              className="h-9 px-4 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Deleting..." : "Yes, delete my account"}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="h-9 px-4 rounded-md border text-sm font-medium hover:bg-accent transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
