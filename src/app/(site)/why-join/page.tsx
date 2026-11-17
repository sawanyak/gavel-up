"use client";

import React from "react";
import Link from "next/link";
import { CrewmateVector } from "@/components/CrewmateVector";
import { eventConfig } from "@/config/eventConfig";
import { sounds } from "@/lib/sounds";
import {
  ShieldCheck,
  Zap,
  Globe2,
  Users2,
  Award,
  Briefcase,
  ChevronRight,
  UserPlus,
  ExternalLink,
} from "lucide-react";

export default function WhyJoinPage() {
  const perks = [
    {
      icon: <ShieldCheck className="w-7 h-7 text-cyan-400" />,
      tag: "CORE DEFENSE",
      title: "CONQUER STAGE FRIGHT FOREVER",
      description:
        "Over 75% of people fear public speaking more than death! At Gavel Club, you practice speaking in a safe, constructive environment until nervousness turns into unstoppable confidence.",
      stat: "+100% CONFIDENCE",
    },
    {
      icon: <Zap className="w-7 h-7 text-yellow-400" />,
      tag: "IMPROMPTU MATRIX",
      title: "THINK ON YOUR FEET (TABLE TOPICS)",
      description:
        "Ever been asked an unexpected question in an interview or exam and blanked out? Our Table Topics sessions train your brain to formulate coherent, persuasive answers in split seconds.",
      stat: "0.5s REACTION TIME",
    },
    {
      icon: <Award className="w-7 h-7 text-green-400" />,
      tag: "GLOBAL RECOGNITION",
      title: "TOASTMASTERS INTERNATIONAL AFFILIATION",
      description:
        "SLIIT Gavel Club operates under Toastmasters International guidelines. You gain credentials recognized by top corporate employers, multinational tech firms, and universities worldwide.",
      stat: "WORLDWIDE STATUS",
    },
    {
      icon: <Briefcase className="w-7 h-7 text-purple-400" />,
      tag: "EXECUTIVE SUITE",
      title: "LEADERSHIP & EVENT MANAGEMENT",
      description:
        "Take the pilot seat. Manage university mega-events, lead executive committees, host official ceremonies, and master team conflict resolution firsthand.",
      stat: "LEADERSHIP READINESS",
    },
    {
      icon: <Users2 className="w-7 h-7 text-pink-400" />,
      tag: "SUPPORT PROTOCOL",
      title: "ZERO-JUDGMENT CREW FAMILY",
      description:
        "No one gets ejected for making mistakes! Gavel Club is your home on campus where everyone cheers for your growth, shares laughs, and builds friendships that outlast university.",
      stat: "100% SAFE HAVEN",
    },
    {
      icon: <Globe2 className="w-7 h-7 text-blue-400" />,
      tag: "CAREER EDGE",
      title: "STAND OUT IN TECH & CORPORATE RECRUITMENT",
      description:
        "Coding skills get you the interview; communication skills land you the job and executive promotion. Gavel graduates routinely lead clubs, win national competitions, and secure top tier jobs.",
      stat: "CAREER ACCELERATION",
    },
  ];

  const testimonials = [
    {
      name: "Past Club President",
      role: "Batch of '24 // Software Engineer",
      color: "cyan" as const,
      quote:
        "I used to tremble whenever a lecturer asked me to present. Joining Gavel transformed my university life. By my final year, I was hosting national tech symposiums without any notes!",
    },
    {
      name: "VP Education Alum",
      role: "Batch of '25 // Business Analyst",
      color: "yellow" as const,
      quote:
        "Gavel Club gave me the exact skills needed to crush corporate case interviews. Learning to give constructive feedback taught me how to be a real empathetic leader.",
    },
    {
      name: "Novice Speaker Recruit",
      role: "1st Year Undergraduate",
      color: "lime" as const,
      quote:
        "I was terrified I'd be judged because English isn't my first language. But the club embraced me with open arms. Gavel Up orientation was the best decision of my freshman year!",
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 select-none">
      {/* 1. Header */}
      <div className="text-center mb-12 sm:mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-yellow-500/40 bg-yellow-950/40 text-xs font-mono text-yellow-300 uppercase tracking-widest mb-3">
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <span>DECK 03 // CREWMATE UPGRADE MATRIX</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-widest text-white uppercase font-mono">
          WHY JOIN GAVEL CLUB?
        </h1>
        <p className="mt-3 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Upgrade your communication armor, unlock leadership weapons, and join the most vibrant student community at SLIIT.
        </p>
      </div>

      {/* 2. The 6 Major Perks Grid (Benefits of joining the club) */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        {perks.map((perk, idx) => (
          <div
            key={idx}
            className="group relative p-6 rounded-2xl border-2 border-slate-800 bg-slate-950/80 hover:border-cyan-400/80 transition-all hover:scale-[1.02] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-700/80 group-hover:border-cyan-400/50 group-hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all">
                  {perk.icon}
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400 uppercase tracking-wider">
                  {perk.tag}
                </span>
              </div>

              <h3 className="text-lg font-bold text-white uppercase font-mono tracking-wide mb-2">
                {perk.title}
              </h3>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {perk.description}
              </p>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-cyan-400">
                {perk.stat}
              </span>
              <span className="text-[10px] font-mono text-slate-500 uppercase">
                SYSTEM ACTIVE
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* 3. Get Membership Section (Point to Membership Details Google Form) */}
      <section className="mb-16 p-8 sm:p-10 rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.15)] text-center relative overflow-hidden">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-32 bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/40 bg-emerald-950/60 text-xs font-mono text-emerald-400 uppercase tracking-widest mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>OFFICIAL CREWMATE INTAKE</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black tracking-widest text-white uppercase font-mono mb-3">
            BECOME AN OFFICIAL GAVELIER
          </h2>

          <p className="text-xs sm:text-sm font-mono text-slate-300 max-w-xl mx-auto mb-6 leading-relaxed">
            Ready to secure your permanent position aboard the crew? Fill out the membership intake form to register your details and unlock official Gavel Club materials and privileges.
          </p>

          <a
            href={eventConfig.membershipGoogleFormUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => sounds.playStart()}
            className="group px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-mono font-bold text-base tracking-wider uppercase border border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.6)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3 cursor-pointer"
          >
            <UserPlus className="w-5 h-5 text-emerald-200 group-hover:scale-110 transition-transform" />
            <span>GET MEMBERSHIP</span>
            <ExternalLink className="w-4 h-4 text-emerald-200" />
          </a>
        </div>
      </section>

      {/* 4. Member Log Entries (Testimonials) */}
      <section className="mb-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-4xl font-black tracking-widest text-white uppercase font-mono">
            CREWMATE LOG ARCHIVES
          </h2>
          <p className="text-xs sm:text-sm font-mono text-slate-400">
            Real testimonies from students who survived the stage and leveled up
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl border border-slate-800 bg-slate-950/90 flex flex-col justify-between"
            >
              <div className="flex items-center gap-3 mb-4">
                <CrewmateVector color={t.color} size={48} />
                <div>
                  <h4 className="text-sm font-bold text-white font-mono uppercase">
                    {t.name}
                  </h4>
                  <p className="text-[11px] font-mono text-cyan-400">{t.role}</p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 italic leading-relaxed">
                &quot;{t.quote}&quot;
              </p>

              <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] font-mono text-slate-500 uppercase flex justify-between">
                <span>STATUS: VERIFIED</span>
                <span>DECK SLIIT</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Bottom CTA */}
      <section className="text-center p-8 sm:p-12 rounded-3xl border-2 border-cyan-500/40 bg-slate-950/90 shadow-2xl">
        <h3 className="text-2xl sm:text-4xl font-black text-white font-mono uppercase mb-3">
          HAVE QUESTIONS ABOUT THE MISSION?
        </h3>
        <p className="text-sm text-slate-300 font-mono max-w-xl mx-auto mb-6">
          Reach out to the leadership crew or call an emergency meeting to learn more about SLIIT Gavel Club!
        </p>
        <div className="flex items-center justify-center">
          <Link
            href="/contact"
            onClick={() => sounds.playEmergency()}
            className="px-8 py-4 rounded-xl border border-red-500/40 bg-red-950/40 text-red-300 font-mono font-bold text-base tracking-wider uppercase hover:bg-red-900/60 transition-all flex items-center gap-2"
          >
            <span>CONTACT ORGANIZERS</span>
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
