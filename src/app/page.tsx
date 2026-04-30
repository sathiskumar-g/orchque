import Navbar from "@/components/marketing/Navbar";
import Hero from "@/components/marketing/Hero";
import Features from "@/components/marketing/Features";
import PricingSection from "@/components/marketing/PricingSection";
import Footer from "@/components/marketing/Footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Features />
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
}
