"use client";

import React from "react";

export type TimeMilestone = "jan1" | "feb14" | "jul20" | "dec25";

interface TimeTravelScrubberProps {
  activeMilestone: TimeMilestone;
  onChangeMilestone: (milestone: TimeMilestone) => void;
}

export function TimeTravelScrubber({
  activeMilestone,
  onChangeMilestone,
}: TimeTravelScrubberProps) {
  const milestones: { id: TimeMilestone; label: string }[] = [
    { id: "jan1", label: "Jan 1" },
    { id: "feb14", label: "Feb 14" },
    { id: "jul20", label: "Jul 20" },
    { id: "dec25", label: "Dec 25" },
  ];

  return (
    <div
      data-tour-id="tour-timetravel"
      className="absolute bottom-21 left-1/2 -translate-x-1/2 z-40 bg-black/80 backdrop-blur-2xl border border-[#ebaf64]/25 rounded-full p-1 shadow-2xl flex items-center gap-1 select-none animate-in fade-in slide-in-from-bottom-2 duration-300"
    >
      {milestones.map((m) => {
        const isActive = activeMilestone === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChangeMilestone(m.id)}
            className={`py-1.5 px-3.5 rounded-full text-xs font-mono transition-all duration-200 active:scale-95 ${
              isActive
                ? "bg-[#ebaf64] text-black font-semibold shadow-sm"
                : "text-white/60 hover:text-white"
            }`}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
