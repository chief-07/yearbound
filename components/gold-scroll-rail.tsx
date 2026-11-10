"use client";

import React, { useEffect, useState, useCallback } from "react";

interface GoldScrollRailProps {
  bookSectionRef: React.RefObject<HTMLElement | null>;
  faqSectionRef: React.RefObject<HTMLElement | null>;
  hidden?: boolean;
}

interface RailStop {
  id: string;
  label: string;
  positionRatio: number; // 0..1 across total scrollable height
  targetY: number;
}

const RAIL_HEIGHT_PX = 256;

export function GoldScrollRail({
  bookSectionRef,
  faqSectionRef,
  hidden = false,
}: GoldScrollRailProps) {
  const [scrollRatio, setScrollRatio] = useState(0);
  const [stops, setStops] = useState<RailStop[]>([]);
  const [hovered, setHovered] = useState(false);

  const measureStops = useCallback(() => {
    const maxScroll = Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight
    );
    const bookEl = bookSectionRef.current;
    const faqEl = faqSectionRef.current;

    const nextStops: RailStop[] = [{ id: "cover", label: "Cover", positionRatio: 0, targetY: 0 }];

    if (bookEl) {
      const rect = bookEl.getBoundingClientRect();
      const bookTop = window.scrollY + rect.top;
      const bookScrollable = Math.max(0, rect.height - window.innerHeight);

      if (bookScrollable > 0) {
        const calendarMarks = [
          { id: "jan-01", label: "Jan 01", bookFrac: 0.25 },
          { id: "apr-18", label: "Apr 18", bookFrac: 0.5 },
          { id: "sep-09", label: "Sep 09", bookFrac: 0.75 },
          { id: "dec-25", label: "Dec 25", bookFrac: 1.0 },
        ];
        for (const mark of calendarMarks) {
          const y = Math.min(maxScroll, Math.max(0, bookTop + bookScrollable * mark.bookFrac));
          nextStops.push({
            id: mark.id,
            label: mark.label,
            positionRatio: Math.min(1, Math.max(0, y / maxScroll)),
            targetY: y,
          });
        }
      }
    }

    if (faqEl) {
      const faqRect = faqEl.getBoundingClientRect();
      const faqTop = Math.min(maxScroll, Math.max(0, window.scrollY + faqRect.top));
      nextStops.push({
        id: "faq",
        label: "FAQ",
        positionRatio: Math.min(1, Math.max(0, faqTop / maxScroll)),
        targetY: faqTop,
      });
    }

    setStops(nextStops);
  }, [bookSectionRef, faqSectionRef]);

  useEffect(() => {
    let rafId = 0;

    const syncScroll = () => {
      const maxScroll = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight
      );
      setScrollRatio(Math.min(1, Math.max(0, window.scrollY / maxScroll)));
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(syncScroll);
    };

    const onResize = () => {
      measureStops();
      syncScroll();
    };

    const initRafId = requestAnimationFrame(() => {
      measureStops();
      syncScroll();
    });

    // Remeasure shortly after mount once fonts/sticky heights settle
    const settleTimer = window.setTimeout(onResize, 250);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(initRafId);
      cancelAnimationFrame(rafId);
      window.clearTimeout(settleTimer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [measureStops]);

  if (hidden) return null;

  // Find closest stop to current scrollRatio so only the current station highlights subtly
  let activeStopId = "cover";
  let bestDist = Infinity;
  for (const s of stops) {
    const dist = Math.abs(scrollRatio - s.positionRatio);
    if (dist < bestDist) {
      bestDist = dist;
      activeStopId = s.id;
    }
  }

  const jumpTo = (targetY: number) => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    window.scrollTo({
      top: targetY,
      behavior: reduced ? "auto" : "smooth",
    });
  };

  return (
    <aside
      aria-label="Calendar scroll progress indicator"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="hidden lg:flex fixed right-4 xl:right-7 top-1/2 -translate-y-1/2 z-30 items-center gap-2.5 select-none"
    >
      <div
        className="relative flex flex-col justify-between"
        style={{ height: `${RAIL_HEIGHT_PX}px` }}
      >
        {/* Stop labels & horizontal hairline tick marks aligned directly beside the gold track */}
        {stops.map((stop) => {
          const isActive = stop.id === activeStopId;
          const isReached = scrollRatio >= stop.positionRatio - 0.015;
          const topPx = stop.positionRatio * RAIL_HEIGHT_PX;

          return (
            <button
              key={stop.id}
              type="button"
              onClick={() => jumpTo(stop.targetY)}
              aria-label={`Jump to ${stop.label}`}
              className="group absolute right-[12px] -translate-y-1/2 flex items-center gap-2 py-2 pl-3 focus-visible:outline-none"
              style={{ top: `${topPx.toFixed(1)}px` }}
            >
              {/* Stop title: shown crisply when active or when hovering the indicator */}
              <span
                className={`font-mono text-[10px] tracking-[0.14em] uppercase px-2 py-0.5 rounded-md border transition-all duration-150 whitespace-nowrap ${
                  isActive
                    ? "opacity-100 bg-[#0B0C0F] text-[#ebaf64] border-[#ebaf64]/45 shadow-[0_4px_12px_rgba(0,0,0,0.38)]"
                    : hovered
                      ? "opacity-90 bg-[#0B0C0F]/92 text-[#F5F1EB]/85 border-white/15 group-hover:text-[#ebaf64] group-hover:border-[#ebaf64]/50"
                      : "opacity-0 pointer-events-none translate-x-1"
                }`}
              >
                {stop.label}
              </span>

              {/* Architectural horizontal brass/obsidian tick mark */}
              <span
                aria-hidden="true"
                className={`block h-[1.5px] rounded-full transition-all duration-150 ${
                  isActive
                    ? "w-3.5 bg-[#FFF1CE] ring-1 ring-[#0B0C0F]/70 shadow-[0_0_8px_rgba(235,175,100,0.65)]"
                    : isReached
                      ? "w-2.5 bg-[#ebaf64] ring-1 ring-[#0B0C0F]/60"
                      : "w-2 bg-[#0B0C0F]/45 group-hover:w-3 group-hover:bg-[#ebaf64]"
                }`}
              />
            </button>
          );
        })}

        {/* Vertical Obsidian Slot + Metallic Champagne-Gold Progress Trace */}
        <div
          aria-hidden="true"
          className="relative w-[5px] h-full rounded-full bg-[#0B0C0F]/88 border border-[#ebaf64]/35 p-[1px] shadow-[0_6px_18px_rgba(0,0,0,0.34)]"
        >
          {/* Ambient un-scrolled champagne-gold hairline inside the dark groove */}
          <div className="absolute inset-[1px] rounded-full bg-[#ebaf64]/20" />

          {/* Filled metallic gold trace tracking scroll progress */}
          <div
            className="relative w-full rounded-full will-change-[height]"
            style={{
              height: `${(scrollRatio * 100).toFixed(2)}%`,
              background:
                "linear-gradient(180deg, #B8792E 0%, #EBAF64 72%, #FFF1CA 100%)",
            }}
          />

          {/* Tactile gold indicator nib at exact scroll coordinate */}
          <span
            className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-[9px] h-[9px] rounded-full bg-[#FFF1CA] border-[1.5px] border-[#0B0C0F] shadow-[0_0_10px_rgba(235,175,100,0.8)]"
            style={{
              top: `${(scrollRatio * 100).toFixed(2)}%`,
            }}
          />
        </div>
      </div>
    </aside>
  );
}
