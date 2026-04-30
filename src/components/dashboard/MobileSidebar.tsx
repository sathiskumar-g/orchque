"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LayoutDashboard, Zap, MessageSquare, Settings, BrainCircuit } from "lucide-react";
import { PRODUCT } from "@/lib/config";

const NAV = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Studio", href: "/dashboard/product", icon: Zap },
  { label: "Skills", href: "/dashboard/skills", icon: BrainCircuit },
  { label: "Support", href: "/dashboard/support", icon: MessageSquare },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile header */}
      <div className="md:hidden flex items-center justify-between h-14 px-4 border-b bg-background sticky top-0 z-40">
        <Link href="/" className="font-bold text-base">
          {PRODUCT.name}
        </Link>
        <button onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40"
          onClick={() => setOpen(false)}
        >
          {/* Drawer */}
          <aside
            className="absolute left-0 top-0 h-full w-64 bg-background border-r flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between h-14 px-4 border-b">
              <span className="font-bold">{PRODUCT.name}</span>
              <button onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 px-2 py-4 space-y-1">
              {NAV.map(({ label, href, icon: Icon }) => {
                const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
