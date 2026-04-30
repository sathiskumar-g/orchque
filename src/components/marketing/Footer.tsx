import Link from "next/link";
import { PRODUCT } from "@/lib/config";

export default function Footer() {
  return (
    <footer className="border-t py-10 px-4">
      <div className="container max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm">{PRODUCT.name}</p>
            <p className="text-xs text-muted-foreground mt-1">{PRODUCT.tagline}</p>
          </div>

          <nav className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {PRODUCT.nav.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link href="/legal/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/legal/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link href="/dashboard/support" className="hover:text-foreground transition-colors">
              Support
            </Link>
          </nav>
        </div>

        <div className="mt-6 pt-6 border-t text-xs text-muted-foreground">
          © {new Date().getFullYear()} {PRODUCT.name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
