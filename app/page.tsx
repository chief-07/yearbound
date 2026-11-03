"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Shield,
  Brain,
  Lock,
  Trophy,
  ArrowRight,
  Play,
  Sparkles,
} from "lucide-react";
import { SolarCompass } from "@/components/ui/solar-compass";
import {
  YearboundBackground,
  useYearboundBackground,
  YearboundBackgroundProvider,
  type BackgroundState,
} from "@/components/ui/yearbound-background";
import { MobileWalletView } from "@/components/ui/mobile-wallet-view";

function YearboundShowcaseContent() {
  const { config, triggerViolationBurst, triggerCelebrationBurst, setState } =
    useYearboundBackground();

  const [activeNav, setActiveNav] = useState("Home");

  return (
    <div className="relative min-h-screen flex flex-col justify-between">
      {/* ======================================================================
          TOP NAVIGATION BAR (Matching Reference Image)
          ====================================================================== */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-20">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5 cursor-pointer">
          <SolarCompass size={28} glow={true} />
          <span className="font-serif text-2xl font-bold tracking-tight bg-gradient-to-r from-[#FFF2DE] to-[#FFAA44] bg-clip-text text-transparent">
            Yearbound
          </span>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#A39E99]">
          {["About", "How It Works", "Features", "FAQ"].map((item) => (
            <button
              key={item}
              onClick={() => setActiveNav(item)}
              className={`transition-colors hover:text-white ${
                activeNav === item ? "text-[#FF8800] font-semibold" : ""
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

        {/* Right Action Pill */}
        <div className="flex items-center gap-3">
          {/* Quick Demo Flare State Toggles */}
          <div className="hidden lg:flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-full px-2.5 py-1 text-[11px] font-mono text-neutral-400">
            <span>Flare State:</span>
            <button
              onClick={() => setState("active")}
              className={`px-2 py-0.5 rounded-full transition-all ${
                config.state === "active"
                  ? "bg-[#FF6600] text-white font-semibold"
                  : "hover:text-white"
              }`}
            >
              Magma
            </button>
            <button
              onClick={() => triggerViolationBurst(3000)}
              className={`px-2 py-0.5 rounded-full transition-all ${
                config.state === "violation"
                  ? "bg-[#D82A00] text-white font-semibold"
                  : "hover:text-[#FF6644]"
              }`}
            >
              Penalty Surge
            </button>
            <button
              onClick={() => triggerCelebrationBurst(3500)}
              className={`px-2 py-0.5 rounded-full transition-all ${
                config.state === "celebrate"
                  ? "bg-[#FFAA00] text-black font-semibold"
                  : "hover:text-[#FFD066]"
              }`}
            >
              Christmas
            </button>
          </div>

          <button
            onClick={() => triggerCelebrationBurst(3000)}
            className="btn-flare-primary rounded-full px-5 py-2 text-xs sm:text-sm font-semibold tracking-wide flex items-center gap-1.5 shadow-lg"
          >
            <span>Get Started</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* ======================================================================
          MAIN HERO VIEWPORT (Desktop Showcase Left + Mobile App Right)
          ====================================================================== */}
      <main className="w-full max-w-7xl mx-auto px-6 py-4 flex-1 flex flex-col justify-center z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* LEFT COLUMN: Editorial Hero Showcase */}
          <div className="lg:col-span-7 space-y-8 pr-0 lg:pr-6">
            <div className="space-y-4">
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#F5F2EB] leading-[1.08]">
                Make a Pact <br />
                with Your{" "}
                <span className="italic font-normal bg-gradient-to-r from-[#FF9433] via-[#FFAF52] to-[#FF7011] bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(255,110,20,0.45)]">
                  Future Self.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-[#9E968F] font-normal max-w-lg leading-relaxed pt-1">
                Set your goals. Stay accountable. <br />
                Let Yearbound keep you on track — all year long.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button
                onClick={() => triggerViolationBurst(2500)}
                className="btn-flare-primary rounded-full px-7 py-3.5 text-sm font-semibold tracking-wide flex items-center gap-2 shadow-xl"
              >
                <span>Start Your Year</span>
                <ArrowRight size={16} />
              </button>

              <button
                onClick={() => triggerCelebrationBurst(3000)}
                className="btn-flare-secondary rounded-full px-6 py-3.5 text-sm font-semibold tracking-wide flex items-center gap-2"
              >
                <Play size={14} className="fill-current text-[#FFAA55]" />
                <span>Learn More</span>
              </button>
            </div>

            {/* 4 Feature Value Pillars (Matching Reference Image Bottom) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-white/10">
              {/* Pillar 1 */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[#FF8822]">
                  <Shield size={16} />
                  <span className="text-xs font-bold text-[#E8DFD3]">
                    Set Commitments
                  </span>
                </div>
                <p className="text-[11px] text-[#8C857E] leading-relaxed">
                  Define your goals for the year.
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[#FF9933]">
                  <Brain size={16} />
                  <span className="text-xs font-bold text-[#E8DFD3]">
                    Get Checked
                  </span>
                </div>
                <p className="text-[11px] text-[#8C857E] leading-relaxed">
                  We&apos;ll review transactions against your rules.
                </p>
              </div>

              {/* Pillar 3 */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[#FF6611]">
                  <Lock size={16} />
                  <span className="text-xs font-bold text-[#E8DFD3]">
                    Face Consequences
                  </span>
                </div>
                <p className="text-[11px] text-[#8C857E] leading-relaxed">
                  Break a rule? A penalty is applied.
                </p>
              </div>

              {/* Pillar 4 */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[#FFAA22]">
                  <Trophy size={16} />
                  <span className="text-xs font-bold text-[#E8DFD3]">
                    Unlock Rewards
                  </span>
                </div>
                <p className="text-[11px] text-[#8C857E] leading-relaxed">
                  Stay consistent and get your funds back.
                </p>
              </div>
            </div>

            {/* Bottom Slogan Banner (From Reference Mockup) */}
            <div className="pt-2">
              <div className="solar-card rounded-2xl p-4 border border-[#FF6600]/20 flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg text-[#F5F2EB]">
                    A year of discipline.{" "}
                    <span className="italic text-[#FF8D33]">
                      A lifetime of progress.
                    </span>
                  </h3>
                  <p className="text-xs text-[#9E968F] mt-0.5">
                    Decentralized memory on Walrus Mainnet. Sui time-locked escrow.
                  </p>
                </div>
                <div className="hidden sm:block">
                  <SolarCompass size={32} glow={false} />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Mobile App Interface (Exact Reference Parity) */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <MobileWalletView onTriggerSurge={() => triggerViolationBurst(2800)} />
          </div>
        </div>
      </main>

      {/* ======================================================================
          FOOTER INFRASTRUCTURE STATUS
          ====================================================================== */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-[#8C857E] font-mono z-20 gap-3">
        <div className="flex items-center gap-2">
          <SolarCompass size={14} glow={false} />
          <span>Yearbound Protocol © 2026</span>
          <span className="text-neutral-600">•</span>
          <span>Total Recall Edition</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Walrus Memory Mainnet</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#FFAA44]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFAA44]" />
            <span>Tatum Sui RPC Gateway</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#FF6622]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF6622]" />
            <span>x402 Protocol</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function HomePage() {
  return (
    <YearboundBackgroundProvider>
      <YearboundShowcaseContent />
    </YearboundBackgroundProvider>
  );
}
