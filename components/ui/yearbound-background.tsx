"use client";

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import Image from "next/image";

/* ==========================================================================
   YEARBOUND REUSABLE VARIABLE BACKGROUND SYSTEM
   Built around the authentic rocket plume master texture with programmable
   atmospheric masks, dynamic state engine, and ambient rim-light injection.
   ========================================================================== */

export type BackgroundMode = "hero" | "dashboard" | "split" | "focus";
export type BackgroundState = "calm" | "active" | "violation" | "celebrate";

export interface BackgroundConfig {
  mode: BackgroundMode;
  state: BackgroundState;
  showEmbers: boolean;
  dimmerOpacity?: number; // 0.0 - 1.0 (for custom content overlay density)
}

interface BackgroundContextType {
  config: BackgroundConfig;
  setConfig: React.Dispatch<React.SetStateAction<BackgroundConfig>>;
  setMode: (mode: BackgroundMode) => void;
  setState: (state: BackgroundState) => void;
  triggerViolationBurst: (durationMs?: number) => void;
  triggerCelebrationBurst: (durationMs?: number) => void;
}

const BackgroundContext = createContext<BackgroundContextType | null>(null);

export function useYearboundBackground() {
  const context = useContext(BackgroundContext);
  if (!context) {
    throw new Error(
      "useYearboundBackground must be used within a YearboundBackgroundProvider"
    );
  }
  return context;
}

export interface YearboundBackgroundProps {
  mode?: BackgroundMode;
  state?: BackgroundState;
  showEmbers?: boolean;
  dimmerOpacity?: number;
  className?: string;
  children?: ReactNode;
}

/**
 * Core Reusable Background Layer
 */
export function YearboundBackground({
  mode = "hero",
  state = "active",
  showEmbers = true,
  dimmerOpacity,
  className = "",
  children,
}: YearboundBackgroundProps) {
  // State-specific visual filters and lighting variables
  const stateStyles = useMemo(() => {
    switch (state) {
      case "violation":
        return {
          filter: "brightness(1.15) contrast(1.25) saturate(1.4) hue-rotate(-22deg)",
          rimColor: "rgba(255, 45, 10, 0.45)",
          ambientGlow: "rgba(220, 30, 0, 0.4)",
          pulseSpeed: "1.8s",
        };
      case "celebrate":
        return {
          filter: "brightness(1.25) contrast(1.1) saturate(1.2) hue-rotate(28deg)",
          rimColor: "rgba(255, 200, 60, 0.5)",
          ambientGlow: "rgba(255, 180, 40, 0.45)",
          pulseSpeed: "4s",
        };
      case "calm":
        return {
          filter: "brightness(0.75) contrast(1.05) saturate(0.9)",
          rimColor: "rgba(255, 110, 30, 0.15)",
          ambientGlow: "rgba(200, 60, 0, 0.18)",
          pulseSpeed: "9s",
        };
      case "active":
      default:
        return {
          filter: "brightness(1.0) contrast(1.15) saturate(1.1)",
          rimColor: "rgba(255, 120, 30, 0.3)",
          ambientGlow: "rgba(255, 90, 0, 0.28)",
          pulseSpeed: "6s",
        };
    }
  }, [state]);

  // Mode-specific positioning and mask calibrations
  const modeStyles = useMemo(() => {
    switch (mode) {
      case "dashboard":
        return {
          imagePosition: "center 75%",
          imageScale: "scale(1.02) translateY(12%)",
          topVoidHeight: "h-64",
          topVoidOpacity: "from-[#070403] via-[#070403]/90 to-transparent",
          coreBlur: "blur-[40px]",
        };
      case "split":
        return {
          imagePosition: "center 65%",
          imageScale: "scale(1.05)",
          topVoidHeight: "h-48",
          topVoidOpacity: "from-[#070403] via-[#070403]/80 to-transparent",
          coreBlur: "blur-[30px]",
        };
      case "focus":
        return {
          imagePosition: "center 85%",
          imageScale: "scale(1.2) translateY(-5%)",
          topVoidHeight: "h-36",
          topVoidOpacity: "from-[#070403] via-[#070403]/60 to-transparent",
          coreBlur: "blur-[20px]",
        };
      case "hero":
      default:
        return {
          imagePosition: "center 60%",
          imageScale: "scale(1.0)",
          topVoidHeight: "h-52",
          topVoidOpacity: "from-[#070403] via-[#070403]/75 to-transparent",
          coreBlur: "blur-[24px]",
        };
    }
  }, [mode]);

  return (
    <div
      className={`relative w-full min-h-screen bg-[#070403] text-[#F5F2EB] overflow-x-hidden ${className}`}
      style={
        {
          "--flare-rim": stateStyles.rimColor,
          "--flare-ambient": stateStyles.ambientGlow,
        } as React.CSSProperties
      }
    >
      {/* ======================================================================
          BACKGROUND LAYER 1: Master Photographic Rocket Plume Texture
          ====================================================================== */}
      <div className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden">
        {/* The Authentic Rocket Plume Image Asset */}
        <div
          className="absolute inset-0 transition-all duration-1000 ease-out animate-flare-breathe"
          style={{
            filter: stateStyles.filter,
            transform: modeStyles.imageScale,
            animationDuration: stateStyles.pulseSpeed,
          }}
        >
          <Image
            src="/assets/flare/master-flare.jpg"
            alt="Rocket Plume Background"
            fill
            priority
            sizes="100vw"
            className="object-cover object-bottom"
            quality={95}
          />
        </div>

        {/* ====================================================================
            BACKGROUND LAYER 2: Non-Destructive Atmospheric Gradient Masks
            Ensures text and UI content remain 100% crisp, sharp, and readable.
            ==================================================================== */}

        {/* Top Void Mask (Drowns the top in deep obsidian for navigation & headers) */}
        <div
          className={`absolute top-0 inset-x-0 ${modeStyles.topVoidHeight} bg-gradient-to-b ${modeStyles.topVoidOpacity} pointer-events-none`}
        />

        {/* Bottom Horizon Occlusion Fade */}
        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#070403] via-[#070403]/80 to-transparent pointer-events-none" />

        {/* Left & Right Peripheral Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(7,4,3,0.85)_95%)] pointer-events-none" />

        {/* Optional Custom Dimmer Overlay */}
        {dimmerOpacity !== undefined && (
          <div
            className="absolute inset-0 bg-[#070403] pointer-events-none transition-opacity duration-500"
            style={{ opacity: dimmerOpacity }}
          />
        )}

        {/* ====================================================================
            BACKGROUND LAYER 3: Interactive Volumetric Glow Core
            Adds physical depth and reactive lighting behind cards.
            ==================================================================== */}
        <div
          className={`absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[600px] md:w-[900px] h-[350px] rounded-full pointer-events-none transition-all duration-1000 ${modeStyles.coreBlur}`}
          style={{
            background: `radial-gradient(ellipse at center, rgba(255, 180, 50, 0.45) 0%, ${stateStyles.ambientGlow} 45%, transparent 75%)`,
          }}
        />

        {/* ====================================================================
            BACKGROUND LAYER 4: Floating Magma Embers (Micro-Physics)
            ==================================================================== */}
        {showEmbers && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(14)].map((_, i) => {
              const leftPercent = 32 + ((i * 19) % 36); // Concentrated along beam columns
              const sizePx = 2 + (i % 3);
              const durationSec = 5 + (i % 4);
              const delaySec = -(i * 0.8);

              return (
                <div
                  key={i}
                  className="absolute rounded-full bg-[#FFE59E] shadow-[0_0_8px_#FF7700] animate-ember-pulse"
                  style={{
                    left: `${leftPercent}%`,
                    bottom: `${8 + (i * 6)}%`,
                    width: `${sizePx}px`,
                    height: `${sizePx}px`,
                    opacity: 0.25 + ((i % 4) * 0.15),
                    animationDuration: `${durationSec}s`,
                    animationDelay: `${delaySec}s`,
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================================
          FOREGROUND CONTENT CONTAINER
          Positioned above the background layers with full interactivity.
          ====================================================================== */}
      <div className="relative z-10 w-full min-h-screen">{children}</div>
    </div>
  );
}

/**
 * App-Wide Background Provider for Reactive State Management
 */
export function YearboundBackgroundProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [config, setConfig] = useState<BackgroundConfig>({
    mode: "hero",
    state: "active",
    showEmbers: true,
  });

  const setMode = (mode: BackgroundMode) => {
    setConfig((prev) => ({ ...prev, mode }));
  };

  const setState = (state: BackgroundState) => {
    setConfig((prev) => ({ ...prev, state }));
  };

  const triggerViolationBurst = (durationMs = 2800) => {
    setConfig((prev) => ({ ...prev, state: "violation" }));
    setTimeout(() => {
      setConfig((prev) => ({ ...prev, state: "active" }));
    }, durationMs);
  };

  const triggerCelebrationBurst = (durationMs = 3500) => {
    setConfig((prev) => ({ ...prev, state: "celebrate" }));
    setTimeout(() => {
      setConfig((prev) => ({ ...prev, state: "active" }));
    }, durationMs);
  };

  return (
    <BackgroundContext.Provider
      value={{
        config,
        setConfig,
        setMode,
        setState,
        triggerViolationBurst,
        triggerCelebrationBurst,
      }}
    >
      <YearboundBackground
        mode={config.mode}
        state={config.state}
        showEmbers={config.showEmbers}
        dimmerOpacity={config.dimmerOpacity}
      >
        {children}
      </YearboundBackground>
    </BackgroundContext.Provider>
  );
}
