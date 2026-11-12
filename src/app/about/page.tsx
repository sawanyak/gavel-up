"use client";

import React from "react";
import Link from "next/link";
import { CrewmateVector } from "@/components/CrewmateVector";
import { eventConfig } from "@/config/eventConfig";
import { sounds } from "@/lib/sounds";
import {
  Mic,
  FileText,
  Flame,
  Gamepad2,
  AlertTriangle,
  Compass,
  CheckCircle2,
  Award,
} from "lucide-react";

export default function AboutPage() {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 select-none">
      {/* 1. Page Header */}
      <div className="text-center mb-12 sm:mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-500/40 bg-cyan-950/40 text-xs font-mono text-cyan-300 uppercase tracking-widest mb-3">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>DECK 02 // MISSION BRIEFING</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-widest text-white uppercase font-mono">
          ABOUT GAVEL UP
        </h1>
        <p className="mt-3 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          The official orientation of <strong className="text-cyan-300">SLIIT Gavel Club</strong>. A thrilling spaceship experience where new students conquer public speaking fears through the excitement of Among Us!
        </p>
      </div>

      {/* 2. THE BIG HIGHLIGHT: AMONG US IN REAL LIFE */}
      <section className="mb-16">
        <div className="relative overflow-hidden rounded-3xl border-2 border-red-500 bg-gradient-to-br from-red-950 via-slate-950 to-red-950 p-6 sm:p-10 shadow-[0_0_40px_rgba(239,68,68,0.5)]">
          {/* Pulsing red emergency alert header */}
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-red-500/30">
            <div className="flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 rounded-full bg-red-500 animate-ping" />
              <span className="text-xs sm:text-sm font-mono font-bold tracking-widest text-red-400 uppercase">
                CRITICAL MISSION PROTOCOL: REAL-LIFE SIMULATION
              </span>
            </div>
            <span className="text-xs font-mono text-red-300 font-bold px-2.5 py-1 rounded bg-red-900/60 border border-red-700">
              CAMPUS WIDE
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7">
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-wide uppercase leading-tight">
                WE ARE PLAYING <br />
                <span className="text-red-500 underline decoration-red-600">AMONG US IN REAL LIFE</span>!
              </h2>
              <p className="mt-4 text-base sm:text-lg text-slate-200 leading-relaxed">
                At <strong>Gavel Up</strong>, the entire SLIIT campus transforms into our very own spaceship! You and your fellow recruits will get secret role cards, roam between physical task stations, communicate with teammates, and uncover the impostors in our midst.
              </p>

              {/* Real Life Gameplay Features */}
              <div className="mt-6 flex flex-col items-start space-y-2.5 font-mono text-xs sm:text-sm">
                <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900/80 border border-red-500/30">
                  <Compass className="w-5 h-5 text-red-400 shrink-0" />
                  <span className="text-white font-bold uppercase tracking-wider">PHYSICAL CAMPUS TASKS</span>
                </div>

                <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900/80 border border-red-500/30">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />
                  <span className="text-white font-bold uppercase tracking-wider">SECRET IMPOSTORS AMONG US</span>
                </div>

                <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900/80 border border-red-500/30">
                  <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                  <span className="text-white font-bold uppercase tracking-wider">LIVE EMERGENCY MEETINGS</span>
                </div>
              </div>
            </div>

            {/* Visual Crewmates Illustration: 10 Crewmates with 1 Impostor Placed Among Them (Wider Spacing) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-950/70 border border-red-500/40 text-center overflow-hidden">
              <div className="w-full max-w-lg mb-4 flex flex-col items-center justify-center select-none py-2">
                {/* Row 1: 4 Crewmates with the Impostor Placed Right Among Them */}
                <div className="flex items-end justify-center gap-3.5 sm:gap-6 mb-3">
                  <div className="hover:scale-110 transition-transform cursor-pointer">
                    <CrewmateVector color="cyan" size={46} facing="right" />
                  </div>
                  <div className="hover:scale-110 transition-transform cursor-pointer">
                    <CrewmateVector color="lime" size={44} facing="right" />
                  </div>
                  {/* The Impostor Standing Right Among Crewmates */}
                  <div className="hover:scale-110 transition-transform cursor-pointer relative" title="Impostor Among Us">
                    <CrewmateVector color="red" size={54} isImpostor facing="right" />
                  </div>
                  <div className="hover:scale-110 transition-transform cursor-pointer">
                    <CrewmateVector color="blue" size={46} facing="left" />
                  </div>
                  <div className="hover:scale-110 transition-transform cursor-pointer">
                    <CrewmateVector color="yellow" size={44} facing="left" />
                  </div>
                </div>

                {/* Row 2: 6 Crewmates Spaced Wider */}
                <div className="flex items-end justify-center gap-2.5 sm:gap-5">
                  <div className="hover:scale-110 transition-transform cursor-pointer">
                    <CrewmateVector color="green" size={50} facing="right" />
                  </div>
                  <div className="hover:scale-110 transition-transform cursor-pointer">
                    <CrewmateVector color="pink" size={48} facing="right" />
                  </div>
                  <div className="hover:scale-110 transition-transform cursor-pointer">
                    <CrewmateVector color="orange" size={52} facing="right" />
                  </div>
                  <div className="hover:scale-110 transition-transform cursor-pointer">
                    <CrewmateVector color="purple" size={50} facing="left" />
                  </div>
                  <div className="hover:scale-110 transition-transform cursor-pointer">
                    <CrewmateVector color="black" size={48} facing="left" />
                  </div>
                  <div className="hover:scale-110 transition-transform cursor-pointer">
                    <CrewmateVector color="white" size={46} facing="left" />
                  </div>
                </div>
              </div>

              <div className="text-sm font-mono text-red-300 font-bold uppercase tracking-wider mb-2">
                &quot;TRUST NO ONE. SPEAK WITH COURAGE.&quot;
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Will you complete your tasks in time, or will the impostor silence the crew?
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FULL EVENT AGENDA BREAKDOWN (Sequential Timeline) */}
      <section className="mb-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-4xl font-black tracking-widest text-white uppercase font-mono">
            ORIENTATION MISSION SCHEDULE
          </h2>
          <p className="text-xs sm:text-sm font-mono text-slate-400">
            Chronological mission timeline planned for the Gavel Up orientation session
          </p>
        </div>

        {/* Timeline Container */}
        <div className="relative max-w-3xl mx-auto border-l-2 border-cyan-500/30 ml-4 sm:ml-8 pl-6 sm:pl-10 space-y-8">
          {/* Item 1: Introduction to Gavel Club session */}
          <div className="relative group">
            {/* Timeline Node */}
            <div className="absolute -left-[35px] sm:-left-[51px] top-4 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900 border-2 border-cyan-400 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.4)] group-hover:scale-110 transition-transform">
              <Compass className="w-5 h-5 text-cyan-400" />
            </div>

            <div className="p-6 rounded-2xl border-2 border-slate-800 bg-slate-950/80 hover:border-cyan-400 transition-all hover:scale-[1.01] shadow-xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest px-2.5 py-0.5 rounded bg-cyan-950 border border-cyan-800 font-bold">
                  PHASE 01
                </span>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  MISSION TIMELINE
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white uppercase font-mono mt-1">
                INTRODUCTION TO GAVEL CLUB SESSION
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-2">
                Welcome to the spaceship! Learn about the history, vision, and legacy of SLIIT Gavel Club and how our sessions run under Toastmasters International standards.
              </p>
            </div>
          </div>

          {/* Item 2: Ice Breaker Session */}
          <div className="relative group">
            <div className="absolute -left-[35px] sm:-left-[51px] top-4 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900 border-2 border-pink-400 flex items-center justify-center text-pink-300 shadow-[0_0_12px_rgba(237,84,186,0.4)] group-hover:scale-110 transition-transform">
              <Flame className="w-5 h-5 text-pink-400" />
            </div>

            <div className="p-6 rounded-2xl border-2 border-slate-800 bg-slate-950/80 hover:border-pink-400 transition-all hover:scale-[1.01] shadow-xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono text-pink-400 uppercase tracking-widest px-2.5 py-0.5 rounded bg-pink-950 border border-pink-800 font-bold">
                  PHASE 02
                </span>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  MISSION TIMELINE
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white uppercase font-mono mt-1">
                ICE BREAKER SESSION
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-2">
                Shatter the awkward silence! High-energy group activities designed to help you meet friendly peers, laugh off anxiety, and feel completely at home in our gavel family.
              </p>
            </div>
          </div>

          {/* Item 3: Prepared Speech and Evaluation */}
          <div className="relative group">
            <div className="absolute -left-[35px] sm:-left-[51px] top-4 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900 border-2 border-yellow-400 flex items-center justify-center text-yellow-300 shadow-[0_0_12px_rgba(245,245,87,0.4)] group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5 text-yellow-400" />
            </div>

            <div className="p-6 rounded-2xl border-2 border-slate-800 bg-slate-950/80 hover:border-yellow-400 transition-all hover:scale-[1.01] shadow-xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono text-yellow-400 uppercase tracking-widest px-2.5 py-0.5 rounded bg-yellow-950 border border-yellow-800 font-bold">
                  PHASE 03
                </span>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  MISSION TIMELINE
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white uppercase font-mono mt-1">
                PREPARED SPEECH AND EVALUATION
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-2">
                Witness the core magic of Gavel Club! Experience a model prepared speech followed by a positive, constructive Toastmasters evaluation showing how feedback creates champions.
              </p>
            </div>
          </div>

          {/* Item 4: Interactive Gavel Games */}
          <div className="relative group">
            <div className="absolute -left-[35px] sm:-left-[51px] top-4 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900 border-2 border-green-400 flex items-center justify-center text-green-300 shadow-[0_0_12px_rgba(80,239,57,0.4)] group-hover:scale-110 transition-transform">
              <Gamepad2 className="w-5 h-5 text-green-400" />
            </div>

            <div className="p-6 rounded-2xl border-2 border-slate-800 bg-slate-950/80 hover:border-green-400 transition-all hover:scale-[1.01] shadow-xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono text-green-400 uppercase tracking-widest px-2.5 py-0.5 rounded bg-green-950 border border-green-800 font-bold">
                  PHASE 04
                </span>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  MISSION TIMELINE
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white uppercase font-mono mt-1">
                INTERACTIVE GAVEL GAMES
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-2">
                Fast-paced word games, impromptu mini-debates, and team challenges where you can test your quick thinking and win exclusive Gavel Club merchandise and titles!
              </p>
            </div>
          </div>

          {/* Item 5: Keynote Speech */}
          <div className="relative group">
            <div className="absolute -left-[35px] sm:-left-[51px] top-4 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900 border-2 border-cyan-400 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.4)] group-hover:scale-110 transition-transform">
              <Mic className="w-5 h-5 text-cyan-400" />
            </div>

            <div className="p-6 rounded-2xl border-2 border-slate-800 bg-slate-950/80 hover:border-cyan-400 transition-all hover:scale-[1.01] shadow-xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest px-2.5 py-0.5 rounded bg-cyan-950 border border-cyan-800 font-bold">
                  PHASE 05
                </span>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  MISSION TIMELINE
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white uppercase font-mono mt-1">
                KEYNOTE SPEECH
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-2">
                An electrifying address by an accomplished public speaker. Learn how mastering your voice transforms academic presentations, job interviews, and everyday conversations.
              </p>
            </div>
          </div>

          {/* Item 6: Why join Gavel session */}
          <div className="relative group">
            <div className="absolute -left-[35px] sm:-left-[51px] top-4 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900 border-2 border-purple-400 flex items-center justify-center text-purple-300 shadow-[0_0_12px_rgba(107,47,188,0.4)] group-hover:scale-110 transition-transform">
              <Award className="w-5 h-5 text-purple-400" />
            </div>

            <div className="p-6 rounded-2xl border-2 border-slate-800 bg-slate-950/80 hover:border-purple-400 transition-all hover:scale-[1.01] shadow-xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest px-2.5 py-0.5 rounded bg-purple-950 border border-purple-800 font-bold">
                  PHASE 06
                </span>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  MISSION TIMELINE
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white uppercase font-mono mt-1">
                WHY JOIN GAVEL SESSION
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-2">
                Discover the lifelong benefits of membership, pathways for personal growth, leadership opportunities, and how to become an official inducted member of our club.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CALL TO ACTION */}
      <section className="text-center py-8">
        <h3 className="text-2xl font-bold text-white font-mono uppercase mb-4">
          ARE YOU READY TO BOARD THE SKELD?
        </h3>
        <div className="flex items-center justify-center">
          <Link
            href="/why-join"
            onClick={() => sounds.playClick()}
            className="px-8 py-4 rounded-xl border border-cyan-500/40 bg-slate-900 text-cyan-300 font-mono font-bold text-base tracking-wider uppercase hover:bg-slate-800 transition-all flex items-center gap-2"
          >
            <span>SEE CREWMATE PERKS &gt;</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
