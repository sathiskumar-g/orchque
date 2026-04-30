import { PRODUCT } from "@/lib/config";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="container max-w-3xl mx-auto py-16 px-4">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-muted-foreground text-sm mb-8">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

      <div className="prose prose-sm max-w-none space-y-6 text-foreground">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. Information we collect</h2>
          <p className="text-muted-foreground">We collect information you provide directly: your email address when you create an account, and content you submit while using {PRODUCT.name}. We also collect standard server logs (IP addresses, browser type, pages visited) for security and performance monitoring.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">2. How we use your information</h2>
          <p className="text-muted-foreground">We use your information to provide and improve {PRODUCT.name}, send transactional emails (verification, password reset, support replies), and monitor for abuse. We do not sell your personal data.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">3. Data storage</h2>
          <p className="text-muted-foreground">Your data is stored securely via Supabase (PostgreSQL). All connections are encrypted in transit (TLS). We retain your data for as long as your account is active.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">4. Your rights</h2>
          <p className="text-muted-foreground">You may request deletion of your account and data at any time by contacting us at <a href={`mailto:${PRODUCT.supportEmail}`} className="underline">{PRODUCT.supportEmail}</a>. We will respond within 30 days.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">5. Contact</h2>
          <p className="text-muted-foreground">Questions about this policy? Email us at <a href={`mailto:${PRODUCT.supportEmail}`} className="underline">{PRODUCT.supportEmail}</a>.</p>
        </section>
      </div>
    </div>
  );
}
