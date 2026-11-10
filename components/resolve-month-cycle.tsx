"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

const CYCLE_WORDS = [
  "round",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function ResolveMonthCycle() {
  const [index, setIndex] = useState(0);
  const [leavingWord, setLeavingWord] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const clearTimerRef = useRef<number | null>(null);

  const advance = useCallback(() => {
    setIndex((prev) => {
      setLeavingWord(CYCLE_WORDS[prev]);
      if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
      clearTimerRef.current = window.setTimeout(() => {
        setLeavingWord(null);
      }, 450);
      return (prev + 1) % CYCLE_WORDS.length;
    });
  }, []);

  useEffect(() => {
    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduced || paused) return;

    const holdMs = index === 0 ? 1900 : 880;
    const timer = window.setTimeout(advance, holdMs);
    return () => window.clearTimeout(timer);
  }, [index, paused, advance]);

  useEffect(() => {
    return () => {
      if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
    };
  }, []);

  const currentWord = CYCLE_WORDS[index];

  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={`All year ${currentWord}. Hover to pause or click to advance month.`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onClick={advance}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          advance();
        }
      }}
      className="relative inline-grid align-baseline text-left cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ebaf64] rounded-md"
    >
      {/* Invisible exact-width sizer so 'round' -> 'Jan'..'Dec' never jitters preceding words */}
      <span aria-hidden="true" className="invisible col-start-1 row-start-1 pointer-events-none select-none">
        round
      </span>

      {/* Outgoing gold blur trail */}
      {leavingWord !== null && (
        <span
          key={`out-${index}`}
          aria-hidden="true"
          className="col-start-1 row-start-1 text-[#ebaf64] pointer-events-none yb-gold-blur-out"
        >
          {leavingWord}
        </span>
      )}

      {/* Active word gliding into crisp focus with warm champagne light */}
      <span
        key={`in-${index}`}
        className={`col-start-1 row-start-1 text-[#ebaf64] ${
          index === 0 && leavingWord === null ? "" : "yb-gold-blur-in"
        }`}
      >
        {currentWord}
      </span>
    </span>
  );
}
