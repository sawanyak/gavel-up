"use client";

import React from "react";

interface GavelUpTitleProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showSubtitle?: boolean;
}

export const GavelUpTitle: React.FC<GavelUpTitleProps> = ({
  className = "",
  size = "lg",
  showSubtitle = true,
}) => {
  // Dimension presets
  const sizeClasses = {
    sm: "max-w-xs",
    md: "max-w-md",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      {showSubtitle && (
        <div className="flex items-center gap-2 mb-2 tracking-[0.35em] text-xs sm:text-sm font-semibold uppercase text-cyan-200/90 drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]">
          {/* SLIIT Gavel Globe Logo */}
          <svg className="w-5 h-5 text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <span className="font-mono">SLIIT GAVEL CLUB</span>
        </div>
      )}

      {/* Main Vector "GAVEL UP" Logo styled like poster */}
      <div className={`w-full ${sizeClasses[size]} transition-transform duration-300 hover:scale-[1.02]`}>
        <svg
          viewBox="0 0 760 170"
          className="w-full h-auto drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Glow filter */}
            <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ffe5a3" floodOpacity="0.4" />
              <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#000000" floodOpacity="0.9" />
            </filter>

            {/* Visor Gradient */}
            <linearGradient id="visorGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="35%" stopColor="#98ddf4" />
              <stop offset="100%" stopColor="#41849e" />
            </linearGradient>

            {/* Letter Stroke Style */}
            <style>{`
              .gavel-letter {
                stroke: #F6EED8;
                stroke-width: 9;
                stroke-linecap: round;
                stroke-linejoin: round;
                fill: none;
                filter: url(#neon-glow);
              }
              .gavel-inner-fill {
                fill: rgba(246, 238, 216, 0.08);
              }
              .crewmate-body {
                stroke: #F6EED8;
                stroke-width: 9;
                stroke-linecap: round;
                stroke-linejoin: round;
                fill: rgba(197, 17, 17, 0.25);
              }
              .crewmate-visor {
                stroke: #F6EED8;
                stroke-width: 5;
                fill: url(#visorGrad);
              }
            `}</style>
          </defs>

          {/* ================= G ================= */}
          <g transform="translate(15, 10)">
            <path
              className="gavel-letter"
              d="M 52 40
                 C 48 18, 30 15, 18 25
                 C 0 40, -4 95, 6 125
                 C 14 145, 42 148, 52 135
                 C 58 126, 60 108, 60 98
                 L 32 98"
            />
          </g>

          {/* ================= A (The Among Us Character!) ================= */}
          <g transform="translate(95, 12)">
            {/* Backpack on Left */}
            <rect
              x="5"
              y="45"
              width="14"
              height="60"
              rx="7"
              className="gavel-letter"
              strokeWidth="8"
            />

            {/* Main Body with Legs */}
            <path
              className="crewmate-body"
              strokeWidth="9"
              d="M 22 135
                 L 22 55
                 C 22 18, 78 18, 78 55
                 L 78 135
                 C 78 143, 62 143, 62 135
                 L 62 115
                 C 62 110, 40 110, 40 115
                 L 40 135
                 C 40 143, 22 143, 22 135
                 Z"
            />

            {/* Visor Glass */}
            <rect
              x="36"
              y="45"
              width="44"
              height="26"
              rx="13"
              className="crewmate-visor"
            />
            {/* Visor white reflection shine */}
            <ellipse
              cx="54"
              cy="52"
              rx="12"
              ry="4"
              fill="#FFFFFF"
              opacity="0.85"
            />
          </g>

          {/* ================= V ================= */}
          <g transform="translate(205, 15)">
            <path
              className="gavel-letter"
              d="M 10 25
                 L 36 138
                 L 66 25"
            />
          </g>

          {/* ================= E ================= */}
          <g transform="translate(295, 15)">
            <path
              className="gavel-letter"
              d="M 52 26
                 L 12 26
                 L 12 136
                 L 54 136"
            />
            {/* Middle tine */}
            <path
              className="gavel-letter"
              d="M 12 80
                 L 44 80"
            />
          </g>

          {/* ================= L ================= */}
          <g transform="translate(375, 15)">
            <path
              className="gavel-letter"
              d="M 14 24
                 L 14 136
                 L 58 136"
            />
          </g>

          {/* ================= SPACE GAP ================= */}

          {/* ================= U ================= */}
          <g transform="translate(485, 15)">
            <path
              className="gavel-letter"
              d="M 14 25
                 L 14 100
                 C 14 140, 58 140, 58 100
                 L 58 25"
            />
          </g>

          {/* ================= P ================= */}
          <g transform="translate(575, 15)">
            <path
              className="gavel-letter"
              d="M 14 138
                 L 14 25
                 C 25 24, 58 20, 58 55
                 C 58 88, 25 86, 14 86"
            />
          </g>
        </svg>
      </div>
    </div>
  );
};
