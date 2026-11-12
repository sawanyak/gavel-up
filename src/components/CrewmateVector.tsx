"use client";

import React from "react";

export type CrewmateColor =
  | "red"
  | "blue"
  | "cyan"
  | "green"
  | "yellow"
  | "orange"
  | "purple"
  | "pink"
  | "lime"
  | "black"
  | "white";

interface CrewmateVectorProps {
  color?: CrewmateColor;
  size?: number;
  className?: string;
  hasGavel?: boolean;
  hasMic?: boolean;
  isDead?: boolean;
  isImpostor?: boolean;
  isFloating?: boolean;
  facing?: "left" | "right";
  glow?: boolean;
}

const COLOR_MAP: Record<CrewmateColor, { base: string; dark: string; shadow: string }> = {
  red: { base: "#C51111", dark: "#7A0838", shadow: "#42041D" },
  blue: { base: "#132ED1", dark: "#09158E", shadow: "#040A47" },
  cyan: { base: "#38FEDC", dark: "#24A8BE", shadow: "#125A66" },
  green: { base: "#117F2D", dark: "#0A4D1A", shadow: "#04260C" },
  yellow: { base: "#F5F557", dark: "#C28700", shadow: "#6B4B00" },
  orange: { base: "#F07D0D", dark: "#B04400", shadow: "#5C2300" },
  purple: { base: "#6B2FBC", dark: "#3B177C", shadow: "#1E0A40" },
  pink: { base: "#ED54BA", dark: "#AB2BAB", shadow: "#5E145E" },
  lime: { base: "#50EF39", dark: "#15A700", shadow: "#0A5400" },
  black: { base: "#3F474E", dark: "#1E1F26", shadow: "#0F1014" },
  white: { base: "#D6E0F0", dark: "#8394BF", shadow: "#45506E" },
};

export const CrewmateVector: React.FC<CrewmateVectorProps> = ({
  color = "red",
  size = 120,
  className = "",
  hasGavel = false,
  hasMic = false,
  isImpostor = false,
  isFloating = false,
  facing = "right",
  glow = false,
}) => {
  const c = COLOR_MAP[color] || COLOR_MAP.red;
  const flip = facing === "left" ? "scale-x-[-1]" : "";

  return (
    <div
      style={{ width: size, height: size * 1.25 }}
      className={`relative inline-block select-none ${flip} ${
        isFloating ? "animate-float" : ""
      } ${className}`}
    >
      <svg
        viewBox="0 0 100 125"
        className={`w-full h-full ${
          isImpostor
            ? "filter drop-shadow-[0_0_18px_rgba(239,68,68,0.95)]"
            : glow
            ? "filter drop-shadow-[0_0_12px_rgba(0,240,255,0.7)]"
            : "drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]"
        }`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`visor-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="25%" stopColor="#98DDF4" />
            <stop offset="80%" stopColor="#41849E" />
            <stop offset="100%" stopColor="#255163" />
          </linearGradient>
          <linearGradient id="visor-impostor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFAAAA" />
            <stop offset="30%" stopColor="#EF4444" />
            <stop offset="80%" stopColor="#990011" />
            <stop offset="100%" stopColor="#440005" />
          </linearGradient>
        </defs>

        {/* 1. Backpack */}
        <g id="backpack">
          {/* Backpack Shadow */}
          <path
            d="M 12 40 L 12 85 C 12 92, 24 92, 24 85 L 24 40 C 24 33, 12 33, 12 40 Z"
            fill={c.dark}
            stroke="#000000"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          {/* Backpack Highlight */}
          <path
            d="M 13 42 C 13 36, 23 36, 23 42 L 23 72 C 21 68, 15 68, 13 72 Z"
            fill={c.base}
          />
        </g>

        {/* 2. Main Body with Legs */}
        <g id="body">
          {/* Body Outline & Dark Base */}
          <path
            d="M 26 102
               L 26 42
               C 26 12, 82 12, 82 42
               L 82 102
               C 82 110, 66 110, 66 102
               L 66 84
               C 66 80, 44 80, 44 84
               L 44 102
               C 44 110, 26 110, 26 102
               Z"
            fill={c.dark}
            stroke="#000000"
            strokeWidth="6"
            strokeLinejoin="round"
          />

          {/* Body Primary Color Fill with lighting curve */}
          <path
            d="M 28 42
               C 28 16, 80 16, 80 42
               L 80 78
               C 72 70, 40 68, 28 84
               Z"
            fill={c.base}
          />
          {/* Front Leg Highlight */}
          <path
            d="M 68 84 L 68 101 C 68 106, 78 106, 78 101 L 78 78 C 74 81, 70 82, 68 84 Z"
            fill={c.base}
          />
        </g>

        {/* 3. Visor */}
        <g id="visor">
          {/* Visor Border */}
          <rect
            x="48"
            y="32"
            width="42"
            height="26"
            rx="13"
            fill="#000000"
          />
          {/* Visor Glass */}
          <rect
            x="50"
            y="34"
            width="38"
            height="22"
            rx="11"
            fill={isImpostor ? "url(#visor-impostor)" : `url(#visor-${color})`}
          />
          {/* Visor Glare Reflection */}
          <ellipse
            cx="66"
            cy="40"
            rx="12"
            ry="4"
            fill={isImpostor ? "#FFAAAA" : "#FFFFFF"}
            opacity="0.9"
          />
          {isImpostor && (
            <ellipse
              cx="67"
              cy="45"
              rx="5"
              ry="3"
              fill="#FF0033"
              opacity="0.9"
            />
          )}
        </g>

        {/* 4. Accessories: Gavel or Mic */}
        {hasGavel && (
          <g id="gavel" transform="translate(68, 55) rotate(-20)">
            {/* Gavel Handle */}
            <rect x="0" y="10" width="22" height="5" rx="2" fill="#D4A373" stroke="#000" strokeWidth="2" />
            {/* Gavel Head */}
            <rect x="18" y="0" width="10" height="24" rx="3" fill="#8B5A2B" stroke="#000" strokeWidth="2" />
            <circle cx="23" cy="12" r="3" fill="#E6C280" />
          </g>
        )}

        {hasMic && (
          <g id="mic" transform="translate(74, 52)">
            <line x1="0" y1="18" x2="10" y2="2" stroke="#555" strokeWidth="3" strokeLinecap="round" />
            <circle cx="10" cy="2" r="5" fill="#333" stroke="#888" strokeWidth="1.5" />
          </g>
        )}
      </svg>
    </div>
  );
};
