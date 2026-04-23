"use client";

import Nav from "./nav";
import Hero from "./hero";
import FeaturesDemo from "./features-demo";
import WhoFor from "./who-for";
import Pricing from "./pricing";
import Footer from "./footer";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <Nav />
      <Hero />
      <FeaturesDemo />
      <WhoFor />
      <Pricing />
      <Footer />
    </div>
  );
}
