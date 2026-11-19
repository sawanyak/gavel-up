"use client";

import React, { useState } from "react";
import { eventConfig, ContactPerson } from "@/config/eventConfig";
import { sounds } from "@/lib/sounds";
import {
  Phone,
  Copy,
  Check,
  AlertTriangle,
  User,
} from "lucide-react";

export default function ContactPage() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, idx: number) => {
    sounds.playClick();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 select-none">
      {/* 1. Emergency Meeting Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-red-500 bg-red-950/80 p-6 sm:p-8 text-center shadow-[0_0_35px_rgba(239,68,68,0.6)] mb-12 animate-emergency-pulse">
        <div className="flex items-center justify-center gap-3 mb-2">
          <AlertTriangle className="w-8 h-8 text-red-500 animate-bounce" />
          <h1 className="text-3xl sm:text-5xl font-black tracking-widest text-white uppercase font-mono drop-shadow-[0_0_15px_#ef4444]">
            EMERGENCY MEETING
          </h1>
          <AlertTriangle className="w-8 h-8 text-red-500 animate-bounce" />
        </div>

        <p className="text-sm sm:text-base font-mono text-red-200 tracking-wider max-w-2xl mx-auto">
          Need details about orientation, registration, or speech slots? Reach out directly to the leadership crew!
        </p>

        {/* Siren Sound Trigger Button */}
        <div className="mt-4">
          <button
            onClick={() => sounds.playEmergency()}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center gap-2 mx-auto"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>SOUND EMERGENCY SIREN</span>
          </button>
        </div>
      </div>

      {/* 2. The 3 Leadership Voting Cards (President, VP Membership, Assistant VP Membership) */}
      <div className="text-center mb-8">
        <h2 className="text-xl sm:text-2xl font-mono font-bold text-cyan-300 uppercase tracking-widest">
          SELECT ORGANIZER TO CONTACT
        </h2>
        <p className="text-xs font-mono text-slate-400 mt-1">
          Direct communication coordinates for the respective executive members
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
        {eventConfig.contacts.map((contact: ContactPerson, idx: number) => {
          return (
            <div
              key={idx}
              className="relative rounded-2xl border-2 border-slate-800 bg-slate-950/85 hover:border-cyan-400/80 hover:bg-slate-900/90 shadow-xl transition-all p-6 flex flex-col justify-between"
            >
              <div>
                {/* Crewmate Card Header */}
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-400 font-bold uppercase tracking-wider">
                    {contact.title}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: contact.crewmateColorHex }}
                    />
                    <span>ONLINE</span>
                  </div>
                </div>

                {/* Image Placeholder & Role Info */}
                <div className="flex flex-col items-center text-center mb-5">
                  <div
                    className="relative w-44 h-44 sm:w-48 sm:h-48 rounded-2xl border-2 border-cyan-500/40 bg-slate-900/80 flex flex-col items-center justify-center mb-4 group hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(0,240,255,0.35)] transition-all overflow-hidden cursor-pointer shadow-lg"
                    onClick={() => sounds.playClick()}
                    title={contact.name}
                  >
                    {contact.image ? (
                      <img
                        src={contact.image}
                        alt={contact.name}
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <>
                        <User className="w-12 h-12 text-slate-500 group-hover:text-cyan-400 transition-colors mb-1" />
                        <span className="text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase group-hover:text-cyan-300 transition-colors">
                          PHOTO TBA
                        </span>
                      </>
                    )}
                  </div>
                  <h3 className="text-lg font-black text-white font-mono uppercase tracking-wide">
                    {contact.name}
                  </h3>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">
                    {contact.role}
                  </p>
                  <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                    {contact.bio}
                  </p>
                </div>

                {/* Contact Coordinates */}
                <div className="space-y-2.5 font-mono text-xs pt-3 border-t border-slate-800/80">
                  {/* Phone */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                    <div className="flex items-center gap-2 text-slate-300 truncate">
                      <Phone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">{contact.phone}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(contact.phone, idx)}
                      className="text-slate-400 hover:text-white p-1"
                      title="Copy phone"
                    >
                      {copiedIndex === idx ? (
                        <Check className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
