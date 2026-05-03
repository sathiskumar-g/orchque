"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, LogIn, Zap, LayoutDashboard } from "lucide-react";
import { PRODUCT } from "@/lib/config";
import { createClient } from "@/lib/supabase";
import { UserMenu } from "@/components/auth/UserMenu";
import type { User } from "@supabase/supabase-js";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Detect auth in background — start as null (no flash).
  // Race against 3s timeout so a slow network never freezes the nav.
  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    const check = async () => {
      try {
        const result = await Promise.race([
          supabase.auth.getSession(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
        ]);
        if (mounted && result && "data" in result) {
          setUser(result.data.session?.user ?? null);
        }
      } catch {
        // network error — silently show signed-out state
      }
    };

    check();

    // Listen for sign-in / sign-out events (e.g. after OAuth redirect)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileOpen(false);
  }

  return (
    <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        {/* Logo */}
        <Link
          href="/"
          className="font-bold text-xl tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
        >
          <span className="bg-gradient-to-r from-primary via-blue-400 to-purple-400 bg-clip-text text-transparent">
            {PRODUCT.name}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-3" aria-label="Main navigation">
          <button
            onClick={() => scrollTo("features")}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Features
          </button>
          <button
            onClick={() => scrollTo("demo")}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Demo
          </button>
          <button
            onClick={() => scrollTo("pricing")}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Pricing
          </button>
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <UserMenu user={user} />
            </>
          ) : (
            <>
              <Link
                href="/auth/signin"
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Zap className="h-4 w-4" />
                Start Free
              </Link>
            </>
          )}
        </nav>

        {/* Mobile toggle */}
        <button
          className="sm:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-border/40 bg-background px-4 pb-5 pt-3 space-y-1">
          <button
            onClick={() => scrollTo("features")}
            className="w-full text-left py-2.5 px-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded"
          >
            Features
          </button>
          <button
            onClick={() => scrollTo("demo")}
            className="w-full text-left py-2.5 px-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded"
          >
            Demo
          </button>
          <button
            onClick={() => scrollTo("pricing")}
            className="w-full text-left py-2.5 px-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded"
          >
            Pricing
          </button>
          <div className="border-t border-border/40 my-2 pt-3 space-y-2">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center justify-center gap-2 w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Go to Dashboard
                </Link>
                <button
                  onClick={async () => {
                    setMobileOpen(false);
                    try { await fetch("/api/auth/signout", { method: "POST" }); } catch {}
                    window.location.href = "/";
                  }}
                  className="flex items-center gap-2 py-2.5 px-2 text-sm font-medium text-destructive hover:text-destructive/80 w-full transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  className="flex items-center gap-2 py-2.5 px-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="flex items-center justify-center gap-2 w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  <Zap className="h-4 w-4" />
                  Start Free
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
