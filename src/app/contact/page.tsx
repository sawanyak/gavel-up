"use client";

import React, { useState } from "react";
import { CrewmateVector, CrewmateColor } from "@/components/CrewmateVector";
import { eventConfig, ContactPerson } from "@/config/eventConfig";
import { sounds } from "@/lib/sounds";
import {
  Phone,
  Mail,
  MessageCircle,
  Copy,
  Check,
  AlertTriangle,
  Send,
  ExternalLink,
} from "lucide-react";

export default function ContactPage() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [votedCard, setVotedCard] = useState<string | null>(null);

  const handleCopy = (text: string, idx: number) => {
    sounds.playClick();
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  const handleVoteContact = (name: string, url: string) => {
    sounds.playEmergency();
    setVotedCard(name);
    setTimeout(() => {
      window.open(url, "_blank");
    }, 400);
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
          Need details about orientation, registration, or speech slots? Cast your vote and open direct communications with the leadership crew!
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
          Click WhatsApp or Call to initiate contact with the respective executive member
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
        {eventConfig.contacts.map((contact: ContactPerson, idx: number) => {
          const isVoted = votedCard === contact.role;

          return (
            <div
              key={idx}
              className={`relative rounded-2xl border-2 transition-all p-6 flex flex-col justify-between ${
                isVoted
                  ? "border-red-500 bg-red-950/60 shadow-[0_0_25px_rgba(239,68,68,0.8)] scale-105"
                  : "border-slate-800 bg-slate-950/85 hover:border-cyan-400/80 hover:bg-slate-900/90 shadow-xl"
              }`}
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

                {/* Avatar & Role Info */}
                <div className="flex flex-col items-center text-center mb-5">
                  <div className="mb-3 hover:scale-110 transition-transform cursor-pointer" onClick={() => sounds.playClick()}>
                    <CrewmateVector
                      color={contact.color as CrewmateColor}
                      size={90}
                      glow={isVoted}
                    />
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
                      onClick={() => handleCopy(contact.phone, idx * 2)}
                      className="text-slate-400 hover:text-white p-1"
                      title="Copy phone"
                    >
                      {copiedIndex === idx * 2 ? (
                        <Check className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Email */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                    <div className="flex items-center gap-2 text-slate-300 truncate">
                      <Mail className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                      <span className="truncate text-[11px]">{contact.email}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(contact.email, idx * 2 + 1)}
                      className="text-slate-400 hover:text-white p-1"
                      title="Copy email"
                    >
                      {copiedIndex === idx * 2 + 1 ? (
                        <Check className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons: WhatsApp & Call */}
              <div className="mt-6 pt-3 flex gap-2">
                <button
                  onClick={() => handleVoteContact(contact.role, contact.whatsapp)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WHATSAPP</span>
                </button>

                <a
                  href={`tel:${contact.phone}`}
                  onClick={() => sounds.playClick()}
                  className="py-2.5 px-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center"
                  title="Direct Call"
                >
                  <Phone className="w-4 h-4 text-cyan-400" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Voting Table Footer: Skip Vote / Direct Form Register */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-white font-mono uppercase">
            SKIP EMERGENCY VOTE &amp; GO DIRECTLY TO REGISTRATION?
          </h4>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Fill in your details via the official Google Form right away:
          </p>
        </div>

        <a
          href={eventConfig.googleFormUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => sounds.playStart()}
          className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs tracking-wider uppercase border border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.6)] flex items-center gap-2 whitespace-nowrap"
        >
          <span>OPEN GOOGLE FORM</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
