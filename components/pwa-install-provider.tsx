"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Download, Share, Smartphone, X } from "lucide-react";

const PWA_DISMISSED_KEY = "yearbound_pwa_prompt_dismissed_v1";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt: () => Promise<void>;
}

const PWA_SCREENSHOTS = [
  {
    src: "/assets/bg/midnight_walrus.png",
    title: "Midnight Resolve",
    caption: "Set SUI stakes",
  },
  {
    src: "/assets/onboarding/walrus_memory.png",
    title: "Walrus Memory",
    caption: "Recalls your why",
  },
  {
    src: "/assets/onboarding/walrus_vault.png",
    title: "x402 Vault",
    caption: "Time-locked on Sui",
  },
  {
    src: "/assets/onboarding/walrus_bench.png",
    title: "Impulse Audit",
    caption: "Checks before send",
  },
  {
    src: "/assets/bg/starry_sky.png",
    title: "Midnight Mode",
    caption: "Standby sky",
  },
];

interface PwaInstallContextValue {
  handleOpenAppClick: (
    e: React.MouseEvent<HTMLAnchorElement>,
    href?: string
  ) => void;
  openInstallSheet: () => void;
}

const PwaInstallContext = createContext<PwaInstallContextValue>({
  handleOpenAppClick: () => {},
  openInstallSheet: () => {},
});

export function usePwaInstall() {
  return useContext(PwaInstallContext);
}

function isRunningStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const standaloneMedia =
    window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  const iosStandalone = Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone
  );
  return standaloneMedia || iosStandalone;
}

function detectIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function PwaInstallProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [targetHref, setTargetHref] = useState("/app");
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);
  const [activeScreenshot, setActiveScreenshot] = useState(0);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      setIsInstalled(isRunningStandalone());
      setIsIosDevice(detectIos());
    });

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {
          // Non-fatal if SW registration fails in restricted browsing mode
        });
    }

    const onBeforeInstallPrompt = (ev: Event) => {
      ev.preventDefault();
      setDeferredPrompt(ev as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!promptOpen) return;
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        setPromptOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [promptOpen]);

  const continueToApp = useCallback(
    (href = targetHref) => {
      try {
        sessionStorage.setItem(PWA_DISMISSED_KEY, "1");
      } catch {
        // Ignore session storage failures
      }
      setPromptOpen(false);
      router.push(href);
    },
    [router, targetHref]
  );

  const handleOpenAppClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href = "/app") => {
      // Preserve standard browser behavior for cmd/ctrl/middle-click new-tab opens
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        e.button !== 0
      ) {
        return;
      }

      if (isRunningStandalone() || isInstalled) {
        return;
      }

      let dismissed = false;
      try {
        dismissed = sessionStorage.getItem(PWA_DISMISSED_KEY) === "1";
      } catch {
        dismissed = false;
      }
      if (dismissed) {
        return;
      }

      e.preventDefault();
      setTargetHref(href);
      setPromptOpen(true);
    },
    [isInstalled]
  );

  const handleTriggerNativeInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        setPromptOpen(false);
        router.push(targetHref);
      }
    } catch {
      // Keep sheet open with browser fallback if native sheet fails
    } finally {
      setIsInstalling(false);
    }
  }, [deferredPrompt, router, targetHref]);

  const openInstallSheet = useCallback(() => {
    setTargetHref("/app");
    setPromptOpen(true);
  }, []);

  return (
    <PwaInstallContext.Provider
      value={{ handleOpenAppClick, openInstallSheet }}
    >
      {children}

      {promptOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="yb-pwa-title"
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-5"
          onClick={(ev) => {
            if (ev.target === ev.currentTarget) {
              setPromptOpen(false);
            }
          }}
        >
          <div className="relative w-full sm:max-w-[580px] max-h-[92svh] overflow-y-auto rounded-t-[24px] sm:rounded-[24px] bg-[#0B0C0F] border border-white/15 text-[#F5F1EB] shadow-[0_32px_90px_rgba(0,0,0,0.85)]">
            {/* Subtle Gold Spine Top Bar matching Calendar Header DNA */}
            <div
              className="h-1.5 w-full"
              style={{
                background:
                  "linear-gradient(90deg, #D3923C 0%, #EBAF64 50%, #F0C27B 100%)",
              }}
            />

            <div className="p-5 sm:p-7">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-[54px] h-[54px] rounded-[14px] overflow-hidden border border-[#ebaf64]/40 bg-[#07080B] shrink-0 shadow-[0_6px_18px_rgba(0,0,0,0.45)]">
                    <Image
                      src="/icons/icon-192.png"
                      alt="Yearbound app icon"
                      width={54}
                      height={54}
                      loading="eager"
                      unoptimized
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2
                        id="yb-pwa-title"
                        className="font-sans text-xl sm:text-[22px] font-semibold tracking-[-0.03em] text-[#F5F1EB]"
                      >
                        Install Yearbound
                      </h2>
                      <span className="font-mono text-[10px] tracking-wider uppercase px-2 py-0.5 rounded bg-[#ebaf64]/15 text-[#ebaf64] border border-[#ebaf64]/30">
                        PWA
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-[#F5F1EB]/70 leading-snug">
                      Add Yearbound to your home screen or desktop for full-screen wallet launch.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPromptOpen(false)}
                  aria-label="Close install prompt"
                  className="w-[44px] h-[44px] -mr-2 -mt-1 inline-flex items-center justify-center rounded-xl text-[#F5F1EB]/65 hover:text-[#F5F1EB] hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ebaf64]"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Rich Screenshots Preview Strip using BG Artwork */}
              <div className="mt-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[#F5F1EB]/55 whitespace-nowrap">
                    App Screenshots ({PWA_SCREENSHOTS.length})
                  </span>
                  <span className="font-mono text-[11px] text-[#ebaf64] truncate">
                    {PWA_SCREENSHOTS[activeScreenshot]?.title} ·{" "}
                    {PWA_SCREENSHOTS[activeScreenshot]?.caption}
                  </span>
                </div>

                <div className="flex items-stretch gap-2.5 overflow-x-auto pb-2 snap-x">
                  {PWA_SCREENSHOTS.map((shot, idx) => {
                    const selected = idx === activeScreenshot;
                    return (
                      <button
                        key={shot.src}
                        type="button"
                        onClick={() => setActiveScreenshot(idx)}
                        className={`group relative snap-start shrink-0 w-[86px] sm:w-[98px] aspect-[9/16] rounded-xl overflow-hidden border bg-[#07080B] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ebaf64] ${
                          selected
                            ? "border-[#ebaf64] ring-1 ring-[#ebaf64]/60 shadow-[0_8px_20px_rgba(235,175,100,0.22)]"
                            : "border-white/12 opacity-80 hover:opacity-100 hover:border-white/30"
                        }`}
                      >
                        <Image
                          src={shot.src}
                          alt={shot.title}
                          fill
                          loading="eager"
                          unoptimized
                          sizes="100px"
                          className="object-cover object-center"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-2 pt-4 pb-1.5 text-left">
                          <p className="font-mono text-[9px] font-medium text-[#F5F1EB] truncate">
                            {shot.title}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Native Prompt Status or Platform Install Hint */}
              {!deferredPrompt && (
                <div className="mt-4 rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 flex items-start gap-3">
                  {isIosDevice ? (
                    <Share
                      size={18}
                      className="text-[#ebaf64] shrink-0 mt-0.5"
                    />
                  ) : (
                    <Smartphone
                      size={18}
                      className="text-[#ebaf64] shrink-0 mt-0.5"
                    />
                  )}
                  <p className="text-[13px] text-[#F5F1EB]/78 leading-[1.5]">
                    {isIosDevice
                      ? 'In Safari, tap the Share button at the bottom of your screen and choose "Add to Home Screen" to install Yearbound.'
                      : 'Click the Install App button in your browser address bar or menu ("Install Yearbound") anytime to pin Yearbound as a standalone app.'}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 flex flex-col sm:flex-row items-stretch gap-3">
                {deferredPrompt && (
                  <button
                    type="button"
                    disabled={isInstalling}
                    onClick={handleTriggerNativeInstall}
                    className="flex-1 min-h-[52px] px-6 inline-flex items-center justify-center gap-2.5 rounded-full bg-[#ebaf64] text-[#090A0D] text-[15px] font-semibold tracking-[-0.015em] hover:bg-[#f2be7a] disabled:opacity-60 transition-all duration-150 active:scale-[0.985] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ebaf64] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0C0F]"
                  >
                    <Download size={18} strokeWidth={2.2} className="shrink-0" />
                    <span>
                      {isInstalling
                        ? "Installing Yearbound..."
                        : "Install Yearbound App"}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => continueToApp(targetHref)}
                  className={`${
                    deferredPrompt
                      ? "sm:shrink-0 bg-[#14161D] border border-white/20 text-[#F5F1EB] hover:border-[#ebaf64] hover:text-[#ebaf64]"
                      : "w-full bg-[#ebaf64] text-[#090A0D] hover:bg-[#f2be7a]"
                  } min-h-[52px] px-6 inline-flex items-center justify-center gap-2 rounded-full text-[15px] font-semibold tracking-[-0.015em] transition-all duration-150 active:scale-[0.985] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ebaf64] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0C0F]`}
                >
                  <span>
                    {deferredPrompt
                      ? "Continue in browser"
                      : "Open Yearbound wallet"}
                  </span>
                  <ArrowRight size={17} strokeWidth={2.2} className="shrink-0" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PwaInstallContext.Provider>
  );
}

interface OpenAppLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href?: string;
  children: React.ReactNode;
}

export function OpenAppLink({
  href = "/app",
  onClick,
  children,
  ...rest
}: OpenAppLinkProps) {
  const { handleOpenAppClick } = usePwaInstall();

  return (
    <Link
      href={href}
      {...rest}
      onClick={(ev) => {
        onClick?.(ev);
        handleOpenAppClick(ev, href);
      }}
    >
      {children}
    </Link>
  );
}
