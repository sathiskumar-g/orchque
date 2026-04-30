"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Settings, LogOut } from "lucide-react";

interface UserMenuProps {
  email?: string;
}

export default function UserMenu({ email }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/auth/signin");
    router.refresh();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
      >
        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
          {email ? email[0].toUpperCase() : "U"}
        </div>
        <span className="flex-1 text-left truncate text-xs text-muted-foreground">
          {email ?? "Account"}
        </span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full mb-1 left-0 w-48 rounded-md border bg-popover shadow-md z-20 py-1">
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
