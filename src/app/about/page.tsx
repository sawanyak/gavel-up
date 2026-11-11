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
  ExternalLink,
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
                Forget boring PowerPoint lectures. At <strong>Gavel Up</strong>, the entire SLIIT campus transforms into our very own spaceship! You and your fellow recruits will get secret role cards, roam between physical task stations, communicate with teammates, and uncover the impostors in our midst.
              </p>

              {/* Real Life Gameplay Features */}
              <div className="mt-6 space-y-3.5 font-mono text-xs sm:text-sm">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/80 border border-red-500/30">
                  <Compass className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-white font-bold uppercase">PHYSICAL CAMPUS TASKS:</span>
                    <p className="text-slate-300 text-xs mt-0.5">
                      Visit checkpoints across campus to complete 30-second impromptu speech challenges, riddle solving, and vocal projection drills.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/80 border border-red-500/30">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-white font-bold uppercase">SECRET IMPOSTORS AMONG US:</span>
                    <p className="text-slate-300 text-xs mt-0.5">
                      Watch your back! Selected players are secret impostors tasked with sabotaging speech missions and blending into the crowd without detection.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/80 border border-red-500/30">
                  <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-white font-bold uppercase">LIVE EMERGENCY MEETINGS:</span>
                    <p className="text-slate-300 text-xs mt-0.5">
                      Hit the emergency siren! When foul play is suspected, all recruits assemble to debate, defend their innocence, and vote off suspects!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Crewmates Illustration */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-950/70 border border-red-500/40 text-center">
              <div className="relative mb-4">
                <CrewmateVector color="red" size={130} isFloating glow />
                <div className="absolute -bottom-2 -left-4">
                  <CrewmateVector color="cyan" size={70} facing="left" />
                </div>
                <div className="absolute -bottom-2 -right-4">
                  <CrewmateVector color="yellow" size={70} facing="right" />
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

      {/* 3. FULL EVENT AGENDA BREAKDOWN */}
      <section className="mb-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-4xl font-black tracking-widest text-white uppercase font-mono">
            ORIENTATION MISSION SCHEDULE
          </h2>
          <p className="text-xs sm:text-sm font-mono text-slate-400">
            Everything planned for you during the Gavel Up orientation session
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Segment 1: Keynote Speech */}
          <div className="p-6 rounded-2xl border-2 border-slate-800 bg-slate-950/80 hover:border-cyan-400 transition-all flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0">
              <Mic className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800">
                  PHASE 01
                </span>
                <h3 className="text-lg font-bold text-white uppercase font-mono">
                  KEYNOTE SPEECH
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-2">
                An electrifying opening address by an accomplished public speaker. Learn how mastering your voice transforms academic presentations, job interviews, and everyday conversations.
              </p>
            </div>
          </div>

          {/* Segment 2: Prepared Speech & Evaluation */}
          <div className="p-6 rounded-2xl border-2 border-slate-800 bg-slate-950/80 hover:border-cyan-400 transition-all flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-yellow-300 shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono text-yellow-400 uppercase tracking-widest px-2 py-0.5 rounded bg-yellow-950 border border-yellow-800">
                  PHASE 02
                </span>
                <h3 className="text-lg font-bold text-white uppercase font-mono">
                  PREPARED SPEECH &amp; EVALUATION
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-2">
                Witness the core magic of Gavel Club! Experience a model prepared speech followed by a positive, constructive Toastmasters evaluation showing how feedback creates champions.
              </p>
            </div>
          </div>

          {/* Segment 3: Ice Breaker Session */}
          <div className="p-6 rounded-2xl border-2 border-slate-800 bg-slate-950/80 hover:border-cyan-400 transition-all flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-300 shrink-0">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono text-pink-400 uppercase tracking-widest px-2 py-0.5 rounded bg-pink-950 border border-pink-800">
                  PHASE 03
                </span>
                <h3 className="text-lg font-bold text-white uppercase font-mono">
                  ICE BREAKER SESSION
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-2">
                Shatter the awkward silence! High-energy group activities designed to help you meet friendly peers, laugh off anxiety, and feel completely at home in our gavel family.
              </p>
            </div>
          </div>

          {/* Segment 4: Interactive Games */}
          <div className="p-6 rounded-2xl border-2 border-slate-800 bg-slate-950/80 hover:border-cyan-400 transition-all flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 border border-green-500/40 flex items-center justify-center text-green-300 shrink-0">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono text-green-400 uppercase tracking-widest px-2 py-0.5 rounded bg-green-950 border border-green-800">
                  PHASE 04
                </span>
                <h3 className="text-lg font-bold text-white uppercase font-mono">
                  INTERACTIVE GAVEL GAMES
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-2">
                Fast-paced word games, impromptu mini-debates, and team challenges where you can test your quick thinking and win exclusive Gavel Club merchandise and titles!
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
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={eventConfig.googleFormUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => sounds.playStart()}
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-mono font-bold text-base tracking-wider uppercase border border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.7)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <span>REGISTER NOW VIA GOOGLE FORM</span>
            <ExternalLink className="w-5 h-5" />
          </a>

          <Link
            href="/why-join"
            onClick={() => sounds.playClick()}
            className="px-8 py-4 rounded-xl border border-cyan-500/40 bg-slate-900 text-cyan-300 font-mono font-bold text-base tracking-wider uppercase hover:bg-slate-800 transition-all"
          >
            SEE CREWMATE PERKS &gt;
          </Link>
        </div>
      </section>
    </div>
  );
}
