"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, RotateCcw } from "lucide-react";
import { OpenAppLink } from "@/components/pwa-install-provider";

interface CalendarHeaderProps {
  onReplayIntro: () => void;
  onJumpToCalendar: () => void;
}

const BINDER_RINGS = [0, 1, 2, 3, 4, 5, 6];

export function CalendarHeader({
  onReplayIntro,
  onJumpToCalendar,
}: CalendarHeaderProps) {
  return (
    <header className="fixed top-0 inset-x-0 z-40 pointer-events-none bg-[#050608] pt-[12px] sm:pt-[14px]">
      {/* Solid Matte Champagne-Gold Desk Calendar Binding Spine */}
      <div
        className="relative pointer-events-auto rounded-t-[14px] sm:rounded-t-[18px] border-t border-[#FFF2CF]/45 border-b border-[#090A0D]/20 shadow-[0_14px_34px_rgba(0,0,0,0.42)]"
        style={{
          background:
            "linear-gradient(180deg, #F0C27B 0%, #EBAF64 52%, #DE9E4D 100%)",
        }}
      >
        {/* 7 Sculpted Obsidian-Steel & Brass Twin Binder Rings Punched Into Top Edge */}
        <div
          aria-hidden="true"
          className="w-full px-7 sm:px-12 lg:px-16 xl:px-20 flex items-start justify-between pointer-events-none h-0 overflow-visible"
        >
          {BINDER_RINGS.map((ring, idx) => (
            <div
              key={ring}
              className={`relative -mt-[11px] sm:-mt-[13px] flex-col items-center ${
                idx % 2 === 1 ? "hidden sm:flex" : "flex"
              }`}
            >
              {/* Punched matte eyelet hole recessed into the matte gold calendar top */}
              <div className="relative top-[16px] sm:top-[18px] w-[20px] sm:w-[24px] h-[11px] sm:h-[13px] rounded-full bg-[#07080B] border border-[#6E491B]/65 shadow-[inset_0_3px_5px_rgba(0,0,0,0.95)] flex items-start justify-center">
                {/* Heavy dark gunmetal twin wire arches looping over top spine edge */}
                <div className="flex items-start gap-[3px] sm:gap-[4px] -mt-[14px] sm:-mt-[16px]">
                  <span
                    className="w-[4.5px] sm:w-[5.5px] h-[22px] sm:h-[25px] rounded-full border-t border-[#EBAF64]/60 shadow-[0_3px_6px_rgba(0,0,0,0.75)]"
                    style={{
                      background:
                        "linear-gradient(90deg, #07080A 0%, #2B2E38 35%, #5C606D 54%, #1A1C22 82%, #050507 100%)",
                    }}
                  />
                  <span
                    className="w-[4.5px] sm:w-[5.5px] h-[22px] sm:h-[25px] rounded-full border-t border-[#EBAF64]/60 shadow-[0_3px_6px_rgba(0,0,0,0.75)]"
                    style={{
                      background:
                        "linear-gradient(90deg, #07080A 0%, #2B2E38 35%, #5C606D 54%, #1A1C22 82%, #050507 100%)",
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Full-Width Editorial Header Bar — Larger Logo Anchored Left, Crisp Sentence-Case Nav */}
        <div className="w-full h-[78px] sm:h-[94px] pt-3 sm:pt-3.5 px-5 sm:px-8 lg:px-12 xl:px-14 flex items-center justify-between gap-4">
          {/* Left-Anchored Larger Wally Mascot + Bold Yearbound Lockup */}
          <Link
            href="#top"
            className="group inline-flex items-center gap-2.5 sm:gap-4 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#090A0D] rounded-xl py-1"
          >
            <Image
              src="/assets/mascot/wally_memories.png"
              alt=""
              width={62}
              height={62}
              priority
              className="w-11 h-11 sm:w-[58px] sm:h-[58px] lg:w-[62px] lg:h-[62px] object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.22)] transition-transform duration-150 group-hover:-translate-y-0.5"
            />
            <span className="text-[21px] sm:text-[28px] lg:text-[31px] font-semibold tracking-[-0.04em] leading-none text-[#090A0D] transition-opacity duration-150 group-hover:opacity-80">
              Yearbound
            </span>
          </Link>

          {/* Clean Sentence-Case Editorial Navigation (No Tiny Caps, No Pipe Slop; lg+ prevents tablet clipping) */}
          <nav
            aria-label="Primary navigation"
            className="hidden lg:flex items-center gap-8 lg:gap-11"
          >
            <button
              type="button"
              onClick={onJumpToCalendar}
              className="min-h-[44px] px-1 inline-flex items-center text-[16px] lg:text-[17px] font-medium tracking-[-0.015em] text-[#090A0D]/80 hover:text-[#090A0D] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#090A0D] rounded-md"
            >
              Calendar
            </button>
            <a
              href="#faq"
              className="min-h-[44px] px-1 inline-flex items-center text-[16px] lg:text-[17px] font-medium tracking-[-0.015em] text-[#090A0D]/80 hover:text-[#090A0D] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#090A0D] rounded-md"
            >
              FAQ
            </a>
            <a
              href="https://github.com/chief-07/yearbound"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] px-1 inline-flex items-center gap-1.5 text-[16px] lg:text-[17px] font-medium tracking-[-0.015em] text-[#090A0D]/80 hover:text-[#090A0D] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#090A0D] rounded-md"
            >
              <span>GitHub</span>
              <ArrowUpRight size={16} className="opacity-75" />
            </a>
          </nav>

          {/* Right Header Actions — Solid Obsidian Pill on Gold Spine */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button
              type="button"
              onClick={onReplayIntro}
              aria-label="Replay intro animation"
              className="min-h-[44px] min-w-[44px] px-2.5 sm:px-3.5 inline-flex items-center justify-center gap-2 text-[15px] sm:text-[16px] font-medium tracking-[-0.01em] text-[#090A0D]/75 hover:text-[#090A0D] transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#090A0D] rounded-lg"
            >
              <RotateCcw size={16} className="shrink-0" />
              <span className="hidden sm:inline">Replay intro</span>
            </button>

            <OpenAppLink
              href="/app"
              className="group min-h-[44px] sm:min-h-[48px] px-4 sm:px-6 inline-flex items-center gap-2 rounded-full bg-[#090A0D] text-[#F5F1EB] text-[14px] sm:text-[16px] font-medium hover:bg-[#191C24] transition-all duration-150 active:scale-[0.985] whitespace-nowrap shadow-[0_6px_16px_rgba(0,0,0,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#090A0D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#EBAF64]"
            >
              <span>
                <span className="sm:hidden">Open app</span>
                <span className="hidden sm:inline">Open Yearbound</span>
              </span>
              <ArrowRight
                size={16}
                className="shrink-0 text-[#ebaf64] transition-transform duration-150 group-hover:translate-x-[3px]"
              />
            </OpenAppLink>
          </div>
        </div>
      </div>
    </header>
  );
}
