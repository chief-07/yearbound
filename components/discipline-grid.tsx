"use client";

import React, { useState } from "react";
import { ShieldCheck, AlertCircle, Calendar } from "lucide-react";

interface DisciplineGridProps {
  currentDayOfYear: number; // 1 to 365
  infractions: {
    dayOfYear: number;
    dateStr: string;
    memo: string;
    penaltySui: number;
    ruleTitle: string;
    blobId?: string;
  }[];
  totalEscrowSui: number;
  isUnlocked?: boolean;
}

export function DisciplineGrid({
  currentDayOfYear = 320,
  infractions = [],
  totalEscrowSui = 10,
  isUnlocked = false,
}: DisciplineGridProps) {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Map infraction days for fast lookup
  const infractionMap = new Map<number, (typeof infractions)[0]>();
  infractions.forEach((infr) => {
    infractionMap.set(infr.dayOfYear, infr);
  });

  // Calculate statistics
  const elapsedDays = Math.max(1, Math.min(365, currentDayOfYear));
  const breachCount = infractions.filter((i) => i.dayOfYear <= elapsedDays).length;
  const cleanDays = Math.max(0, elapsedDays - breachCount);
  const honorRate = ((cleanDays / elapsedDays) * 100).toFixed(1);

  // Active day details for inspection card
  const activeInspectDay = selectedDay ?? hoveredDay ?? currentDayOfYear;
  const activeInfr = infractionMap.get(activeInspectDay);
  const isFuture = activeInspectDay > currentDayOfYear;

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

  // Helper to convert day-of-year (1-365) to approximate date string
  const formatDayOfYear = (day: number) => {
    const d = new Date(2026, 0, day);
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
  };

  return (
    <div className="bg-[#0A0A0C] border border-[#222226] rounded-2xl p-5 flex flex-col gap-4 transition-all duration-200">
      {/* Header with Title and Live Solvency Badge */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[11px] font-mono text-[#71717A] uppercase tracking-wider">
            365-Day Discipline Canvas
          </span>
          <span className="text-sm font-semibold text-white tracking-tight mt-0.5">
            Annual Commitment Heatmap
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#131316] border border-[#222226]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
          <span className="text-[10px] font-mono text-[#A1A1AA]">
            Tatum & Walrus Synced
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 border-y border-[#18181C] py-3">
        <div className="flex flex-col">
          <span className="text-[10px] text-[#71717A] font-mono uppercase">Honor Rate</span>
          <span className="text-lg font-mono font-semibold text-white mt-0.5">
            {honorRate}%
          </span>
        </div>
        <div className="flex flex-col border-x border-[#18181C] px-2.5">
          <span className="text-[10px] text-[#71717A] font-mono uppercase">Clean Days</span>
          <span className="text-lg font-mono font-semibold text-white mt-0.5">
            {cleanDays} <span className="text-xs text-[#71717A] font-normal">/ {elapsedDays}</span>
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-[#71717A] font-mono uppercase">Vault Escrow</span>
          <span className="text-lg font-mono font-semibold text-[#E5A93C] mt-0.5">
            {totalEscrowSui}.00 SUI
          </span>
        </div>
      </div>

      {/* 365-Day SVG Micro-Grid */}
      <div className="flex flex-col gap-1.5 w-full overflow-x-auto select-none pt-1">
        {/* Month Labels */}
        <div className="relative h-3 w-full min-w-[340px] text-[9px] font-mono text-[#52525B]">
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
              const hasInfraction = infractionMap.has(day);
              const isSelected = selectedDay === day || hoveredDay === day;

              let fillColor = "#18181C"; // future days default faint outline
              let strokeColor = "none";
              let strokeWidth = 0;

              if (hasInfraction) {
                fillColor = "#EF4444"; // crimson breach
              } else if (isPastOrToday) {
                fillColor = "#3F3F46"; // honored clean zinc
              }

              if (isSelected) {
                strokeColor = "#FFFFFF";
                strokeWidth = 1.2;
              } else if (day === currentDayOfYear) {
                strokeColor = "#E5A93C";
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
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                  className="transition-colors duration-150"
                />
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-[10px] font-mono text-[#71717A] pt-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#3F3F46]" />
              <span>Honored (0 SUI)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#EF4444]" />
              <span>Breach (x402 fine)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#18181C] border border-[#27272A]" />
              <span>Future</span>
            </div>
          </div>
          <span className="text-[9px] text-[#52525B]">Tap cell to inspect</span>
        </div>
      </div>

      {/* Selected Day Inspection Drawer */}
      <div className="bg-[#131316] border border-[#1E1E22] rounded-xl p-3 flex flex-col gap-1.5 transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={12} className="text-[#A1A1AA]" />
            <span className="text-xs font-medium text-white">
              {formatDayOfYear(activeInspectDay)}, 2026
            </span>
            <span className="text-[10px] font-mono text-[#71717A]">
              (Day {activeInspectDay} of 365)
            </span>
          </div>
          {isFuture ? (
            <span className="text-[10px] font-mono text-[#52525B] uppercase">Upcoming</span>
          ) : activeInfr ? (
            <span className="text-[10px] font-mono text-[#EF4444] bg-[#EF4444]/10 px-2 py-0.5 rounded border border-[#EF4444]/20 flex items-center gap-1">
              <AlertCircle size={10} />
              <span>+{activeInfr.penaltySui} SUI Fine</span>
            </span>
          ) : (
            <span className="text-[10px] font-mono text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded border border-[#10B981]/20 flex items-center gap-1">
              <ShieldCheck size={10} />
              <span>Discipline Honored</span>
            </span>
          )}
        </div>

        {activeInfr ? (
          <div className="flex flex-col gap-1 pt-1 border-t border-[#1E1E22] text-xs">
            <span className="text-[#E4E4E7] font-medium truncate">
              Breach: {activeInfr.ruleTitle}
            </span>
            <span className="text-[#A1A1AA] text-[11px] italic">
              &ldquo;{activeInfr.memo}&rdquo;
            </span>
            <div className="flex items-center justify-between text-[10px] font-mono text-[#71717A] pt-1">
              <span>Settled via x402 Move Vault</span>
              <span>{activeInfr.blobId ? `Blob #${activeInfr.blobId.slice(0, 10)}...` : "Walrus Inscribed"}</span>
            </div>
          </div>
        ) : isFuture ? (
          <span className="text-[11px] text-[#71717A] pt-1 border-t border-[#1E1E22]">
            Target date leading towards Christmas unlock (Dec 25).
          </span>
        ) : (
          <span className="text-[11px] text-[#A1A1AA] pt-1 border-t border-[#1E1E22]">
            Zero unauthorized transfers. All behavioral oaths fully honored on this day.
          </span>
        )}
      </div>
    </div>
  );
}