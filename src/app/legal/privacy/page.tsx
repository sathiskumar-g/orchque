import Link from "next/link";
import { PRODUCT } from "@/lib/config";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="container max-w-3xl mx-auto py-16 px-4">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-muted-foreground text-sm mb-8">Last updated: May 2, 2025</p>

      <div className="prose prose-sm max-w-none space-y-6 text-foreground">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. Information we collect</h2>
          <p className="text-muted-foreground">We collect information you provide directly: your email address when you create an account, and system prompt content you submit while using {PRODUCT.name}. We also collect standard server logs (IP addresses, browser type, pages visited) for security and performance monitoring.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">2. How we use your information</h2>
          <p className="text-muted-foreground">We use your information to provide and improve {PRODUCT.name}, send transactional emails (verification, password reset, support replies), process your system prompts through our AI optimization pipeline, and monitor for abuse. We do not sell your personal data.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">3. AI processing</h2>
          <p className="text-muted-foreground">System prompts you submit are processed by third-party AI providers (Anthropic Claude) to deliver the optimization and security analysis features of {PRODUCT.name}. These providers process your content solely to return results and do not retain it for model training by default. Please review Anthropic&apos;s privacy policy for details.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">4. Data storage</h2>
          <p className="text-muted-foreground">Your account data, saved skills, and version history are stored securely via Supabase (PostgreSQL hosted on AWS). All connections are encrypted in transit (TLS). We retain your data for as long as your account is active. You may delete your account and all associated data at any time.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">5. Cookies &amp; analytics</h2>
          <p className="text-muted-foreground">We use essential cookies required for authentication. We do not use third-party advertising cookies. Basic analytics (page views, referrers) may be collected to understand usage patterns and improve the product.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">6. Your rights</h2>
          <p className="text-muted-foreground">You may request deletion of your account and data at any time by contacting us at <a href={`mailto:${PRODUCT.supportEmail}`} className="underline hover:text-foreground">{PRODUCT.supportEmail}</a>. We will respond within 30 days. If you are in the EU/EEA, you have additional rights under the GDPR including access, rectification, and portability.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">7. Contact</h2>
          <p className="text-muted-foreground">
            Questions about this policy?{" "}
            <Link href="/contact" className="underline hover:text-foreground">Contact us</Link> or email{" "}
            <a href={`mailto:${PRODUCT.supportEmail}`} className="underline hover:text-foreground">{PRODUCT.supportEmail}</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
