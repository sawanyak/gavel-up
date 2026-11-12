"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Instagram, Facebook, Linkedin, Globe, ExternalLink } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="relative z-10 w-full border-t border-cyan-500/20 bg-slate-950/90 py-12 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-10">
          {/* Brand & Affiliation */}
          <div className="flex flex-col items-start">
            <Link href="/" className="inline-block mb-3 hover:opacity-90 transition-opacity">
              <Image
                src="/images/sliit-gavel-club-logo.png"
                alt="SLIIT Gavel Club Logo"
                width={170}
                height={52}
                className="h-11 sm:h-12 w-auto object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]"
              />
            </Link>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-[11px] font-mono text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Affiliated with Toastmasters International</span>
            </div>
          </div>

          {/* Gavel Social Media Channels (2x2 Grid) */}
          <div className="flex flex-col items-start md:items-end w-full md:w-auto">
            <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-400 mb-3">
              CONNECT WITH US
            </h4>
            <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
              <a
                href="https://www.instagram.com/sliitgavel?dlrf=MTY1MmRhMzNucTFxbw=="
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-pink-500/50 hover:bg-slate-800/80 text-slate-300 hover:text-white transition-all text-xs font-mono group min-w-[140px] sm:min-w-[170px]"
              >
                <Instagram className="w-4 h-4 text-pink-400 group-hover:scale-110 transition-transform shrink-0" />
                <span className="font-semibold">Instagram</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-pink-400 ml-auto hidden sm:inline" />
              </a>

              <a
                href="https://www.facebook.com/share/1G8Gm1nfTK/?mibextid=wwXIfr"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-blue-500/50 hover:bg-slate-800/80 text-slate-300 hover:text-white transition-all text-xs font-mono group min-w-[140px] sm:min-w-[170px]"
              >
                <Facebook className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform shrink-0" />
                <span className="font-semibold">Facebook</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 ml-auto hidden sm:inline" />
              </a>

              <a
                href="https://www.linkedin.com/company/sliit-gavel/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-cyan-500/50 hover:bg-slate-800/80 text-slate-300 hover:text-white transition-all text-xs font-mono group min-w-[140px] sm:min-w-[170px]"
              >
                <Linkedin className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform shrink-0" />
                <span className="font-semibold">LinkedIn</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 ml-auto hidden sm:inline" />
              </a>

              <a
                href="https://sliitgavel.wordpress.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-emerald-500/50 hover:bg-slate-800/80 text-slate-300 hover:text-white transition-all text-xs font-mono group min-w-[140px] sm:min-w-[170px]"
              >
                <Globe className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
                <span className="font-semibold">Official Website</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 ml-auto hidden sm:inline" />
              </a>
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
