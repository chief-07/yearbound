"use client";

import React from "react";
import { Sparkles, History, AlertTriangle, Gift } from "lucide-react";

export type TimeMilestone = "jan1" | "feb14" | "jul20" | "dec25";

interface TimeTravelScrubberProps {
  activeMilestone: TimeMilestone;
  onChangeMilestone: (milestone: TimeMilestone) => void;
}

export function TimeTravelScrubber({
  activeMilestone,
  onChangeMilestone,
}: TimeTravelScrubberProps) {
  const milestones: {
    id: TimeMilestone;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "jan1",
      label: "Jan 1",
      sublabel: "Genesis",
      icon: <Sparkles size={11} />,
    },
    {
      id: "feb14",
      label: "Feb 14",
      sublabel: "1st Breach",
      icon: <AlertTriangle size={11} />,
    },
    {
      id: "jul20",
      label: "Jul 20",
      sublabel: "Habit Recall",
      icon: <History size={11} />,
    },
    {
      id: "dec25",
      label: "Dec 25",
      sublabel: "Christmas Unlock",
      icon: <Gift size={11} />,
    },
  ];

  return (
    <div className="w-full bg-[#0E0E12] border-b border-[#222226] px-4 py-2 flex flex-col gap-1.5 shrink-0 select-none animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E5A93C] animate-pulse" />
          <span className="text-[10px] font-mono text-[#E5A93C] uppercase tracking-wider font-medium">
            Demo Simulator · 12-Month Time Travel
          </span>
        </div>
        <span className="text-[9px] font-mono text-[#71717A]">
          Walrus & Tatum Evolving State
        </span>
      </div>

      {/* 4-Pill Segmented Scrubber Control */}
      <div className="grid grid-cols-4 gap-1.5 bg-[#000000] p-1 rounded-xl border border-[#1E1E24]">
        {milestones.map((m) => {
          const isActive = activeMilestone === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onChangeMilestone(m.id)}
              className={`py-1.5 px-2 rounded-lg text-center transition-all duration-200 flex flex-col items-center justify-center gap-0.5 active:scale-95 ${
                isActive
                  ? "bg-white text-black shadow-sm"
                  : "text-[#71717A] hover:text-[#D4D4D8] hover:bg-[#131316]"
              }`}
            >
              <div className="flex items-center gap-1">
                {m.icon}
                <span className={`text-[11px] font-mono ${isActive ? "font-bold text-black" : "font-medium"}`}>
                  {m.label}
                </span>
              </div>
              <span className={`text-[9px] truncate max-w-full leading-tight ${isActive ? "text-[#52525B] font-semibold" : "text-[#52525B]"}`}>
                {m.sublabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}