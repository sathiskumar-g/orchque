import Link from "next/link";
import { PRODUCT } from "@/lib/config";

export default function Footer() {
  return (
    <footer className="border-t py-10 px-4">
      <div className="container max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
          <div>
            <p className="font-semibold text-sm">{PRODUCT.name}</p>
            <p className="text-xs text-muted-foreground mt-1">{PRODUCT.tagline}</p>
            <a
              href={`mailto:${PRODUCT.supportEmail}`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-2 inline-block"
            >
              {PRODUCT.supportEmail}
            </a>
          </div>

          <div className="flex flex-col sm:flex-row gap-8 text-sm text-muted-foreground">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Product</p>
              <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
              <Link href="/auth/signin" className="hover:text-foreground transition-colors">Sign In</Link>
              <Link href="/auth/signup" className="hover:text-foreground transition-colors">Get Started</Link>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Support</p>
              <Link href="/contact" className="hover:text-foreground transition-colors">Contact Us</Link>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Legal</p>
              <Link href="/legal/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link href="/legal/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
              <Link href="/legal/refund" className="hover:text-foreground transition-colors">Refund Policy</Link>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t text-xs text-muted-foreground">
          © {new Date().getFullYear()} {PRODUCT.name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
