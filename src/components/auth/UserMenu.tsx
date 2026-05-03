"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { User, LayoutDashboard, LogOut, ChevronDown } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface UserMenuProps {
  user: SupabaseUser;
}

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "User";
  const userEmail = user.email ?? "";

  const handleLogout = async () => {
    setLoggingOut(true);
    setOpen(false);
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } catch {
      try { await supabase.auth.signOut(); } catch {}
    } finally {
      setLoggingOut(false);
    }
    window.location.href = "/";
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm font-medium hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary">
          <User className="h-3.5 w-3.5" />
        </div>
        <span className="hidden sm:inline max-w-[120px] truncate">{displayName}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          {/* Dropdown */}
          <div className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-border/60 bg-background shadow-lg overflow-hidden">
            <div className="px-3 py-2.5 border-b border-border/40">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            </div>
            <div className="py-1">
              <button
                onClick={() => { setOpen(false); router.push("/dashboard"); }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
              >
                <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                Dashboard
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" />
                {loggingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
