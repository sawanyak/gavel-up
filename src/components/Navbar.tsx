"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Volume2, VolumeX, Menu, X, ExternalLink } from "lucide-react";
import { eventConfig } from "@/config/eventConfig";
import { sounds } from "@/lib/sounds";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Sound is muted initially

  React.useEffect(() => {
    setIsMuted(sounds.getMuted());
    const unsubscribe = sounds.subscribe((muted) => setIsMuted(muted));
    return unsubscribe;
  }, []);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "About Mission", href: "/about" },
    { label: "Why Join?", href: "/why-join" },
    { label: "How to Play", href: "/how-to-play" },
    { label: "Emergency Contact", href: "/contact" },
  ];

  const handleAudioToggle = () => {
    const nextMute = sounds.toggleMute();
    setIsMuted(nextMute);
  };

  const handleLinkClick = () => {
    sounds.playClick();
    setIsOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-cyan-500/20 bg-slate-950/80 backdrop-blur-md select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          href="/"
          onClick={handleLinkClick}
          className="flex items-center group transition-transform hover:scale-105"
        >
          <Image
            src="/images/sliit-gavel-club-logo.png"
            alt="SLIIT Gavel Club Logo"
            width={160}
            height={50}
            priority
            className="h-10 sm:h-12 w-auto object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]"
          />
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={handleLinkClick}
                className={`px-4 py-2 rounded-lg text-sm font-semibold tracking-wider transition-all duration-200 ${
                  isActive
                    ? "bg-cyan-500/15 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(0,240,255,0.3)]"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Actions: Audio Toggle & "Register Now" Button */}
        <div className="hidden md:flex items-center gap-4">
          {/* Sound Toggle (Theme Music & Sounds) */}
          <button
            onClick={handleAudioToggle}
            className={`p-2.5 rounded-xl border transition-all duration-300 shadow-inner flex items-center justify-center ${
              isMuted
                ? "border-slate-700 bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:border-slate-600"
                : "border-cyan-400/60 bg-cyan-950/60 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.4)]"
            }`}
            title={isMuted ? "Click to play Among Us Theme Music & Sounds" : "Click to mute Theme Music & Sounds"}
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-red-400" />
            ) : (
              <Volume2 className="w-5 h-5 text-cyan-400 animate-pulse" />
            )}
          </button>

          {/* Primary CTA: Register Now (Points to Google Form) */}
          <a
            href={eventConfig.googleFormUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => sounds.playStart()}
            className="relative group px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white font-bold text-sm tracking-wider uppercase border-2 border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.6)] hover:shadow-[0_0_30px_rgba(239,68,68,0.9)] transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            <span>REGISTER NOW</span>
            <ExternalLink className="w-4 h-4 opacity-80" />
          </a>
        </div>

        {/* Mobile Menu & Sound Buttons */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={handleAudioToggle}
            className={`p-2 rounded-lg border transition-colors ${
              isMuted
                ? "border-slate-700 bg-slate-900 text-slate-400"
                : "border-cyan-400/60 bg-cyan-950/60 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.4)]"
            }`}
            title={isMuted ? "Play Among Us Theme" : "Mute Sound"}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-cyan-400 animate-pulse" />}
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setIsOpen(!isOpen);
            }}
            className="p-2 rounded-lg border border-cyan-500/50 bg-slate-900 text-cyan-400"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="md:hidden border-t border-cyan-500/20 bg-slate-950/95 px-4 pt-3 pb-6 flex flex-col gap-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={handleLinkClick}
                className={`px-4 py-3 rounded-lg text-base font-semibold tracking-wide ${
                  isActive
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40"
                    : "text-slate-300 hover:bg-slate-900"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          <div className="pt-3">
            <a
              href={eventConfig.googleFormUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                sounds.playStart();
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold tracking-wider uppercase border border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.7)]"
            >
              <span>REGISTER NOW (GOOGLE FORM)</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
