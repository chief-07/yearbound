"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { INTRO_STORAGE_KEY, IntroCurtain } from "@/components/intro-curtain";
import { CalendarHeader } from "@/components/calendar-header";
import { PerpetualCalendarBook } from "@/components/perpetual-calendar-book";
import { GoldScrollRail } from "@/components/gold-scroll-rail";
import { AmbientSparkles } from "@/components/ambient-sparkles";
import { OpenAppLink } from "@/components/pwa-install-provider";

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
    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
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

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Who holds my keys and escrowed SUI?",
    answer:
      "In Real and Demo modes, Ed25519 keypairs are generated locally in your browser storage, or you can connect a Sui Wallet Standard browser extension. Escrowed fines settle to the configured Yearbound vault address on Sui and can only be withdrawn by the vault owner after December 25.",
  },
  {
    question: "What happens when a transfer breaks one of my rules?",
    answer:
      "Wally pauses the send flow on the Hold On screen and quotes your own reason back to you. Walking away with Cancel & Honor costs 0 SUI. Pushing the transfer through settles an x402 penalty (escalating 1x to 2.5x on repeat slips) into your December 25 vault before sending.",
  },
  {
    question: "Can I test Yearbound without spending Mainnet SUI?",
    answer:
      "Yes. Demo mode runs on Sui Testnet with a built-in Proof-of-Work faucet claimer and a timeline scrubber from January 1 to December 25. You can also toggle Walrus off in the wallet header to test transfers with zero memory recall or enforcement.",
  },
  {
    question: "Where are my rules and slip-up history stored?",
    answer:
      "Yearbound writes structured JSON records (genesis_pact, commitment_rule, accountability_event, and behavioral_pattern) to Walrus Memory so Wally recalls prior excuses across browser sessions.",
  },
  {
    question: "Who is Yearbound not built for?",
    answer:
      "Yearbound is built for personal spending discipline using small SUI stakes. Do not lock funds you may need in an emergency before December 25, because there is no early-withdrawal override or support unlock.",
  },
];

function GithubMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="w-5 h-5 fill-current shrink-0"
    >
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
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

  const bookSectionRef = useRef<HTMLElement | null>(null);
  const faqSectionRef = useRef<HTMLElement | null>(null);

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

  const handleReplayIntro = useCallback(() => {
    try {
      sessionStorage.removeItem(INTRO_STORAGE_KEY);
    } catch {
      // Ignore storage error
    }
    setIsCurtainExiting(false);
    setPlayTrigger((n) => n + 1);
    setClientPhase("curtain");
  }, []);

  const handleJumpToCalendar = useCallback(() => {
    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduced) {
      document.getElementById("calendar")?.scrollIntoView({ behavior: "auto" });
      return;
    }
    const el = bookSectionRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const top = window.scrollY + rect.top;
    const scrollable = Math.max(0, rect.height - window.innerHeight);
    window.scrollTo({
      top: top + scrollable * 0.25,
      behavior: "smooth",
    });
  }, []);

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

      {/* Ring-Bound Architectural Perpetual Calendar Header */}
      <CalendarHeader
        onReplayIntro={handleReplayIntro}
        onJumpToCalendar={handleJumpToCalendar}
      />

      {/* Right-Margin Vertical Gold Scroll Indicator */}
      <GoldScrollRail
        bookSectionRef={bookSectionRef}
        faqSectionRef={faqSectionRef}
        hidden={phase === "curtain"}
      />

      <main id="top">
        {/* Leaves 1–5: Midnight Hero Cover (diagonal page curl) -> Matte Gold Desk Calendar */}
        <PerpetualCalendarBook
          sectionRef={bookSectionRef}
          afterglowTrigger={afterglowTrigger}
          heroEntered={heroEntered}
        />

        {/* Leaf 6: Warm Archival Cream Paper FAQ (Open Typography, Zero Accordions) */}
        <section
          id="faq"
          ref={faqSectionRef}
          aria-labelledby="faq-heading"
          className="relative scroll-mt-[96px] py-28 sm:py-36 bg-[#F5F1EB] text-[#0D0E12] flex items-center"
        >
          <div className="max-w-[1280px] w-full mx-auto px-5 sm:px-10 lg:px-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
              <div className="lg:col-span-4">
                <h2
                  id="faq-heading"
                  className="font-sans font-semibold tracking-[-0.03em] leading-[1.08] text-[#0D0E12] text-[clamp(2rem,3.8vw,3rem)]"
                >
                  Questions before you stake
                </h2>
                <p className="mt-4 text-base text-[#2D303B] leading-[1.6] max-w-[34ch]">
                  Plain answers on key custody, Walrus Memory storage, and how December 25 vault unlocks work.
                </p>
              </div>

              <dl className="lg:col-span-8 divide-y divide-[#0D0E12]/15 border-t border-b border-[#0D0E12]/15">
                {FAQ_ITEMS.map((item) => (
                  <div key={item.question} className="py-7 sm:py-8">
                    <dt className="font-sans font-semibold tracking-[-0.02em] text-lg sm:text-xl text-[#0D0E12]">
                      {item.question}
                    </dt>
                    <dd className="mt-2.5 text-base text-[#262933] leading-[1.65] max-w-[62ch]">
                      {item.answer}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>
      </main>

      {/* Back Cover: Midnight Obsidian Sky + Ambient Sparkles + Directory Footer */}
      <footer className="relative overflow-hidden bg-[#000000] text-[#F5F1EB] py-24 sm:py-32">
        <AmbientSparkles afterglowTrigger={0} />

        <div className="relative z-10 max-w-[1280px] mx-auto px-5 sm:px-10 lg:px-20">
          {/* Row 1: Closing Call */}
          <div className="pb-16 sm:pb-20 border-b border-white/12 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="max-w-[28ch]">
              <h2 className="font-sans font-semibold tracking-[-0.03em] leading-[1.06] text-[#F5F1EB] text-[clamp(2.15rem,4.5vw,3.6rem)]">
                Make a pact with your future self and keep it.
              </h2>
              <p className="mt-4 text-base sm:text-lg text-[#F5F1EB]/74 leading-[1.6] max-w-[52ch]">
                Store your spending rules in Walrus Memory, verify every transfer live with Tatum, and enforce your resolve on Sui.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 sm:gap-4 shrink-0">
              <OpenAppLink
                href="/app"
                className="group min-h-[56px] sm:min-h-[62px] px-8 sm:px-10 inline-flex items-center justify-center gap-3 rounded-full bg-[#ebaf64] text-[#090A0D] text-[16px] sm:text-[17px] font-semibold tracking-[-0.015em] border border-[#FFF2CF]/35 shadow-[0_10px_28px_rgba(235,175,100,0.18)] hover:bg-[#f2be7a] transition-all duration-150 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ebaf64] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <span>Open Yearbound</span>
                <ArrowRight
                  size={19}
                  strokeWidth={2.25}
                  className="transition-transform duration-150 group-hover:translate-x-[3px]"
                />
              </OpenAppLink>

              <a
                href="https://github.com/chief-07/yearbound"
                target="_blank"
                rel="noopener noreferrer"
                className="group min-h-[56px] sm:min-h-[62px] px-8 sm:px-9 inline-flex items-center justify-center gap-3 rounded-full bg-[#0C0D11] border-2 border-[#F5F1EB]/25 text-[#F5F1EB] text-[16px] sm:text-[17px] font-semibold tracking-[-0.015em] hover:border-[#ebaf64] hover:text-[#ebaf64] hover:bg-[#12141A] transition-all duration-150 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ebaf64] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <GithubMark />
                <span>See project</span>
              </a>
            </div>
          </div>

          {/* Row 2: Bare Wally Lockup, Directory Links & Legal Line */}
          <div className="pt-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <Link
              href="#top"
              className="group inline-flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ebaf64] rounded-lg"
            >
              <Image
                src="/assets/mascot/wally_memories.png"
                alt=""
                width={30}
                height={30}
                className="w-[30px] h-[30px] object-contain"
              />
              <span className="text-base font-semibold tracking-[-0.02em] text-[#F5F1EB] group-hover:text-[#ebaf64] transition-colors">
                Yearbound
              </span>
            </Link>

            <div className="flex flex-wrap items-center gap-6 text-sm text-[#F5F1EB]/75">
              <OpenAppLink
                href="/app"
                className="py-1.5 hover:text-[#ebaf64] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ebaf64] rounded"
              >
                Open app
              </OpenAppLink>
              <button
                type="button"
                onClick={handleJumpToCalendar}
                className="py-1.5 hover:text-[#ebaf64] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ebaf64] rounded"
              >
                Calendar
              </button>
              <a
                href="#faq"
                className="py-1.5 hover:text-[#F5F1EB] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ebaf64] rounded"
              >
                FAQ
              </a>
              <a
                href="https://github.com/chief-07/yearbound"
                target="_blank"
                rel="noopener noreferrer"
                className="py-1.5 hover:text-[#ebaf64] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ebaf64] rounded"
              >
                GitHub
              </a>
            </div>
          </div>

          <p className="mt-8 text-[13px] text-[#F5F1EB]/55">
            Yearbound 2026 · Built with Walrus Memory, Tatum, and Sui · MIT License.
          </p>
        </div>
      </footer>
    </div>
  );
}
