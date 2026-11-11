"use client";

import React, { useState } from "react";
import { sounds } from "@/lib/sounds";
import { AlertTriangle, CheckCircle, RotateCcw } from "lucide-react";

export const TaskMiniGame: React.FC = () => {
  const [taskState, setTaskState] = useState<"idle" | "in_progress" | "success" | "sabotage">("idle");
  const [cardSwiped, setCardSwiped] = useState(false);

  const handleCardSwipe = () => {
    sounds.playClick();
    setCardSwiped(true);
    setTaskState("in_progress");

    setTimeout(() => {
      sounds.playTaskComplete();
      setTaskState("success");
    }, 700);
  };

  const handleEmergencyTrigger = () => {
    sounds.playEmergency();
    setTaskState("sabotage");
  };

  const handleReset = () => {
    sounds.playClick();
    setCardSwiped(false);
    setTaskState("idle");
  };

  return (
    <div className="relative w-full max-w-xl mx-auto rounded-2xl border-2 border-cyan-500/30 bg-slate-900/90 p-5 sm:p-6 shadow-2xl backdrop-blur-md select-none">
      {/* Task HUD Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-cyan-500/20">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-yellow-400 animate-ping" />
          <span className="text-xs font-mono font-bold tracking-widest text-cyan-300 uppercase">
            CREWMATE TASK: GAVEL REGISTRATION VERIFICATION
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">ADMIN ROOM // DECK 01</span>
      </div>

      {/* Task Content */}
      <div className="flex flex-col items-center">
        {taskState === "idle" && (
          <div className="flex flex-col items-center text-center">
            <p className="text-xs sm:text-sm text-slate-300 font-mono mb-4">
              Swipe your Gavel Club ID Card across the terminal scanner to verify orientation access:
            </p>

            {/* Interactive Card Reader */}
            <div
              onClick={handleCardSwipe}
              className="group cursor-pointer w-64 h-32 rounded-xl bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 p-1 shadow-lg hover:shadow-cyan-500/50 hover:scale-105 transition-all flex flex-col justify-between"
            >
              <div className="bg-slate-950/90 rounded-lg p-3 h-full flex flex-col justify-between">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono font-bold text-yellow-400">
                    SLIIT GAVEL CREWMATE ID
                  </span>
                  <div className="w-4 h-4 rounded-full bg-cyan-400" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-600 border border-white/50 flex items-center justify-center font-bold text-white text-xs">
                    ★
                  </div>
                  <div className="text-left font-mono">
                    <p className="text-xs font-bold text-white">NEW MEMBER</p>
                    <p className="text-[9px] text-slate-400">STATUS: RECRUIT</p>
                  </div>
                </div>
                <div className="text-center text-[10px] font-mono text-cyan-300 animate-pulse">
                  👉 [ CLICK TO SWIPE CARD ] 👈
                </div>
              </div>
            </div>
          </div>
        )}

        {taskState === "in_progress" && (
          <div className="py-8 flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-mono text-cyan-300 tracking-widest uppercase">
              READING BIOMETRIC DATA...
            </p>
          </div>
        )}

        {taskState === "success" && (
          <div className="py-4 flex flex-col items-center text-center">
            <CheckCircle className="w-14 h-14 text-green-400 mb-2 drop-shadow-[0_0_15px_rgba(74,222,128,0.8)]" />
            <h4 className="text-lg font-bold text-green-400 font-mono tracking-wider">
              TASK COMPLETED!
            </h4>
            <p className="text-xs text-slate-300 font-mono mt-1 max-w-sm">
              Your voice is registered for orientation. Next step: Click the Register Now button to submit your details!
            </p>
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs text-slate-300 font-mono hover:bg-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Swipe Again</span>
              </button>
              <button
                onClick={handleEmergencyTrigger}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500 bg-red-950/60 text-xs text-red-300 font-mono hover:bg-red-900/80 shadow-[0_0_10px_rgba(239,68,68,0.4)]"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span>Test Emergency Siren</span>
              </button>
            </div>
          </div>
        )}

        {taskState === "sabotage" && (
          <div className="py-4 flex flex-col items-center text-center animate-emergency-pulse rounded-xl p-4 bg-red-950/50 border border-red-600">
            <AlertTriangle className="w-14 h-14 text-red-500 mb-2 animate-bounce drop-shadow-[0_0_20px_#ef4444]" />
            <h4 className="text-xl font-black text-red-400 font-mono tracking-widest uppercase">
              EMERGENCY MEETING CALLED!
            </h4>
            <p className="text-xs text-red-200 font-mono mt-1 max-w-sm">
              An impostor was spotted avoiding their speech presentation! Head to the discussion table to vote.
            </p>
            <button
              onClick={handleReset}
              className="mt-4 px-4 py-2 rounded-lg bg-red-600 text-white font-mono text-xs font-bold tracking-wider hover:bg-red-500 shadow-lg"
            >
              RESOLVE EMERGENCY
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
