import Link from "next/link";
import { PRODUCT } from "@/lib/config";

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <div className="container max-w-3xl mx-auto py-16 px-4">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-muted-foreground text-sm mb-8">Last updated: May 2, 2025</p>

      <div className="space-y-6 text-foreground">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. Acceptance</h2>
          <p className="text-muted-foreground">By accessing or using {PRODUCT.name}, you agree to be bound by these Terms. If you do not agree, do not use the service.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">2. Use of service</h2>
          <p className="text-muted-foreground">You agree not to misuse {PRODUCT.name}, attempt to circumvent usage limits, scrape the service, or use it for illegal purposes. We reserve the right to suspend accounts that violate these terms.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">3. Credits and billing</h2>
          <p className="text-muted-foreground">
            Free (Starter) plan users receive 10 lifetime optimization credits at no charge. Credits do not reset and cannot be transferred. Pro plan users have unlimited credits for a flat monthly fee of $12/month.
            Pro subscriptions are billed monthly and are subject to our{" "}
            <Link href="/legal/refund" className="underline hover:text-foreground">Refund Policy</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">4. Intellectual property</h2>
          <p className="text-muted-foreground">You retain ownership of content you submit. By using {PRODUCT.name} you grant us a limited license to process your content solely to provide the service.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">5. AI-generated output</h2>
          <p className="text-muted-foreground">
            {PRODUCT.name} uses AI to analyze and rewrite system prompts. All AI-generated output is provided &quot;as is&quot; without warranty of accuracy, completeness, or fitness for any particular purpose. You are responsible for reviewing and validating any output before use in production systems.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">6. Disclaimer &amp; limitation of liability</h2>
          <p className="text-muted-foreground">The service is provided &quot;as is&quot; without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of {PRODUCT.name}.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">7. Contact</h2>
          <p className="text-muted-foreground">
            Questions?{" "}
            <Link href="/contact" className="underline hover:text-foreground">Contact us</Link> or email{" "}
            <a href={`mailto:${PRODUCT.supportEmail}`} className="underline hover:text-foreground">{PRODUCT.supportEmail}</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
