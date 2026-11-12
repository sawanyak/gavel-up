"use client";

import React, { useState, useEffect } from "react";

interface LoadingScreenProps {
  onComplete: () => void;
}

// Razor-sharp Animated Vector Running Crewmate (authentically running legs & bobbing body)
const RunningCrewmateVector: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    viewBox="0 0 110 115"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="runningCrewVisor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="25%" stopColor="#98DDF4" />
        <stop offset="75%" stopColor="#38FEDC" />
        <stop offset="100%" stopColor="#187878" />
      </linearGradient>
      <style>{`
        @keyframes legBackRun {
          0%, 100% { transform: rotate(-28deg); }
          50% { transform: rotate(28deg); }
        }
        @keyframes legFrontRun {
          0%, 100% { transform: rotate(28deg); }
          50% { transform: rotate(-28deg); }
        }
        @keyframes bodyRunBob {
          0%, 100% { transform: translateY(0) rotate(4deg); }
          25% { transform: translateY(-3.5px) rotate(2deg); }
          50% { transform: translateY(0) rotate(-1deg); }
          75% { transform: translateY(-3.5px) rotate(3deg); }
        }
        .anim-leg-back {
          transform-origin: 36px 74px;
          animation: legBackRun 0.26s infinite ease-in-out;
        }
        .anim-leg-front {
          transform-origin: 64px 74px;
          animation: legFrontRun 0.26s infinite ease-in-out;
        }
        .anim-body-bob {
          animation: bodyRunBob 0.26s infinite ease-in-out;
        }
      `}</style>
    </defs>

    {/* Back Leg (swings in running stride) */}
    <g className="anim-leg-back">
      <path
        d="M 26 74 L 26 98 C 26 106, 42 106, 42 98 L 42 74 Z"
        fill="#15A700"
        stroke="#000000"
        strokeWidth="5.5"
        strokeLinejoin="round"
      />
      <path d="M 28 76 L 28 96 C 28 102, 38 102, 38 96 L 38 76 Z" fill="#50EF39" />
    </g>

    {/* Torso, Head, Backpack, Visor (bobs dynamically with running gait) */}
    <g className="anim-body-bob">
      {/* 1. Backpack on Left */}
      <path
        d="M 10 35 L 10 74 C 10 82, 22 82, 22 74 L 22 35 C 22 28, 10 28, 10 35 Z"
        fill="#15A700"
        stroke="#000000"
        strokeWidth="5.5"
        strokeLinejoin="round"
      />
      <path d="M 12 37 C 12 32, 20 32, 20 37 L 20 62 C 18 58, 14 58, 12 62 Z" fill="#50EF39" />

      {/* 2. Main Torso and Head */}
      <path
        d="M 24 38
           C 24 10, 80 10, 80 38
           L 80 74
           C 74 78, 30 78, 24 74
           Z"
        fill="#15A700"
        stroke="#000000"
        strokeWidth="5.5"
        strokeLinejoin="round"
      />
      <path
        d="M 26 38
           C 26 14, 78 14, 78 38
           L 78 70
           C 70 66, 34 66, 26 70
           Z"
        fill="#50EF39"
      />

      {/* 3. Visor Glass with Glare Reflection */}
      <rect x="48" y="26" width="42" height="26" rx="13" fill="#000000" />
      <rect x="50" y="28" width="38" height="22" rx="11" fill="url(#runningCrewVisor)" />
      <ellipse cx="66" cy="34" rx="12" ry="4" fill="#FFFFFF" opacity="0.9" />
    </g>

    {/* Front Leg (alternates opposite to back leg) */}
    <g className="anim-leg-front">
      <path
        d="M 54 74 L 54 98 C 54 106, 70 106, 70 98 L 70 74 Z"
        fill="#15A700"
        stroke="#000000"
        strokeWidth="5.5"
        strokeLinejoin="round"
      />
      <path d="M 56 76 L 56 96 C 56 102, 66 102, 66 96 L 66 76 Z" fill="#50EF39" />
    </g>
  </svg>
);

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<"loading" | "fadeOut" | "done">("loading");
  const [progress, setProgress] = useState(0);

  // Buttery smooth requestAnimationFrame timer (0% to 100% in ~2.2s)
  useEffect(() => {
    if (phase !== "loading") return;

    let animId: number;
    let startTime: number | null = null;
    const duration = 2200; // 2.2 seconds

    const step = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const pct = Math.min(100, Math.floor((elapsed / duration) * 100));
      setProgress(pct);

      if (pct < 100) {
        animId = requestAnimationFrame(step);
      } else {
        setTimeout(() => {
          setPhase("fadeOut");
        }, 200);
      }
    };

    animId = requestAnimationFrame(step);

    // Hard fallback safety timer: guarantees transition even under background tab throttling
    const fallbackTimer = setTimeout(() => {
      setProgress(100);
      setPhase("fadeOut");
    }, duration + 500);

    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(fallbackTimer);
    };
  }, [phase]);

  // Fade out transition directly to homepage
  useEffect(() => {
    if (phase === "fadeOut") {
      const endTimer = setTimeout(() => {
        setPhase("done");
        onComplete();
      }, 650);
      return () => clearTimeout(endTimer);
    }
  }, [phase, onComplete]);

  if (phase === "done") return null;

  // Clamped horizontal runner position (5% to 95%) across the loading bar width
  const runnerLeft = Math.min(95, Math.max(5, progress));

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black select-none transition-opacity duration-700 ease-out px-4 ${
        phase === "fadeOut" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Official "AMONG US" Title from attached image */}
      <div className="mb-12 sm:mb-16 w-80 sm:w-[420px] md:w-[480px] max-w-full flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/among-us-title.png"
          alt="AMONG US"
          className="w-full h-auto object-contain drop-shadow-[0_0_25px_rgba(255,255,255,0.35)]"
        />
      </div>

      {/* Loading Bar with Running Crewmate on Top */}
      <div className="relative w-80 sm:w-[440px] max-w-full">
        {/* Animated Vector Running Crewmate moving in real time across the bar */}
        <div
          className="absolute bottom-full mb-0.5 pointer-events-none z-20"
          style={{
            left: `${runnerLeft}%`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]">
            <RunningCrewmateVector className="w-12 sm:w-14 h-auto" />
          </div>
        </div>

        {/* Progress Bar Frame */}
        <div className="w-full h-7 sm:h-8 rounded-lg border-2 border-white bg-black/90 p-1 shadow-[0_0_20px_rgba(0,240,255,0.25)] relative overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#187878] via-[#20A0A0] to-[#38FEDC] rounded shadow-[0_0_12px_rgba(56,254,220,0.7)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Status Message */}
        <div className="flex justify-between items-center mt-3 text-xs font-mono text-cyan-300 tracking-wider">
          <span>CONNECTING TO SLIIT SKELD...</span>
          <span className="font-bold">{progress}%</span>
        </div>
      </div>
    </div>
  );
};
