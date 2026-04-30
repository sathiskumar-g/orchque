import { PRODUCT } from "@/lib/config";

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <div className="container max-w-3xl mx-auto py-16 px-4">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-muted-foreground text-sm mb-8">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

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
          <p className="text-muted-foreground">Free plan users receive a limited number of credits each month. Credits reset monthly and do not carry over. Paid plans are billed monthly and are non-refundable except where required by law.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">4. Intellectual property</h2>
          <p className="text-muted-foreground">You retain ownership of content you submit. By using {PRODUCT.name} you grant us a limited license to process your content solely to provide the service.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">5. Disclaimer & limitation of liability</h2>
          <p className="text-muted-foreground">The service is provided &quot;as is&quot; without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of {PRODUCT.name}.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">6. Contact</h2>
          <p className="text-muted-foreground">Questions? Email <a href={`mailto:${PRODUCT.supportEmail}`} className="underline">{PRODUCT.supportEmail}</a>.</p>
        </section>
      </div>
    </div>
  );
}
