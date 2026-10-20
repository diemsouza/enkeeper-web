"use client";

import Nav from "./nav";
import Hero from "./hero";
import Simulator from "./simulator/simulator";
import FloatingCta from "./floating-cta";
import HowItWorksSection from "./how-it-works-section";
import FeaturesSection from "./features-section";
import WhoFor from "./who-for";
import Pricing from "./pricing";
import FaqSection from "./faq-section";
import Footer from "./footer";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <Nav />
      <Hero />
      <Simulator />
      <FloatingCta />
      <HowItWorksSection />
      <FeaturesSection />
      <WhoFor />
      <Pricing />
      <FaqSection />
      <Footer />
    </div>
  );
}
