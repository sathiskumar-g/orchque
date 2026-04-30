import Navbar from "@/components/marketing/Navbar";
import PricingSection from "@/components/marketing/PricingSection";
import Footer from "@/components/marketing/Footer";

export const metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <PricingSection />
      </main>
      <Footer />
    </>
  );
}
