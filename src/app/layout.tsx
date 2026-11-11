"use client";

import React, { useState } from "react";
import "./globals.css";
import { SpaceBackground } from "@/components/SpaceBackground";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <html lang="en" className="dark">
      <head>
        <title>GAVEL UP | SLIIT Gavel Club (Among Us Orientation)</title>
        <meta
          name="description"
          content="SLIIT Gavel Club's flagship orientation event: GAVEL UP. Join the crew, play Among Us in real life, and master public speaking!"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen flex flex-col bg-space-deep text-slate-100 antialiased selection:bg-cyan-500 selection:text-black">
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
      </body>
    </html>
  );
}
