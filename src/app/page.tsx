"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { GavelUpTitle } from "@/components/GavelUpTitle";
import { SpeakerScene } from "@/components/SpeakerScene";
import { TaskMiniGame } from "@/components/TaskMiniGame";
import { eventConfig } from "@/config/eventConfig";
import { sounds } from "@/lib/sounds";
import {
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Shield,
  Users,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  // Countdown Timer State
  const [timeLeft, setTimeLeft] = useState({
    days: "14",
    hours: "08",
    minutes: "45",
    seconds: "20",
  });

  useEffect(() => {
    const target = new Date(eventConfig.countdownTarget).getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diff = target - now;

      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeLeft({
          days: String(days).padStart(2, "0"),
          hours: String(hours).padStart(2, "0"),
          minutes: String(minutes).padStart(2, "0"),
          seconds: String(seconds).padStart(2, "0"),
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12 select-none">
      {/* 1. HERO TITLE SECTION (Matching Poster Typography - Twice as Big) */}
      <section className="w-full max-w-7xl flex flex-col items-center text-center mb-10 sm:mb-14 px-2">
        {/* The Exact "GAVEL UP" Poster Title */}
        <GavelUpTitle size="2xl" showSubtitle={true} className="mb-6 w-full" />

        <p className="text-base sm:text-2xl font-mono text-cyan-300 font-bold tracking-wider max-w-3xl drop-shadow-[0_0_12px_rgba(0,240,255,0.5)]">
          {eventConfig.tagline}
        </p>
      </section>

      {/* 2. SPEAKER SCENE (Red Crewmate at Podium with Mic + Audience) */}
      <section className="w-full max-w-4xl mb-12">
        <SpeakerScene />
      </section>

      {/* 3. PRIMARY ACTION: GAME START / REGISTER NOW BUTTON */}
      <section className="w-full max-w-md flex flex-col items-center mb-14">
        <a
          href={eventConfig.googleFormUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => sounds.playStart()}
          className="w-full group relative"
        >
          {/* Outer Pulsing Glow */}
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-red-600 via-rose-500 to-red-600 blur-lg opacity-75 group-hover:opacity-100 transition duration-300 group-hover:scale-105" />

          {/* Futuristic HUD Button (Styled like COMING SOON badge in poster) */}
          <div className="relative w-full py-5 px-8 hud-box-red flex items-center justify-center gap-3 transition-transform group-hover:scale-[1.02] group-active:scale-95 cursor-pointer">
            <span className="w-3.5 h-3.5 rounded-full bg-white animate-ping" />
            <span className="text-2xl sm:text-3xl font-black tracking-widest text-white uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] font-mono">
              REGISTER NOW
            </span>
            <ExternalLink className="w-6 h-6 text-white group-hover:translate-x-1 transition-transform" />
          </div>
        </a>

        <span className="mt-3 text-xs font-mono text-slate-400 tracking-widest uppercase">
          SECURE YOUR CREWMATE BADGE 
        </span>
      </section>

      {/* 4. REAL-LIFE AMONG US EMPHASIS BANNER */}
      <section className="w-full max-w-5xl mb-14">
        <div className="relative overflow-hidden rounded-3xl border-2 border-red-500/60 bg-gradient-to-r from-red-950/80 via-slate-950/90 to-red-950/80 p-6 sm:p-8 shadow-[0_0_35px_rgba(239,68,68,0.4)]">
          {/* Animated Warning Glow */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-400/40 text-red-300 font-mono text-xs font-bold tracking-widest uppercase mb-2 w-fit mx-auto md:mx-0">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>SPECIAL ORIENTATION GAMEPLAY</span>
              </div>
              <h3 className="text-2xl sm:text-4xl font-black text-white tracking-wide uppercase">
                WE ARE PLAYING <span className="text-red-500 underline decoration-red-600">AMONG US IN REAL LIFE</span>!
              </h3>
              <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
                Step away from your screen. At this orientation, students will roam the university campus, complete public speaking & icebreaker tasks, dodge secret impostors, and hold real-life Emergency Meetings!
              </p>
            </div>

            <Link
              href="/about"
              onClick={() => sounds.playClick()}
              className="px-6 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-sm tracking-wider uppercase shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center gap-2 whitespace-nowrap"
            >
              <span>READ IRL MISSION RULES</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 5. EVENT DETAILS HUD & COUNTDOWN (Spaceship Monitor Screen) */}
      <section className="w-full max-w-5xl mb-14">
        <div className="rounded-3xl border-2 border-cyan-500/40 bg-slate-950/85 p-6 sm:p-8 backdrop-blur-md shadow-2xl">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
              <h3 className="text-base sm:text-lg font-mono font-bold uppercase tracking-widest text-cyan-300">
                EVENT COORDINATES & TIMELINE
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">SLIIT GAVEL PROTOCOL</span>
          </div>

          {/* Grid of 4 info cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Card 1: Date */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-start gap-3.5">
              <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">EVENT DATE</p>
                <p className="text-sm font-bold text-white mt-0.5">{eventConfig.date}</p>
              </div>
            </div>

            {/* Card 2: Time */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-start gap-3.5">
              <div className="p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">EVENT TIME</p>
                <p className="text-sm font-bold text-white mt-0.5">{eventConfig.time}</p>
              </div>
            </div>

            {/* Card 3: Location */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-start gap-3.5">
              <div className="p-2.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">LOCATION</p>
                <p className="text-sm font-bold text-white mt-0.5">{eventConfig.venue}</p>
              </div>
            </div>

            {/* Card 4: Closing Date */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-start gap-3.5">
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">REGISTRATION DEADLINE</p>
                <p className="text-sm font-bold text-white mt-0.5">{eventConfig.registrationClosingDate}</p>
              </div>
            </div>
          </div>

          {/* Real-time Countdown Clocks */}
          <div className="flex flex-col items-center pt-2 border-t border-slate-800/80">
            <span className="text-xs font-mono text-cyan-400 tracking-widest uppercase mb-3">
              MISSION COUNTDOWN TIMER
            </span>
            <div className="flex items-center gap-2 sm:gap-4 font-mono">
              <div className="flex flex-col items-center p-3 sm:p-4 rounded-xl border border-cyan-500/40 bg-slate-900 min-w-[64px] sm:min-w-[80px]">
                <span className="text-2xl sm:text-4xl font-black text-cyan-300">{timeLeft.days}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">DAYS</span>
              </div>
              <span className="text-2xl font-bold text-cyan-500">:</span>
              <div className="flex flex-col items-center p-3 sm:p-4 rounded-xl border border-cyan-500/40 bg-slate-900 min-w-[64px] sm:min-w-[80px]">
                <span className="text-2xl sm:text-4xl font-black text-cyan-300">{timeLeft.hours}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">HOURS</span>
              </div>
              <span className="text-2xl font-bold text-cyan-500">:</span>
              <div className="flex flex-col items-center p-3 sm:p-4 rounded-xl border border-cyan-500/40 bg-slate-900 min-w-[64px] sm:min-w-[80px]">
                <span className="text-2xl sm:text-4xl font-black text-cyan-300">{timeLeft.minutes}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">MINUTES</span>
              </div>
              <span className="text-2xl font-bold text-cyan-500">:</span>
              <div className="flex flex-col items-center p-3 sm:p-4 rounded-xl border border-red-500/50 bg-slate-900 min-w-[64px] sm:min-w-[80px]">
                <span className="text-2xl sm:text-4xl font-black text-red-400 animate-pulse">{timeLeft.seconds}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">SECONDS</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. GAME START MENU (ONLINE / LOCAL / HOW TO PLAY vibes) */}
      <section className="w-full max-w-4xl mb-14">
        <div className="text-center mb-6">
          <h3 className="text-xl sm:text-2xl font-black tracking-widest text-white uppercase font-mono">
            SELECT SHIP SECTOR
          </h3>
          <p className="text-xs font-mono text-slate-400 tracking-wider">
            Navigate through orientation decks and review your mission
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Deck 1: About */}
          <Link
            href="/about"
            onClick={() => sounds.playClick()}
            className="group p-6 rounded-2xl border-2 border-slate-800 bg-slate-900/70 hover:border-cyan-400 hover:bg-slate-800/80 transition-all hover:scale-105 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 mb-4 group-hover:shadow-[0_0_15px_rgba(0,240,255,0.6)]">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white tracking-wide uppercase font-mono">
                THE MISSION BRIEFING
              </h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Explore the event agenda: Keynote speech, speech evaluation, icebreakers &amp; Among Us IRL rules.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400">
              <span>EXPLORE DECK</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Deck 2: Why Join? */}
          <Link
            href="/why-join"
            onClick={() => sounds.playClick()}
            className="group p-6 rounded-2xl border-2 border-slate-800 bg-slate-900/70 hover:border-yellow-400 hover:bg-slate-800/80 transition-all hover:scale-105 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-yellow-300 mb-4 group-hover:shadow-[0_0_15px_rgba(234,179,8,0.6)]">
                <Shield className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white tracking-wide uppercase font-mono">
                CREWMATE PERKS
              </h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Discover why joining Gavel Club boosts your public speaking, leadership skills, and career networking.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-mono font-bold text-yellow-400">
              <span>VIEW PERKS</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Deck 3: Contact */}
          <Link
            href="/contact"
            onClick={() => sounds.playEmergency()}
            className="group p-6 rounded-2xl border-2 border-slate-800 bg-slate-900/70 hover:border-red-500 hover:bg-slate-800/80 transition-all hover:scale-105 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-300 mb-4 group-hover:shadow-[0_0_15px_rgba(239,68,68,0.6)]">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white tracking-wide uppercase font-mono">
                EMERGENCY MEETING
              </h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Connect directly with the President, VP Membership, and Assistant VP Membership.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-mono font-bold text-red-400">
              <span>CALL MEETING</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </section>

      {/* 7. INTERACTIVE TASK MINIGAME (Easter Egg) */}
      <section className="w-full max-w-xl mb-12">
        <TaskMiniGame />
      </section>
    </div>
  );
}
