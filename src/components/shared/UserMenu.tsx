"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Settings, LogOut, Zap } from "lucide-react";

interface Profile {
  displayName: string;
  email: string;
  credits: number | null;
  plan: string;
}

export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.displayName) setProfile(d);
      })
      .catch(() => {});
  }, []);

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/auth/signin");
    router.refresh();
  };

  const initial = profile?.displayName?.[0]?.toUpperCase() ?? "U";
  const name = profile?.displayName ?? "Account";
  const credits = profile?.credits;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
      >
        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
          {initial}
        </div>
        <span className="flex-1 text-left truncate text-xs font-medium text-foreground">
          {name}
        </span>
        {credits !== null && credits !== undefined && (
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
            credits === 0
              ? "bg-destructive/10 text-destructive"
              : "bg-amber-500/15 text-amber-400"
          }`}>
            <Zap className="h-2.5 w-2.5" />{credits}
          </span>
        )}
        <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full mb-1 left-0 w-48 rounded-md border bg-popover shadow-md z-20 py-1">
            {profile?.email && (
              <div className="px-3 py-2 border-b border-border/40">
                <p className="text-xs font-medium truncate">{profile.displayName}</p>
                <p className="text-[10px] text-muted-foreground truncate">{profile.email}</p>
              </div>
            )}
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
              onClick={() => setOpen(false)}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 text-sm w-full text-left hover:bg-accent transition-colors text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

