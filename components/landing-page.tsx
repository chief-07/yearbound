"use client";

import React, { useEffect, useState, useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, RotateCcw } from "lucide-react";
import { INTRO_STORAGE_KEY, IntroCurtain } from "@/components/intro-curtain";
import { AmbientSparkles } from "@/components/ambient-sparkles";

type LandingPhase = "ssr" | "curtain" | "hero";

let clientPhase: LandingPhase | null = null;
const phaseListeners = new Set<() => void>();

function subscribePhase(listener: () => void): () => void {
  phaseListeners.add(listener);
  return () => {
    phaseListeners.delete(listener);
  };
}

function setClientPhase(next: LandingPhase) {
  clientPhase = next;
  phaseListeners.forEach((fn) => fn());
}

function getClientPhaseSnapshot(): LandingPhase {
  if (clientPhase !== null) return clientPhase;
  try {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const forceIntro = window.location.search.indexOf("intro=1") !== -1;
    const seen = sessionStorage.getItem(INTRO_STORAGE_KEY) === "1";
    clientPhase = !reduced && (forceIntro || !seen) ? "curtain" : "hero";
  } catch {
    clientPhase = "hero";
  }
  return clientPhase;
}

function getServerPhaseSnapshot(): LandingPhase {
  return "ssr";
}

export function LandingPage() {
  const phase = useSyncExternalStore(
    subscribePhase,
    getClientPhaseSnapshot,
    getServerPhaseSnapshot
  );
  const [playTrigger, setPlayTrigger] = useState(0);
  const [afterglowTrigger, setAfterglowTrigger] = useState(0);
  const [isCurtainExiting, setIsCurtainExiting] = useState(false);

  useEffect(() => {
    if (phase === "hero") {
      document.documentElement.classList.remove("yb-intro-active");
    }
  }, [phase]);

  const handleCurtainExitStart = useCallback(() => {
    setIsCurtainExiting(true);
    setAfterglowTrigger((n) => n + 1);
  }, []);

  const handleCurtainComplete = useCallback(() => {
    setIsCurtainExiting(false);
    setClientPhase("hero");
  }, []);

  const handleReplayIntro = () => {
    try {
      sessionStorage.removeItem(INTRO_STORAGE_KEY);
    } catch {
      // Ignore storage error
    }
    setIsCurtainExiting(false);
    setPlayTrigger((n) => n + 1);
    setClientPhase("curtain");
  };

  const heroEntered = phase === "hero" || phase === "ssr" || isCurtainExiting;

  return (
    <div className="min-h-screen bg-[#000000] text-[#F5F1EB] font-sans">
      {phase === "curtain" && (
        <IntroCurtain
          key={playTrigger}
          onExitStart={handleCurtainExitStart}
          onComplete={handleCurtainComplete}
        />
      )}

      {/* Minimal Fixed Header */}
      <header className="fixed top-0 inset-x-0 z-30 h-[72px] bg-[#000000]/95 border-b border-white/10">
        <div className="max-w-[1280px] mx-auto h-full px-5 sm:px-10 lg:px-20 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="text-base sm:text-lg font-semibold tracking-[-0.02em] text-[#F5F1EB] hover:text-[#ebaf64] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ebaf64] rounded"
          >
            Yearbound
          </Link>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button
              type="button"
              onClick={handleReplayIntro}
              aria-label="Replay intro animation"
              className="min-h-[44px] px-2.5 sm:px-3 inline-flex items-center gap-1.5 text-[13px] sm:text-sm font-medium text-[#F5F1EB]/70 hover:text-[#ebaf64] transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ebaf64] rounded"
            >
              <RotateCcw size={14} className="shrink-0" />
              <span>
                Replay<span className="hidden sm:inline"> intro</span>
              </span>
            </button>

            <Link
              href="/app"
              className="min-h-[44px] px-4 sm:px-5 inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-[#ebaf64] text-[#000000] text-[13px] sm:text-sm font-medium hover:bg-[#f2be7a] transition-all duration-150 active:scale-[0.985] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ebaf64] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              <span>
                <span className="sm:hidden">Open app</span>
                <span className="hidden sm:inline">Open Yearbound</span>
              </span>
              <ArrowRight size={15} className="shrink-0" />
            </Link>
          </div>
        </div>
      </header>

      {/* Step 1 Hero Stage (Fades cleanly from the Intro Curtain) */}
      <main id="top">
        <section className="relative min-h-[100svh] pt-[72px] flex items-center justify-center overflow-hidden bg-[#000000]">
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none select-none transition-opacity duration-[900ms]"
            style={{
              opacity: heroEntered ? 0.65 : 0.2,
              transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <Image
              src="/assets/bg/starry_sky.png"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-center opacity-55"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 75% 55% at 50% 60%, rgba(235, 175, 100, 0.08) 0%, rgba(0, 0, 0, 0.45) 55%, #000000 100%)",
              }}
            />
          </div>

          <AmbientSparkles afterglowTrigger={afterglowTrigger} />

          <div
            className="relative z-10 max-w-[1280px] w-full mx-auto px-6 sm:px-10 lg:px-20 py-16 flex flex-col items-center text-center transition-all duration-[900ms]"
            style={{
              opacity: heroEntered ? 1 : 0,
              transform: heroEntered ? "translateY(0)" : "translateY(10px)",
              transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <h1 className="font-sans font-semibold tracking-[-0.03em] leading-[1.06] text-[#F5F1EB] text-[clamp(2.35rem,5.8vw,4.5rem)] max-w-[18ch]">
              Keep your financial resolve all year long
            </h1>

            <p className="mt-6 max-w-[52ch] text-base sm:text-lg text-[#F5F1EB]/75 leading-[1.6]">
              Yearbound pairs Wally, an on-chain spending agent built on Walrus Memory and Tatum, with SUI escrow penalties locked until Dec 25.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Link
                href="/app"
                className="w-full sm:w-auto min-h-[44px] px-7 inline-flex items-center justify-center gap-2 rounded-full bg-[#ebaf64] text-[#000000] text-base font-medium hover:bg-[#f2be7a] transition-all duration-150 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ebaf64] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <span>Open Yearbound</span>
                <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
