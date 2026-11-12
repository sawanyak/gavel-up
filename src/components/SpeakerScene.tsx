"use client";

import React, { useState } from "react";
import { CrewmateVector, CrewmateColor } from "./CrewmateVector";
import { sounds } from "@/lib/sounds";

interface AudienceMember {
  color: CrewmateColor;
  facing: "left" | "right";
}

const AUDIENCE_ROW_1: AudienceMember[] = [
  { color: "cyan", facing: "right" },
  { color: "lime", facing: "right" },
  { color: "yellow", facing: "right" },
  { color: "purple", facing: "left" },
  { color: "pink", facing: "left" },
];

const AUDIENCE_ROW_2: AudienceMember[] = [
  { color: "orange", facing: "right" },
  { color: "blue", facing: "right" },
  { color: "white", facing: "right" },
  { color: "green", facing: "left" },
  { color: "black", facing: "left" },
];

const GAVEL_QUOTES = [
  "Welcome crewmates! Your voice is your ultimate superpower.",
  "Public speaking isn't about being fearless: it's about speaking even when nervous!",
  "There is 1 Impostor Among Us... and their name is Self-Doubt!",
  "At SLIIT Gavel Club, everyone gets the stage. No one is ejected!",
  "Master the art of impromptu speaking and lead every emergency meeting!",
];

export const SpeakerScene: React.FC = () => {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [showSpeechBubble, setShowSpeechBubble] = useState(false);

  const handleSpeakerClick = () => {
    sounds.playClick();
    setQuoteIndex((prev) => (prev + 1) % GAVEL_QUOTES.length);
    setShowSpeechBubble(true);
    setTimeout(() => {
      setShowSpeechBubble(false);
    }, 4500);
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto rounded-3xl overflow-hidden border-2 border-cyan-500/30 bg-gradient-to-b from-space-cockpit to-black shadow-2xl p-4 sm:p-8 select-none">
      {/* Spaceship Window & Stars in Background */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute top-8 right-12 w-20 h-20 rounded-full bg-blue-400/30 border border-blue-300/40 blur-xs shadow-[0_0_25px_rgba(56,189,248,0.5)]" />
      </div>

      {/* Cockpit Ceiling Arches & Emergency Alert Lights */}
      <div className="relative z-10 flex justify-between items-center px-4 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-600 animate-ping opacity-75" />
          <div className="w-4 h-4 rounded-full bg-red-600 shadow-[0_0_12px_#ef4444]" />
          <span className="text-[10px] font-mono tracking-widest text-red-400 uppercase hidden sm:inline">
            MAIN AUDITORIUM DECK
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase hidden sm:inline">
            TRANSMISSION ACTIVE
          </span>
          <div className="w-4 h-4 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_12px_#00f0ff]" />
        </div>
      </div>

      {/* Main Presentation Stage */}
      <div className="relative z-10 flex flex-col items-center pt-4 pb-2">
        {/* Overhead Spotlight Effect */}
        <div className="absolute top-0 w-64 h-72 bg-gradient-to-b from-yellow-200/25 via-cyan-300/10 to-transparent clip-path-spotlight pointer-events-none blur-sm" />

        {/* Interactive Speech Bubble */}
        <div
          className={`absolute -top-6 sm:-top-8 transition-all duration-300 z-30 max-w-xs sm:max-w-md ${
            showSpeechBubble
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 translate-y-2 pointer-events-none"
          }`}
        >
          <div className="bg-white text-gray-950 font-medium text-xs sm:text-sm px-4 py-2.5 rounded-2xl shadow-2xl border-2 border-red-500 relative">
            <p className="font-bold text-red-600 text-[11px] uppercase tracking-wider mb-0.5">
              Red Speaker (President):
            </p>
            {GAVEL_QUOTES[quoteIndex]}
            <div className="w-3 h-3 bg-white border-r-2 border-b-2 border-red-500 transform rotate-45 absolute -bottom-2 left-1/2 -translate-x-1/2" />
          </div>
        </div>

        {/* The Red Speaker & Podium */}
        <div
          onClick={handleSpeakerClick}
          className="group relative cursor-pointer flex flex-col items-center transition-transform hover:scale-105 active:scale-95"
          title="Click the speaker to hear a Gavel tip!"
        >
          {/* Speaker Glow */}
          <div className="absolute -inset-2 rounded-full bg-red-600/20 filter blur-xl group-hover:bg-red-600/40 transition-colors" />

          {/* Red Crewmate Speaker */}
          <div className="relative z-20">
            <CrewmateVector
              color="red"
              size={135}
              hasMic={false}
              facing="right"
              glow
            />
          </div>

          {/* Podium with Gooseneck Mic */}
          <div className="relative -mt-10 z-20 w-44 sm:w-52 h-20 bg-gradient-to-b from-slate-800 via-slate-900 to-black rounded-lg border-2 border-slate-600 shadow-2xl flex flex-col items-center justify-between p-2">
            {/* Gooseneck Mic SVG */}
            <div className="absolute -top-12 left-10 w-8 h-12">
              <svg viewBox="0 0 40 60" className="w-full h-full text-slate-300">
                <path
                  d="M 10 50 Q 25 30 18 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <circle cx="18" cy="8" r="6" fill="#111" stroke="#ef4444" strokeWidth="2" />
              </svg>
            </div>

            {/* Podium Gavel Club Emblem */}
            <div className="w-full flex items-center justify-center gap-1.5 pt-1 text-[10px] tracking-wider font-mono text-cyan-300 font-bold border-b border-slate-700/80 pb-1">
              <span>★</span>
              <span>SLIIT GAVEL DECK</span>
              <span>★</span>
            </div>

            <span className="text-[9px] font-mono text-slate-400 tracking-wider">
               CLICK TO SPEAK 
            </span>
          </div>

          {/* Stage floor dais */}
          <div className="w-64 sm:w-80 h-6 bg-gradient-to-r from-transparent via-cyan-900/40 to-transparent rounded-full blur-xs mt-1" />
        </div>

        {/* Audience Section (Stationed as the Meeting Audience, all looking at the Speaker) */}
        <div className="relative z-20 w-full max-w-2xl mx-auto flex flex-col items-center gap-3.5 mt-4 select-none px-2 sm:px-4">
          {/* Subtle Stage Floor Indicator Line */}
          <div className="w-full max-w-md h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent -mb-1" />

          {/* Row 1 (Front Row - 5 Crewmates in Curved Arc) */}
          <div className="flex items-end justify-center gap-3 sm:gap-7">
            {AUDIENCE_ROW_1.map((cm, idx) => {
              const curveClass =
                idx === 0 || idx === 4
                  ? "-translate-y-1.5"
                  : idx === 1 || idx === 3
                  ? "-translate-y-0.5"
                  : "translate-y-0";

              return (
                <div
                  key={idx}
                  className={`hover:scale-125 active:scale-95 transition-transform cursor-pointer ${curveClass}`}
                  onClick={() => sounds.playClick()}
                  title={`Audience: ${cm.color}`}
                >
                  <CrewmateVector
                    color={cm.color}
                    size={42}
                    facing={cm.facing}
                  />
                </div>
              );
            })}
          </div>

          {/* Row 2 (Middle Row - 5 Crewmates in Curved Arc) */}
          <div className="flex items-end justify-center gap-3 sm:gap-7">
            {AUDIENCE_ROW_2.map((cm, idx) => {
              const curveClass =
                idx === 0 || idx === 4
                  ? "-translate-y-1.5"
                  : idx === 1 || idx === 3
                  ? "-translate-y-0.5"
                  : "translate-y-0";

              return (
                <div
                  key={idx}
                  className={`hover:scale-125 active:scale-95 transition-transform cursor-pointer ${curveClass}`}
                  onClick={() => sounds.playClick()}
                  title={`Audience: ${cm.color}`}
                >
                  <CrewmateVector
                    color={cm.color}
                    size={42}
                    facing={cm.facing}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
