"use client";

import React, { useState, useEffect } from "react";
import { CrewmateVector } from "./CrewmateVector";
import { sounds } from "@/lib/sounds";

interface LoadingScreenProps {
  onComplete: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<"shh" | "role" | "done">("shh");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Phase 1: SHH screen for 1.8 seconds
    const shhTimer = setTimeout(() => {
      setPhase("role");
      sounds.playRoleReveal();
    }, 1800);

    // Progress bar ticker
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 5;
      });
    }, 140);

    // End after role reveal
    const completeTimer = setTimeout(() => {
      setPhase("done");
      onComplete();
    }, 4600);

    return () => {
      clearTimeout(shhTimer);
      clearTimeout(completeTimer);
      clearInterval(progressInterval);
    };
  }, [onComplete]);

  const handleSkip = () => {
    sounds.playClick();
    setPhase("done");
    onComplete();
  };

  if (phase === "done") return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black select-none transition-opacity duration-700">
      {/* Skip Button */}
      <button
        onClick={handleSkip}
        className="absolute top-6 right-6 px-4 py-2 rounded-lg border border-cyan-500/50 bg-slate-900/80 text-cyan-400 font-mono text-xs uppercase tracking-widest hover:bg-cyan-500/20 hover:border-cyan-400 transition-all z-20 flex items-center gap-1.5"
      >
        <span>SKIP INTRO</span>
        <span>&gt;</span>
      </button>

      {/* PHASE 1: SHH! Screen */}
      {phase === "shh" && (
        <div className="flex flex-col items-center animate-fade-in">
          <div className="relative mb-6">
            <CrewmateVector color="red" size={170} glow />
            {/* Red finger over visor */}
            <div className="absolute top-[38px] left-[78px] w-5 h-16 bg-red-700 rounded-full border-2 border-black rotate-[-12deg] shadow-lg" />
          </div>

          <h1 className="text-6xl sm:text-7xl font-black tracking-widest text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.7)]">
            SHHHHH!
          </h1>
          <p className="mt-3 font-mono text-xs sm:text-sm text-slate-400 tracking-widest uppercase">
            ORIENTATION PROTOCOL INITIATING...
          </p>
        </div>
      )}

      {/* PHASE 2: Role Reveal Screen */}
      {phase === "role" && (
        <div className="flex flex-col items-center px-4 text-center max-w-lg">
          {/* Crewmate line up */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <CrewmateVector color="cyan" size={70} isFloating />
            <CrewmateVector color="red" size={120} glow isFloating />
            <CrewmateVector color="yellow" size={70} isFloating />
          </div>

          <div className="mb-2">
            <span className="text-4xl sm:text-6xl font-black tracking-wider text-cyan-400 uppercase drop-shadow-[0_0_25px_rgba(56,254,220,0.8)]">
              CREWMATE
            </span>
          </div>

          <p className="text-lg sm:text-xl font-bold text-red-500 tracking-wide mb-1 drop-shadow-[0_0_12px_rgba(239,68,68,0.7)]">
            There is 1 Impostor Among Us
          </p>
          <p className="text-xs sm:text-sm text-slate-400 font-mono tracking-wider max-w-sm mb-8">
            Speak up. Defend your ideas. Conquer stage fright.
          </p>

          {/* Progress bar */}
          <div className="w-64 sm:w-80 h-3 bg-slate-900 border border-cyan-500/60 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="mt-2 text-[10px] font-mono tracking-widest text-cyan-300/80 uppercase">
            CONNECTING TO SLIIT SKELD SERVER [{progress}%]
          </span>
        </div>
      )}
    </div>
  );
};
