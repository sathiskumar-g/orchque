import Link from "next/link";
import { PRODUCT } from "@/lib/config";

export const metadata = {
  title: `Refund Policy — ${PRODUCT.name}`,
  description: `${PRODUCT.name} Refund Policy — eligibility, process, and timelines for subscription refunds.`,
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-4">Refund Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: May 2, 2025</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-foreground">

          <section>
            <p className="text-muted-foreground">
              We want you to be satisfied with {PRODUCT.name}. This policy explains when refunds are available,
              how to request one, and what to expect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">1. Free Tier (Starter)</h2>
            <p className="text-muted-foreground">
              The Starter tier is free. You receive 10 lifetime optimization credits at no charge and can
              save up to 3 skills with 3 versions each. No payment is required and no refunds apply.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">2. Pro Plan — 7-Day Money-Back Guarantee</h2>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
              <p className="font-semibold text-blue-600 dark:text-blue-400 mb-1">
                Payment Integration Coming Soon
              </p>
              <p className="text-sm text-muted-foreground">
                Pro plan billing is not yet live. This refund policy will take full effect once payments are enabled.
              </p>
            </div>
            <p className="text-muted-foreground">
              If you subscribe to the {PRODUCT.name} Pro plan and are not satisfied, you may request a full
              refund within <strong>7 days of your initial purchase</strong>, subject to the usage limit below.
            </p>
            <p className="text-muted-foreground mt-3">Eligibility requirements:</p>
            <ul className="list-disc list-inside space-y-2 mt-2 text-muted-foreground">
              <li>Your refund request must be submitted within 7 calendar days of the original payment date.</li>
              <li>This applies to the <strong>first payment only</strong> on a new subscription — not to renewals.</li>
              <li>
                <strong>Usage limit:</strong> You must have used <strong>5 or fewer optimization credits</strong> during
                the subscription period. If you have used more than 5 credits, the service has been meaningfully consumed
                and a refund will not be issued.
              </li>
              <li>
                Your account must not have violated our{" "}
                <Link href="/legal/terms" className="underline hover:text-foreground">Terms of Service</Link>.
              </li>
            </ul>
            <div className="bg-muted/50 border border-border/60 rounded-lg p-4 mt-4">
              <p className="text-sm text-muted-foreground">
                <strong>Why a usage limit?</strong> The Pro plan includes unlimited monthly credits. Consuming a
                significant portion of the service and then requesting a refund is not in the spirit of a money-back
                guarantee. 5 credits gives you enough to evaluate {PRODUCT.name} without exhausting it.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">3. Renewals</h2>
            <p className="text-muted-foreground">
              If you forget to cancel before a renewal date and are charged for the next billing period, you may
              request a refund for that renewal charge within <strong>48 hours</strong> of the charge, provided
              you have not used the service during that new period. Contact us at{" "}
              <a href={`mailto:${PRODUCT.supportEmail}`} className="underline hover:text-foreground">{PRODUCT.supportEmail}</a> promptly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">4. Non-Refundable Situations</h2>
            <p className="text-muted-foreground">Refunds will <strong>not</strong> be issued for:</p>
            <ul className="list-disc list-inside space-y-2 mt-2 text-muted-foreground">
              <li>Requests made after the 7-day window for initial purchases.</li>
              <li>Accounts where more than 5 optimization credits have been used — the service has been meaningfully consumed.</li>
              <li>Renewal charges where the service has been used during the new billing period.</li>
              <li>Accounts terminated for violating our Terms of Service.</li>
              <li>Partial months — we do not offer pro-rated refunds for unused time.</li>
              <li>
                Dissatisfaction with AI-generated output quality — as disclosed in our{" "}
                <Link href="/legal/terms" className="underline hover:text-foreground">Terms of Service</Link>,
                all AI-generated optimizations are provided as-is and outputs are not guaranteed.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">5. How to Request a Refund</h2>
            <p className="text-muted-foreground">
              To request a refund, email us at{" "}
              <a href={`mailto:${PRODUCT.supportEmail}`} className="underline hover:text-foreground">{PRODUCT.supportEmail}</a>{" "}
              or use our <Link href="/contact" className="underline hover:text-foreground">Contact page</Link> with:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-2 text-muted-foreground">
              <li>Subject line: <strong>Refund Request — [your email]</strong></li>
              <li>The email address on your {PRODUCT.name} account.</li>
              <li>Your order or transaction number (found in your payment receipt email).</li>
              <li>The reason for your request (optional, but helps us improve).</li>
            </ul>
            <p className="mt-3 text-muted-foreground">
              We will respond within <strong>2 business days</strong>. Once approved, your refund will be processed
              and typically appear on your statement within 5–10 business days depending on your bank.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">6. Payment Processing</h2>
            <p className="text-muted-foreground">
              Payments for {PRODUCT.name} Pro are processed by our payment provider{" "}
              <em>(payment integration coming soon)</em>. {PRODUCT.name} does not store your card details.
              Refunds are issued back to the original payment method and typically appear within 5–10 business days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">7. Disputes &amp; Chargebacks</h2>
            <p className="text-muted-foreground">
              We strongly encourage you to contact us before initiating a chargeback with your bank. In most cases
              we can resolve issues quickly. Chargebacks filed without first contacting us may result in account
              suspension while the dispute is investigated.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">8. Contact</h2>
            <p className="text-muted-foreground">
              Questions about this policy?{" "}
              <Link href="/contact" className="underline hover:text-foreground">Contact us</Link> or email{" "}
              <a href={`mailto:${PRODUCT.supportEmail}`} className="underline hover:text-foreground">{PRODUCT.supportEmail}</a>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
