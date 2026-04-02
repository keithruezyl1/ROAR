import { Header } from '@/components/landing/Header';
import { HeroSection } from '@/components/landing/HeroSection';
import { ProblemSection } from '@/components/landing/ProblemSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { AboutSection } from '@/components/landing/AboutSection';
import { ContactSection } from '@/components/landing/ContactSection';
import { CtaSection } from '@/components/landing/CtaSection';
import { Footer } from '@/components/landing/Footer';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col w-full bg-bg-base overflow-x-hidden">
      {/* Site-wide dot grid texture — mathematical precision feel */}
      <div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{
          backgroundImage: 'radial-gradient(circle, #999 0.5px, transparent 0.5px)',
          backgroundSize: '24px 24px',
          opacity: 0.025,
        }}
        aria-hidden="true"
      />
      <Header />
      <main className="flex-1">
        <HeroSection />
        <ProblemSection />
        <FeaturesSection />
        <AboutSection />
        <PricingSection />
        <ContactSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
