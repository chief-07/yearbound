"use client";

import React, { useState } from "react";

export interface GridInfractionItem {
  dayOfYear: number;
  dateStr?: string;
  memo: string;
  penaltySui: number;
  ruleTitle: string;
  blobId?: string;
  verdict?: "honored" | "broken";
  txHash?: string;
}

interface DisciplineGridProps {
  currentDayOfYear: number; // 1 to 365
  infractions: GridInfractionItem[];
  totalEscrowSui: number;
  isUnlocked?: boolean;
  isDegraded?: boolean;
  onInspectBlob?: (blobId: string) => void;
}

export function DisciplineGrid({
  currentDayOfYear = 320,
  infractions = [],
  totalEscrowSui = 10,
  isUnlocked = false,
  isDegraded = false,
  onInspectBlob,
}: DisciplineGridProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Map days to recorded events
  const breachMap = new Map<number, GridInfractionItem>();
  const honoredMap = new Map<number, GridInfractionItem>();

  infractions.forEach((item) => {
    if (item.verdict === "broken" || item.penaltySui > 0) {
      breachMap.set(item.dayOfYear, item);
    } else if (item.verdict === "honored") {
      honoredMap.set(item.dayOfYear, item);
    }
  });

  const elapsedDays = Math.max(1, Math.min(365, currentDayOfYear));
  const breachCount = Array.from(breachMap.keys()).filter((d) => d <= elapsedDays).length;
  const cleanDays = Math.max(0, elapsedDays - breachCount);

  const activeInspectDay = selectedDay;
  const activeBreach = activeInspectDay ? breachMap.get(activeInspectDay) : null;
  const activeHonored = activeInspectDay ? honoredMap.get(activeInspectDay) : null;

  // Month label positions (approximate column index for 1st of each month)
  const monthLabels = [
    { name: "Jan", col: 0 },
    { name: "Mar", col: 8 },
    { name: "May", col: 17 },
    { name: "Jul", col: 26 },
    { name: "Sep", col: 35 },
    { name: "Nov", col: 44 },
    { name: "Dec", col: 48 },
  ];

  const formatDayOfYear = (day: number) => {
    const d = new Date(2026, 0, day);
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
  };

  return (
    <div className="bg-black/20 backdrop-blur-2xl border border-[#ebaf64]/25 rounded-3xl p-5 flex flex-col gap-3.5 shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">
          365-Day Activity
        </span>
        <span className="text-xs font-mono text-[#ebaf64]">
          {cleanDays} Clean · {breachCount} {breachCount === 1 ? "Breach" : "Breaches"}
        </span>
      </div>

      {/* 365-Day SVG Micro-Grid */}
      <div className="flex flex-col gap-1.5 w-full overflow-x-auto select-none pt-1">
        {/* Month Labels */}
        <div className="relative h-3 w-full min-w-[340px] text-[9px] font-mono text-white/40">
          {monthLabels.map((m) => (
            <span
              key={m.name}
              className="absolute"
              style={{ left: `${(m.col / 52) * 100}%` }}
            >
              {m.name}
            </span>
          ))}
        </div>

        {/* SVG Heatmap */}
        <div className="w-full min-w-[340px]">
          <svg
            viewBox="0 0 348 50"
            className="w-full h-auto cursor-pointer"
            style={{ shapeRendering: "crispEdges" }}
          >
            {Array.from({ length: 365 }).map((_, idx) => {
              const day = idx + 1;
              const col = Math.floor(idx / 7);
              const row = idx % 7;
              const x = col * 6.6;
              const y = row * 6.6;

              const isPastOrToday = day <= currentDayOfYear;
              const hasBreach = breachMap.has(day);
              const hasHonored = honoredMap.has(day);
              const isSelected = selectedDay === day;

              let fillColor = "rgba(255,255,255,0.06)"; // future days default outline
              let strokeColor = "none";
              let strokeWidth = 0;

              if (hasBreach) {
                fillColor = "#EF4444"; // crimson breach
              } else if (hasHonored) {
                fillColor = "#10B981"; // emerald transfer
              } else if (isPastOrToday) {
                fillColor = "#52525B"; // clean zinc
              }

              if (isSelected) {
                strokeColor = "#FFFFFF";
                strokeWidth = 1.2;
              } else if (day === currentDayOfYear) {
                strokeColor = "#ebaf64";
                strokeWidth = 1;
              }

              return (
                <rect
                  key={day}
                  x={x}
                  y={y}
                  width={4.8}
                  height={4.8}
                  rx={1}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                  className="transition-colors duration-150"
                />
              );
            })}
          </svg>
        </div>

        {/* Minimal Legend */}
        <div className="flex items-center justify-between text-[10px] font-mono text-white/50 pt-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-[#52525B]" />
              <span>Clean</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-[#EF4444]" />
              <span>Breach</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-white/10" />
              <span>Future</span>
            </div>
          </div>
          <span className="text-[10px] text-white/40">Tap date to inspect</span>
        </div>
      </div>

      {/* Selected Day Compact Proof Pill (Only shown when a day is tapped) */}
      {activeInspectDay && (
        <div className="bg-black/30 border border-[#ebaf64]/20 rounded-2xl p-3 flex items-center justify-between text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                activeBreach ? "bg-red-400" : activeHonored ? "bg-emerald-400" : "bg-white/40"
              }`}
            />
            <span className="font-mono text-white/90">
              {formatDayOfYear(activeInspectDay)}:{" "}
              {activeBreach
                ? `Breach on ${activeBreach.ruleTitle}`
                : activeHonored
                ? "Honored Transfer"
                : "Clean Day"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {activeBreach ? (
              <span className="font-mono text-[#ebaf64] font-semibold">
                +{activeBreach.penaltySui} SUI Locked
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="text-white/40 hover:text-white text-xs px-1"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
