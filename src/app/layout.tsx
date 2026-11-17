import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GAVEL UP | SLIIT Gavel Club (Among Us Orientation)",
  description:
    "SLIIT Gavel Club's flagship orientation event: GAVEL UP. Join the crew, play Among Us in real life, and master public speaking!",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-space-deep text-slate-100 antialiased selection:bg-cyan-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
