"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Zap,
  MessageSquare,
  Settings,
  LogOut,
  BrainCircuit,
} from "lucide-react";
import { PRODUCT } from "@/lib/config";
import UserMenu from "@/components/shared/UserMenu";

const NAV = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Studio", href: "/dashboard/product", icon: Zap },
  { label: "Skills", href: "/dashboard/skills", icon: BrainCircuit },
  { label: "Support", href: "/dashboard/support", icon: MessageSquare },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-56 border-r bg-background shrink-0 h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center h-14 px-4 border-b">
        <Link href="/" className="font-bold text-base">
          {PRODUCT.name}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
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

      {/* User menu at bottom */}
      <div className="border-t p-2">
        <UserMenu />
      </div>
    </aside>
  );
}
