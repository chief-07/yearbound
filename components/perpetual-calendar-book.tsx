"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { AmbientSparkles } from "@/components/ambient-sparkles";
import { ResolveMonthCycle } from "@/components/resolve-month-cycle";
import { OpenAppLink } from "@/components/pwa-install-provider";

interface CalendarLeaf {
  id: string;
  monthAbbrev: string;
  dayNumber: string;
  dateShort: string;
  monthLabel: string;
  seasonTag: string;
  title: string;
  description: string;
  protocolBadge: string;
  imageSrc: string;
  imageAlt: string;
  isAnimatedGif?: boolean;
}

export const CALENDAR_LEAVES: CalendarLeaf[] = [
  {
    id: "jan-01",
    monthAbbrev: "JAN",
    dayNumber: "01",
    dateShort: "JAN 01",
    monthLabel: "January 1",
    seasonTag: "01 · Resolution Setup",
    title: "Set Your Resolutions",
    description:
      "Set the spending lines you refuse to cross for the year—banned recipients, late-night sends, or weekly caps—and stake SUI behind them.",
    protocolBadge: "YEARBOUND PACT · STAKE ON SUI",
    imageSrc: "/assets/bg/midnight_walrus.png",
    imageAlt: "Wally holding a New Year sparkler beside a moonlit city lake",
  },
  {
    id: "apr-18",
    monthAbbrev: "APR",
    dayNumber: "18",
    dateShort: "APR 18",
    monthLabel: "April 18",
    seasonTag: "02 · Memory & Live Ledger",
    title: "Walrus Memory & Tatum",
    description:
      "Yearbound saves your commitments to Walrus Memory and uses Tatum Sui GraphQL to index your real-time balance and spending velocity.",
    protocolBadge: "WALRUS MEMORY · TATUM SUI GRAPHQL",
    imageSrc: "/assets/onboarding/walrus_memory.png",
    imageAlt: "Wally reading his leather-bound Memory book under autumn trees",
  },
  {
    id: "sep-09",
    monthAbbrev: "SEP",
    dayNumber: "09",
    dateShort: "SEP 09",
    monthLabel: "September 9",
    seasonTag: "03 · Preflight Agent Audit",
    title: "Wally Audits Every Send",
    description:
      "Before any transfer signs, Wally checks your memo, queries Walrus Memory against live Tatum history, and catches slips before they execute.",
    protocolBadge: "WALLY AGENT · MEMORY + TATUM CHECK",
    imageSrc: "/assets/mascot/wally_memories.gif",
    imageAlt: "Wally animated reading through his golden Walrus Memory ledger",
    isAnimatedGif: true,
  },
  {
    id: "dec-25",
    monthAbbrev: "DEC",
    dayNumber: "25",
    dateShort: "DEC 25",
    monthLabel: "December 25",
    seasonTag: "04 · Timed Escrow Settlement",
    title: "x402 Infraction Vault",
    description:
      "Infractions pause on HTTP 402 Payment Required. Walk away at 0 SUI, or lock an escalating penalty in an x402 vault until your unlock date.",
    protocolBadge: "HTTP 402 · TIME-LOCKED SUI VAULT",
    imageSrc: "/assets/onboarding/walrus_vault.png",
    imageAlt: "Wally in winter snow beside the locked escrow vault",
  },
];

interface Point2D {
  x: number;
  y: number;
}

function clipRectHalfPlane(
  w: number,
  h: number,
  nx: number,
  ny: number,
  d: number,
  keepLessOrEqual: boolean
): Point2D[] {
  const rect: Point2D[] = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ];
  const out: Point2D[] = [];
  const inside = (val: number) => (keepLessOrEqual ? val <= d : val >= d);

  for (let i = 0; i < rect.length; i++) {
    const cur = rect[i];
    const next = rect[(i + 1) % rect.length];
    const dCur = cur.x * nx + cur.y * ny;
    const dNext = next.x * nx + next.y * ny;
    const inCur = inside(dCur);
    const inNext = inside(dNext);

    if (inCur) {
      out.push(cur);
    }
    if (inCur !== inNext) {
      const denom = dNext - dCur;
      const t = Math.abs(denom) < 1e-6 ? 0.5 : (d - dCur) / denom;
      out.push({
        x: cur.x + t * (next.x - cur.x),
        y: cur.y + t * (next.y - cur.y),
      });
    }
  }
  return out;
}

function pointsToPolygonCss(pts: Point2D[]): string {
  if (pts.length < 3) return "polygon(0 0, 0 0, 0 0)";
  return `polygon(${pts.map((p) => `${p.x.toFixed(1)}px ${p.y.toFixed(1)}px`).join(", ")})`;
}

function pointsToSvgPath(pts: Point2D[]): string {
  if (pts.length < 3) return "";
  return (
    pts.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") +
    " Z"
  );
}

function computePageCurlGeometry(width: number, height: number, curlT: number) {
  const angle = (36 * Math.PI) / 180;
  const nx = Math.cos(angle);
  const ny = Math.sin(angle);
  const dMax = width * nx + height * ny;
  const startOffset = Math.min(34, Math.min(width, height) * 0.06);
  const dStart = dMax - startOffset;
  const dEnd = -16;
  const d = dStart - Math.min(1, Math.max(0, curlT)) * (dStart - dEnd);

  const keptPoly = clipRectHalfPlane(width, height, nx, ny, d, true);
  const peeledPoly = clipRectHalfPlane(width, height, nx, ny, d, false);

  // Reflect vertices past the fold line across the crease to form the underside curled paper flap
  const reflectedFlap = peeledPoly.map((p) => {
    const dist = p.x * nx + p.y * ny - d;
    return {
      x: p.x - 1.92 * dist * nx,
      y: p.y - 1.92 * dist * ny,
    };
  });

  // Extract the two endpoints right on the diagonal fold line [A, B]
  const seamPts = peeledPoly.filter((p) => Math.abs(p.x * nx + p.y * ny - d) < 1.2);
  let gradX1 = width;
  let gradY1 = height;
  let gradX2 = width - nx * 120;
  let gradY2 = height - ny * 120;
  let shadowGradX2 = width + nx * 70;
  let shadowGradY2 = height + ny * 70;

  if (seamPts.length >= 2) {
    const midX = (seamPts[0].x + seamPts[1].x) * 0.5;
    const midY = (seamPts[0].y + seamPts[1].y) * 0.5;
    let maxFlapDist = 36;
    for (const rp of reflectedFlap) {
      const dist = Math.hypot(rp.x - midX, rp.y - midY);
      if (dist > maxFlapDist) maxFlapDist = dist;
    }
    gradX1 = midX;
    gradY1 = midY;
    gradX2 = midX - nx * Math.min(maxFlapDist, 240);
    gradY2 = midY - ny * Math.min(maxFlapDist, 240);
    shadowGradX2 = midX + nx * 82;
    shadowGradY2 = midY + ny * 82;
  }

  return {
    keptCss: pointsToPolygonCss(keptPoly),
    peeledSvg: pointsToSvgPath(peeledPoly),
    flapSvg: pointsToSvgPath(reflectedFlap),
    seamLine:
      seamPts.length >= 2
        ? { x1: seamPts[0].x, y1: seamPts[0].y, x2: seamPts[1].x, y2: seamPts[1].y }
        : null,
    gradCoords: { x1: gradX1, y1: gradY1, x2: gradX2, y2: gradY2 },
    shadowCoords: { x1: gradX1, y1: gradY1, x2: shadowGradX2, y2: shadowGradY2 },
  };
}

interface PerpetualCalendarBookProps {
  sectionRef: React.RefObject<HTMLElement | null>;
  afterglowTrigger: number;
  heroEntered: boolean;
}

function GithubMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="w-5 h-5 fill-current shrink-0">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function ResolveWord({ entered }: { entered: boolean }) {
  return (
    <span className="relative inline-block">
      <span>resolve</span>
      <svg
        aria-hidden="true"
        viewBox="0 0 240 16"
        preserveAspectRatio="none"
        className="pointer-events-none absolute left-0 -bottom-[0.06em] w-full h-[0.14em] overflow-visible"
      >
        <path
          d="M 2 11 C 72 4, 166 4, 238 9"
          fill="none"
          stroke="#ebaf64"
          strokeWidth="5.2"
          strokeLinecap="round"
          className={`yb-resolve-draw ${entered ? "is-entered" : ""}`}
        />
        <path
          d="M 2 11 C 72 4, 166 4, 238 9"
          fill="none"
          stroke="#FFF4D4"
          strokeWidth="5.8"
          strokeLinecap="round"
          className={`yb-resolve-glint ${entered ? "is-entered" : ""}`}
        />
      </svg>
    </span>
  );
}

export function PerpetualCalendarBook({
  sectionRef,
  afterglowTrigger,
  heroEntered,
}: PerpetualCalendarBookProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  const [bookProgress, setBookProgress] = useState(0); // 0 -> 4 across Cover + 4 Calendar dates
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const syncReduced = () => setReducedMotion(mq?.matches ?? false);
    syncReduced();
    mq?.addEventListener?.("change", syncReduced);

    const stage = stageRef.current;
    let ro: ResizeObserver | null = null;
    const syncStageSize = () => {
      if (!stage) return;
      setStageSize({ w: stage.clientWidth, h: stage.clientHeight });
    };
    syncStageSize();
    if (typeof ResizeObserver !== "undefined" && stage) {
      ro = new ResizeObserver(syncStageSize);
      ro.observe(stage);
    }

    let rafId = 0;
    const updateScrollProgress = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      if (scrollable <= 0) {
        setBookProgress(0);
        return;
      }
      const ratio = Math.min(1, Math.max(0, -rect.top / scrollable));
      setBookProgress(ratio * CALENDAR_LEAVES.length);
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateScrollProgress);
    };

    updateScrollProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      cancelAnimationFrame(rafId);
      ro?.disconnect();
      mq?.removeEventListener?.("change", syncReduced);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [sectionRef]);

  const scrollToProgress = useCallback(
    (targetProgress: number) => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const top = window.scrollY + rect.top;
      const scrollable = rect.height - window.innerHeight;
      if (scrollable <= 0) return;

      const clamped = Math.min(CALENDAR_LEAVES.length, Math.max(0, targetProgress));
      const targetY = top + (clamped / CALENDAR_LEAVES.length) * scrollable;
      window.scrollTo({
        top: targetY,
        behavior: reducedMotion ? "auto" : "smooth",
      });
    },
    [sectionRef, reducedMotion]
  );

  // When reduced motion is enabled, render standard sequential vertical bands for accessibility
  if (reducedMotion) {
    return (
      <div id="calendar-book">
        <section className="relative min-h-[100svh] pt-[92px] sm:pt-[112px] pb-14 flex items-center justify-center bg-[#000000]">
          <AmbientSparkles afterglowTrigger={afterglowTrigger} />
          <div className="relative z-10 max-w-[1280px] w-full mx-auto px-5 sm:px-10 lg:px-20 py-10 flex flex-col items-center text-center">
            <h1 className="font-sans font-semibold tracking-[-0.04em] leading-[1.03] text-[#F5F1EB] text-[clamp(2.8rem,6.8vw,5.85rem)] max-w-[19ch]">
              Keep your financial <ResolveWord entered /> all year <ResolveMonthCycle />
            </h1>
            <p className="mt-7 max-w-[60ch] sm:max-w-[66ch] text-base sm:text-[21px] text-[#F5F1EB]/78 leading-[1.58]">
              Turn spending resolutions into self-enforcing rules on Sui, stored in Walrus Memory and checked live by Tatum before every send.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 w-full sm:w-auto">
              <OpenAppLink
                href="/app"
                className="w-full sm:w-auto min-h-[58px] sm:min-h-[64px] px-9 sm:px-11 inline-flex items-center justify-center gap-3 rounded-full bg-[#ebaf64] text-[#090A0D] text-[17px] sm:text-[18px] font-semibold tracking-[-0.015em] hover:bg-[#f2be7a]"
              >
                <span>Open Yearbound</span>
                <ArrowRight size={20} strokeWidth={2.25} />
              </OpenAppLink>
              <a
                href="https://github.com/chief-07/yearbound"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto min-h-[58px] sm:min-h-[64px] px-9 sm:px-10 inline-flex items-center justify-center gap-3 rounded-full bg-[#0C0D11] border-2 border-[#F5F1EB]/25 text-[#F5F1EB] text-[17px] sm:text-[18px] font-semibold tracking-[-0.015em] hover:border-[#ebaf64] hover:text-[#ebaf64]"
              >
                <GithubMark />
                <span>See project</span>
              </a>
            </div>
          </div>
        </section>

        <section
          id="calendar"
          aria-labelledby="calendar-heading-static"
          className="py-24 bg-[#E5A754] text-[#0B0C0F]"
        >
          <div className="max-w-[1280px] mx-auto px-5 sm:px-10 lg:px-20">
            <div className="flex items-center gap-4 sm:gap-5 mb-10">
              <Image
                src="/assets/mascot/wally_memories.png"
                alt="Wally holding his Memories ledger"
                width={443}
                height={394}
                className="w-[68px] sm:w-[92px] h-auto shrink-0 object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.22)]"
              />
              <h2
                id="calendar-heading-static"
                className="font-sans font-semibold tracking-[-0.03em] leading-[1.08] text-[#0B0C0F] text-[clamp(1.85rem,3.5vw,2.85rem)] max-w-[18ch]"
              >
                How a year with Yearbound works
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {CALENDAR_LEAVES.map((leaf) => (
                <article
                  key={leaf.id}
                  className="rounded-3xl bg-[#0B0C0F] p-2.5 shadow-xl overflow-hidden flex flex-col"
                >
                  <div className="rounded-2xl bg-[#F2EDE4] text-[#0D0E12] p-6 sm:p-8 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="inline-block font-mono text-xs font-semibold tracking-widest bg-[#0D0E12] text-[#ebaf64] px-3 py-1.5 rounded-lg">
                        {leaf.dateShort}
                      </span>
                      <h3 className="mt-4 text-2xl font-semibold tracking-[-0.02em]">
                        {leaf.title}
                      </h3>
                      <p className="mt-2.5 text-base text-[#1F2128] leading-[1.6]">
                        {leaf.description}
                      </p>
                    </div>
                    <p className="mt-5 font-mono text-xs text-[#0D0E12]/70">
                      {leaf.protocolBadge}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  // Live Scroll-Driven Geometry:
  // - p = 0.0 -> 1.0: Midnight Hero Cover diagonally curls open into Matte Yearbound Gold
  // - p = 1.0 -> 4.0: Gold Section 2 calendar leaves flip cleanly JAN 01 -> APR 18 -> SEP 09 -> DEC 25
  const coverCurlT = Math.min(1, Math.max(0, bookProgress));
  const coverFullyTurned = coverCurlT >= 0.995;
  const calendarProgress = Math.max(0, bookProgress - 1); // 0..3 across the 4 date leaves
  const activeLeafIdx = Math.min(
    CALENDAR_LEAVES.length - 1,
    Math.max(0, Math.floor(calendarProgress + 0.38))
  );

  const hasStageDims = stageSize.w > 0 && stageSize.h > 0;
  const curlGeo =
    hasStageDims && !coverFullyTurned
      ? computePageCurlGeometry(stageSize.w, stageSize.h, coverCurlT)
      : null;

  return (
    <section
      id="calendar"
      ref={sectionRef}
      aria-label="Yearbound interactive calendar experience"
      className="relative"
      style={{ height: "480svh" }}
    >
      <div
        ref={stageRef}
        className="sticky top-0 h-[100svh] w-full overflow-hidden bg-[#E5A754]"
      >
        {/* ================================================================
            LAYER 1 (UNDERNEATH COVER CURL): MATTE YEARBOUND GOLD CALENDAR
            ================================================================ */}
        <div
          className="absolute inset-0 isolate z-10 pt-[96px] sm:pt-[118px] pb-3 sm:pb-5 flex flex-col justify-center"
          style={{
            background:
              "radial-gradient(ellipse 85% 65% at 50% 30%, #EFC583 0%, #E5A754 58%, #D3923C 100%)",
            pointerEvents: coverCurlT >= 0.45 ? "auto" : "none",
          }}
        >
          <div className="max-w-[1280px] w-full mx-auto px-4 sm:px-10 lg:px-20">
            {/* Section Title + Animated Wally Reading Memories + Obsidian Index Tabs */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-5 mb-3 sm:mb-6">
              <div className="flex items-center gap-3 sm:gap-5">
                <Image
                  src="/assets/mascot/wally_memories.gif"
                  alt="Wally animated reading his golden Memories book"
                  width={443}
                  height={394}
                  unoptimized
                  className="w-[56px] sm:w-[88px] lg:w-[100px] h-auto shrink-0 object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.22)] select-none"
                />
                <h2 className="font-sans font-semibold tracking-[-0.03em] leading-[1.06] text-[#0B0C0F] text-[clamp(1.42rem,3.3vw,2.75rem)] max-w-[17ch]">
                  How a year with Yearbound works
                </h2>
              </div>

              <div className="grid grid-cols-4 gap-1.5 w-full sm:w-auto sm:flex sm:items-center sm:gap-2">
                {CALENDAR_LEAVES.map((leaf, idx) => {
                  const isActive = coverCurlT >= 0.45 && activeLeafIdx === idx;
                  return (
                    <button
                      key={leaf.id}
                      type="button"
                      onClick={() => scrollToProgress(idx + 1)}
                      aria-pressed={isActive}
                      className={`min-h-[44px] px-1.5 sm:px-4 rounded-xl font-mono text-[11px] sm:text-[13px] font-semibold tracking-wider transition-all duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B0C0F] ${
                        isActive
                          ? "bg-[#0B0C0F] text-[#ebaf64] shadow-[0_6px_16px_rgba(0,0,0,0.22)]"
                          : "bg-[#0B0C0F]/10 text-[#0B0C0F] border border-[#0B0C0F]/20 hover:bg-[#0B0C0F]/18"
                      }`}
                    >
                      {leaf.dateShort}
                    </button>
                  );
                })}

                <div className="hidden sm:flex items-center gap-1.5 ml-1">
                  <button
                    type="button"
                    onClick={() => scrollToProgress(Math.max(1, activeLeafIdx))}
                    disabled={activeLeafIdx === 0}
                    aria-label="Previous calendar page"
                    className="w-[44px] h-[44px] rounded-xl bg-[#0B0C0F]/12 border border-[#0B0C0F]/22 inline-flex items-center justify-center text-[#0B0C0F] hover:bg-[#0B0C0F] hover:text-[#ebaf64] disabled:opacity-35 disabled:pointer-events-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B0C0F]"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      scrollToProgress(Math.min(CALENDAR_LEAVES.length, activeLeafIdx + 2))
                    }
                    disabled={activeLeafIdx === CALENDAR_LEAVES.length - 1}
                    aria-label="Next calendar page"
                    className="w-[44px] h-[44px] rounded-xl bg-[#0B0C0F]/12 border border-[#0B0C0F]/22 inline-flex items-center justify-center text-[#0B0C0F] hover:bg-[#0B0C0F] hover:text-[#ebaf64] disabled:opacity-35 disabled:pointer-events-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B0C0F]"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Physical Sculpted Perpetual Desk Calendar Sculpture */}
            <div className="relative w-full">
              {/* Heavy Matte Obsidian Desk Plinth */}
              <div className="relative rounded-[22px] sm:rounded-[26px] bg-[#0B0C0F] p-2 sm:p-3 pb-4 sm:pb-6 shadow-[0_32px_70px_rgba(0,0,0,0.42),0_10px_24px_rgba(0,0,0,0.28)]">
                {/* Visible Stacked Paper Thickness Edge along the Bottom */}
                <div
                  aria-hidden="true"
                  className="absolute inset-x-4 sm:inset-x-5 bottom-1.5 sm:bottom-2 h-2.5 sm:h-3.5 rounded-b-[14px] overflow-hidden grid grid-cols-1 lg:grid-cols-12"
                >
                  <div
                    className="lg:col-span-7 h-full"
                    style={{
                      background:
                        "repeating-linear-gradient(to bottom, #DDD6C9 0px, #DDD6C9 1.5px, #9E9689 2px, #C7BFB2 3px)",
                    }}
                  />
                  <div
                    className="hidden lg:block lg:col-span-5 h-full"
                    style={{
                      background:
                        "repeating-linear-gradient(to bottom, #262932 0px, #262932 1.5px, #0D0E12 2px, #1D2028 3px)",
                    }}
                  />
                </div>

                {/* Dense Twin Spiral Wire Loops along the Calendar Center Hinge */}
                <div
                  aria-hidden="true"
                  className="relative z-30 flex items-center justify-around px-6 sm:px-14 -mt-2.5 -mb-2.5 sm:-mt-3 sm:-mb-3 pointer-events-none"
                >
                  {Array.from({ length: 12 }).map((_, ringIdx) => (
                    <div
                      key={ringIdx}
                      className={`flex flex-col items-center ${
                        ringIdx % 2 === 1 ? "hidden sm:flex" : "flex"
                      }`}
                    >
                      <div className="flex gap-[2px]">
                        <span
                          className="w-[3.5px] h-5 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.85)]"
                          style={{
                            background:
                              ringIdx % 3 === 0
                                ? "linear-gradient(90deg, #6B4A1E, #EBAF64 45%, #FFF2CF 60%, #7C5724)"
                                : "linear-gradient(90deg, #3A3D45, #9AA0AD 45%, #D8DCE3 60%, #2B2E35)",
                          }}
                        />
                        <span
                          className="w-[3.5px] h-5 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.85)]"
                          style={{
                            background:
                              ringIdx % 3 === 0
                                ? "linear-gradient(90deg, #6B4A1E, #EBAF64 45%, #FFF2CF 60%, #7C5724)"
                                : "linear-gradient(90deg, #3A3D45, #9AA0AD 45%, #D8DCE3 60%, #2B2E35)",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* 3D Perspective Leaf Spread Stack */}
                <div
                  className="relative w-full h-[clamp(355px,53svh,425px)] sm:h-[490px] lg:h-[clamp(395px,52svh,475px)] rounded-[16px] sm:rounded-[18px] overflow-hidden bg-[#0D0E12]"
                  style={{ perspective: "1800px" }}
                >
                  {CALENDAR_LEAVES.map((leaf, idx) => {
                    let rotateDeg = 0;
                    let leafOpacity = 1;
                    let shadeAlpha = 0;

                    if (idx < CALENDAR_LEAVES.length - 1) {
                      const flipStart = idx + 0.36;
                      const flipEnd = idx + 0.96;
                      if (calendarProgress >= flipEnd) {
                        rotateDeg = -175;
                        leafOpacity = 0;
                        shadeAlpha = 0.6;
                      } else if (calendarProgress > flipStart) {
                        const rawT =
                          (calendarProgress - flipStart) / (flipEnd - flipStart);
                        const eased = 1 - Math.pow(1 - rawT, 2.05);
                        rotateDeg = -eased * 175;
                        leafOpacity =
                          rawT > 0.72
                            ? Math.max(0, 1 - (rawT - 0.72) / 0.28)
                            : 1;
                        shadeAlpha = eased * 0.55;
                      }
                    }

                    const isVisible = leafOpacity > 0.01;
                    return (
                      <article
                        key={leaf.id}
                        aria-hidden={activeLeafIdx !== idx}
                        className="absolute inset-0 grid grid-cols-1 grid-rows-[auto_1fr] lg:grid-cols-12 lg:grid-rows-1 will-change-transform rounded-[16px] sm:rounded-[18px] overflow-hidden"
                        style={{
                          zIndex: 20 - idx,
                          opacity: leafOpacity,
                          pointerEvents:
                            activeLeafIdx === idx && isVisible ? "auto" : "none",
                          transformOrigin: "top center",
                          transform: `rotateX(${rotateDeg.toFixed(2)}deg)`,
                          backfaceVisibility: "hidden",
                        }}
                      >
                        {/* Left Page: Warm Archival Cream Paper with High-Contrast Editorial Date & Copy */}
                        <div className="lg:col-span-7 bg-[#F2EDE4] text-[#0D0E12] p-4 sm:p-6 lg:p-11 flex flex-col justify-between order-2 lg:order-1 min-h-0">
                          <div>
                            <div className="flex items-start justify-between gap-4">
                              <div className="inline-flex flex-col items-center justify-center rounded-xl bg-[#0D0E12] text-[#F2EDE4] px-3.5 py-2 sm:px-4 sm:py-2.5 lg:px-5 lg:py-3 shadow-sm">
                                <span className="font-mono text-[10px] sm:text-[11px] font-medium tracking-[0.2em] text-[#ebaf64]">
                                  {leaf.monthAbbrev}
                                </span>
                                <span className="font-sans text-xl sm:text-3xl lg:text-4xl font-semibold tracking-[-0.03em] leading-none mt-0.5">
                                  {leaf.dayNumber}
                                </span>
                              </div>

                              <span className="font-mono text-xs font-medium text-[#0D0E12]/55 pt-1">
                                0{idx + 1} / 0{CALENDAR_LEAVES.length}
                              </span>
                            </div>

                            <h3 className="mt-3 sm:mt-4 lg:mt-6 font-sans font-semibold tracking-[-0.03em] leading-[1.08] text-[#0D0E12] text-[19px] sm:text-2xl lg:text-[2.25rem]">
                              {leaf.title}
                            </h3>

                            <p className="mt-1.5 sm:mt-2.5 lg:mt-3.5 max-w-[44ch] text-[13px] sm:text-base lg:text-[17px] text-[#22252D] leading-[1.48] sm:leading-[1.58]">
                              {leaf.description}
                            </p>
                          </div>

                          <div className="pt-2.5 sm:pt-3 lg:pt-3.5 mt-2 sm:mt-2.5 lg:mt-3 border-t border-[#0D0E12]/12 flex items-center justify-between gap-3">
                            <span className="font-mono text-[10.5px] sm:text-xs font-medium tracking-wider bg-[#0D0E12] text-[#ebaf64] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg truncate">
                              {leaf.protocolBadge}
                            </span>
                            <span className="hidden sm:inline font-mono text-xs text-[#0D0E12]/50 shrink-0">
                              {leaf.seasonTag}
                            </span>
                          </div>
                        </div>

                        {/* Right Plate: Deep Matte Obsidian Recessed Art Gallery Frame */}
                        <div className="lg:col-span-5 bg-[#0D0E12] px-4 py-3 sm:p-5 lg:p-6 flex items-center justify-center order-1 lg:order-2 h-[126px] sm:h-[168px] lg:h-auto shrink-0">
                          {leaf.isAnimatedGif ? (
                            <div className="relative h-[102px] sm:h-[132px] lg:h-[310px] aspect-[443/394] rounded-xl overflow-hidden border border-white/12 bg-[#000000] p-2 sm:p-3 flex items-center justify-center shadow-[inset_0_2px_10px_rgba(0,0,0,0.85)]">
                              <Image
                                src={leaf.imageSrc}
                                alt={leaf.imageAlt}
                                width={443}
                                height={394}
                                unoptimized
                                className="w-full h-full object-contain"
                              />
                            </div>
                          ) : (
                            <div className="relative h-[102px] sm:h-[150px] lg:h-[365px] aspect-[9/16] rounded-xl overflow-hidden border border-white/12 bg-[#000000] shadow-[inset_0_2px_10px_rgba(0,0,0,0.85)]">
                              <Image
                                src={leaf.imageSrc}
                                alt={leaf.imageAlt}
                                fill
                                sizes="(max-width: 1024px) 100px, 210px"
                                className="object-cover object-center"
                              />
                            </div>
                          )}
                        </div>

                        {/* Dynamic Page-Turn Shading */}
                        {shadeAlpha > 0.01 && (
                          <div
                            aria-hidden="true"
                            className="absolute inset-0 pointer-events-none bg-black"
                            style={{ opacity: shadeAlpha }}
                          />
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================
            LAYER 2 (ON TOP AT REST): MIDNIGHT HERO COVER WITH PAGE CURL
            ================================================================ */}
        {!coverFullyTurned && (
          <div
            className="absolute inset-0 z-20"
            style={{
              clipPath: curlGeo ? curlGeo.keptCss : "none",
              pointerEvents: coverCurlT > 0.55 ? "none" : "auto",
            }}
          >
            <div className="relative w-full h-full pt-[92px] sm:pt-[112px] pb-10 sm:pb-12 flex items-center justify-center bg-[#000000]">
              <AmbientSparkles afterglowTrigger={afterglowTrigger} />

              <div className="relative z-10 max-w-[1280px] w-full mx-auto px-5 sm:px-10 lg:px-20 py-8 flex flex-col items-center text-center">
                <h1
                  className="font-sans font-semibold tracking-[-0.04em] leading-[1.03] text-[#F5F1EB] text-[clamp(2.8rem,6.8vw,5.85rem)] max-w-[19ch] transition-all duration-[850ms]"
                  style={{
                    opacity: heroEntered ? 1 : 0,
                    transform: heroEntered ? "translateY(0)" : "translateY(14px)",
                    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                >
                  Keep your financial <ResolveWord entered={heroEntered} /> all year{" "}
                  <ResolveMonthCycle />
                </h1>

                <p
                  className="mt-7 sm:mt-8 max-w-[60ch] sm:max-w-[66ch] text-base sm:text-[21px] text-[#F5F1EB]/78 leading-[1.58] transition-all duration-[850ms] delay-100"
                  style={{
                    opacity: heroEntered ? 1 : 0,
                    transform: heroEntered ? "translateY(0)" : "translateY(12px)",
                    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                >
                  Turn spending resolutions into self-enforcing rules on Sui, stored in Walrus Memory and checked live by Tatum before every send.
                </p>

                <div
                  className="mt-9 sm:mt-11 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 w-full sm:w-auto transition-all duration-[850ms] delay-200"
                  style={{
                    opacity: heroEntered ? 1 : 0,
                    transform: heroEntered ? "translateY(0)" : "translateY(10px)",
                    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                >
                  <OpenAppLink
                    href="/app"
                    className="group w-full sm:w-auto min-h-[58px] sm:min-h-[64px] px-9 sm:px-11 inline-flex items-center justify-center gap-3 rounded-full bg-[#ebaf64] text-[#090A0D] text-[17px] sm:text-[18px] font-semibold tracking-[-0.015em] border border-[#FFF2CF]/35 shadow-[0_10px_28px_rgba(235,175,100,0.18)] hover:bg-[#f2be7a] transition-all duration-150 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ebaf64] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  >
                    <span>Open Yearbound</span>
                    <ArrowRight
                      size={20}
                      strokeWidth={2.25}
                      className="transition-transform duration-150 group-hover:translate-x-[3px]"
                    />
                  </OpenAppLink>

                  <a
                    href="https://github.com/chief-07/yearbound"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group w-full sm:w-auto min-h-[58px] sm:min-h-[64px] px-9 sm:px-10 inline-flex items-center justify-center gap-3 rounded-full bg-[#0C0D11] border-2 border-[#F5F1EB]/25 text-[#F5F1EB] text-[17px] sm:text-[18px] font-semibold tracking-[-0.015em] hover:border-[#ebaf64] hover:text-[#ebaf64] hover:bg-[#12141A] transition-all duration-150 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ebaf64] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  >
                    <GithubMark />
                    <span>See project</span>
                  </a>
                </div>
              </div>

              {/* Subtle bottom cue inviting page turn when resting at cover */}
              {coverCurlT < 0.08 && (
                <button
                  type="button"
                  onClick={() => scrollToProgress(1)}
                  className="hidden sm:inline-flex items-center gap-2 absolute bottom-7 right-20 lg:right-28 z-20 font-mono text-xs tracking-wider uppercase text-[#F5F1EB]/60 hover:text-[#ebaf64] transition-colors py-2 px-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ebaf64]"
                >
                  <span>Scroll to turn page</span>
                  <ArrowRight size={13} className="rotate-45 text-[#ebaf64]" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ================================================================
            LAYER 3: CURLED PAPER UNDERSIDE FLAP + REAL CAST SHADOW ON GOLD
            ================================================================ */}
        {curlGeo && stageSize.w > 0 && (
          <svg
            aria-hidden="true"
            viewBox={`0 0 ${stageSize.w} ${stageSize.h}`}
            className="absolute inset-0 w-full h-full pointer-events-none z-30"
          >
            <defs>
              <clipPath id="yb-peeled-gold-zone">
                <path d={curlGeo.peeledSvg} />
              </clipPath>

              {/* Soft cast shadow projected onto the revealed Matte Gold leaf */}
              <linearGradient
                id="yb-curl-cast-shadow"
                gradientUnits="userSpaceOnUse"
                x1={curlGeo.shadowCoords.x1}
                y1={curlGeo.shadowCoords.y1}
                x2={curlGeo.shadowCoords.x2}
                y2={curlGeo.shadowCoords.y2}
              >
                <stop offset="0%" stopColor="rgba(0,0,0,0.48)" />
                <stop offset="45%" stopColor="rgba(0,0,0,0.18)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </linearGradient>

              {/* Cylindrical curved underside gradient of the lifted black Hero page */}
              <linearGradient
                id="yb-curl-back-sheen"
                gradientUnits="userSpaceOnUse"
                x1={curlGeo.gradCoords.x1}
                y1={curlGeo.gradCoords.y1}
                x2={curlGeo.gradCoords.x2}
                y2={curlGeo.gradCoords.y2}
              >
                <stop offset="0%" stopColor="#07080A" />
                <stop offset="18%" stopColor="#353844" />
                <stop offset="32%" stopColor="#564732" />
                <stop offset="68%" stopColor="#16181F" />
                <stop offset="100%" stopColor="#0A0B0E" />
              </linearGradient>
            </defs>

            {/* Cast shadow falling purely onto the revealed Gold page zone */}
            <path
              d={curlGeo.peeledSvg}
              clipPath="url(#yb-peeled-gold-zone)"
              fill="url(#yb-curl-cast-shadow)"
            />

            {/* Rolled black/champagne underside flap */}
            <path
              d={curlGeo.flapSvg}
              fill="url(#yb-curl-back-sheen)"
              stroke="rgba(235, 175, 100, 0.35)"
              strokeWidth="1.25"
            />

            {/* Subtle illuminated paper crease highlight */}
            {curlGeo.seamLine && (
              <line
                x1={curlGeo.seamLine.x1}
                y1={curlGeo.seamLine.y1}
                x2={curlGeo.seamLine.x2}
                y2={curlGeo.seamLine.y2}
                stroke="rgba(255, 232, 185, 0.22)"
                strokeWidth="1"
              />
            )}
          </svg>
        )}
      </div>
    </section>
  );
}
