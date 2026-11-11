"use client";

import React from "react";
import Link from "next/link";
import { eventConfig } from "@/config/eventConfig";
import { sounds } from "@/lib/sounds";

export const Footer: React.FC = () => {
  return (
    <footer className="relative z-10 w-full border-t border-cyan-500/20 bg-slate-950/90 py-12 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Column 1: Event Identity */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-red-600 border border-red-400 flex items-center justify-center">
                <span className="text-white font-mono font-bold text-sm">G</span>
              </div>
              <span className="text-xl font-black tracking-wider text-white">
                GAVEL UP 2026
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-md mb-4 leading-relaxed">
              The flagship orientation event of the{" "}
              <strong className="text-cyan-300">SLIIT Gavel Club</strong>. Find your authentic voice, develop leadership command, and experience the adrenaline of Among Us in real life!
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-[11px] font-mono text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Affiliated with Toastmasters International</span>
            </div>
          </div>

          {/* Column 2: Navigation Links */}
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-400 mb-3">
              SPACESHIP DECKS
            </h4>
            <ul className="space-y-2 text-sm text-slate-300 font-medium">
              <li>
                <Link
                  href="/"
                  onClick={() => sounds.playClick()}
                  className="hover:text-cyan-300 transition-colors"
                >
                  Bridge (Home)
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  onClick={() => sounds.playClick()}
                  className="hover:text-cyan-300 transition-colors"
                >
                  Mission Briefing (About)
                </Link>
              </li>
              <li>
                <Link
                  href="/why-join"
                  onClick={() => sounds.playClick()}
                  className="hover:text-cyan-300 transition-colors"
                >
                  Crewmate Perks (Why Join?)
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  onClick={() => sounds.playClick()}
                  className="hover:text-cyan-300 transition-colors"
                >
                  Emergency Meeting (Contact)
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Registration & Socials */}
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-400 mb-3">
              COMMUNICATIONS
            </h4>
            <p className="text-xs text-slate-400 mb-3 font-mono">
              Ready to take the stage? Secure your seat via the official registration form:
            </p>
            <a
              href={eventConfig.googleFormUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => sounds.playStart()}
              className="inline-block px-4 py-2 rounded-lg bg-red-600/30 border border-red-500 text-red-300 text-xs font-bold tracking-wider uppercase hover:bg-red-600 hover:text-white transition-all shadow-[0_0_12px_rgba(239,68,68,0.4)] mb-4"
            >
              Open Google Form &gt;
            </a>

            <div className="flex items-center gap-3 text-slate-400 text-xs font-mono">
              <span>VENUE:</span>
              <span className="text-slate-200">{eventConfig.venue}</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4 font-mono">
          <p>© {new Date().getFullYear()} SLIIT Gavel Club. All rights reserved.</p>
          <p className="text-cyan-500/80">
            &quot;There is 1 Impostor Among Us... speak up and unmask them.&quot;
          </p>
        </div>
      </div>
    </footer>
  );
};
