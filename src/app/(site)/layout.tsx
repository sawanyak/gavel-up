"use client";

import React, { useState } from "react";
import { SpaceBackground } from "@/components/SpaceBackground";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

// Marketing site chrome (unchanged from the original root layout).
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <>
      {/* Animated Loading Screen on first load */}
      {isLoading && <LoadingScreen onComplete={() => setIsLoading(false)} />}

      {/* Dynamic Starfield & Drifting Crewmates Canvas */}
      <SpaceBackground />

      {/* Global Navigation Bar */}
      <Navbar />

      {/* Page Content */}
      <main className="relative z-10 flex-grow flex flex-col">{children}</main>

      {/* Global Footer */}
      <Footer />
    </>
  );
}
