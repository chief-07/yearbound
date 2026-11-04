"use client";

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";
import {
  RocketFlareShader,
  type FlareState,
} from "@/components/ui/rocket-flare-shader";

/* ==========================================================================
   YEARBOUND REUSABLE VARIABLE BACKGROUND SYSTEM
   Built on the GPU WebGL Rocket Flare engine matching the SpaceX Starship
   re-entry plasma reference photo with complete visual parity.

   Exposes:
   - YearboundBackgroundProvider: Root context for app-wide reactivity
   - useYearboundBackground: Hook for triggering bursts, state shifts, and variable tweaks
   - YearboundBackground: The drop-in background wrapper for any screen or module
   ========================================================================== */

export type BackgroundState = FlareState;

export interface BackgroundConfig {
  state: BackgroundState;
  intensity: number;      // 0.2 to 2.5
  speed: number;          // 0.2 to 3.0
  spread: number;         // 0.5 to 1.8
  coreHeat: number;       // 0.5 to 2.5
  turbulence: number;     // 0.0 to 2.0
  showEmbers: boolean;
  mouseParallax: boolean;
  dimmerOpacity: number;
}

interface BackgroundContextType {
  config: BackgroundConfig;
  setConfig: React.Dispatch<React.SetStateAction<BackgroundConfig>>;
  setState: (state: BackgroundState) => void;
  setIntensity: (intensity: number) => void;
  setSpeed: (speed: number) => void;
  setSpread: (spread: number) => void;
  setCoreHeat: (coreHeat: number) => void;
  setTurbulence: (turbulence: number) => void;
  setShowEmbers: (show: boolean) => void;
  triggerViolationBurst: (durationMs?: number) => void;
  triggerCelebrationBurst: (durationMs?: number) => void;
  resetToDefaults: () => void;
}

const DEFAULT_CONFIG: BackgroundConfig = {
  state: "void",
  intensity: 1.15,
  speed: 1.0,
  spread: 1.0,
  coreHeat: 1.25,
  turbulence: 1.0,
  showEmbers: true,
  mouseParallax: true,
  dimmerOpacity: 0.0,
};

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
  state?: BackgroundState;
  intensity?: number;
  speed?: number;
  spread?: number;
  coreHeat?: number;
  turbulence?: number;
  showEmbers?: boolean;
  dimmerOpacity?: number;
  mouseParallax?: boolean;
  className?: string;
  children?: ReactNode;
}

/**
 * Reusable Yearbound Background Container
 */
export function YearboundBackground({
  state,
  intensity,
  speed,
  spread,
  coreHeat,
  turbulence,
  showEmbers,
  dimmerOpacity,
  mouseParallax,
  className = "",
  children,
}: YearboundBackgroundProps) {
  // Try to read from context, fallback to props or defaults if outside provider
  const ctx = useContext(BackgroundContext);

  const activeState = state ?? ctx?.config.state ?? DEFAULT_CONFIG.state;
  const activeIntensity = intensity ?? ctx?.config.intensity ?? DEFAULT_CONFIG.intensity;
  const activeSpeed = speed ?? ctx?.config.speed ?? DEFAULT_CONFIG.speed;
  const activeSpread = spread ?? ctx?.config.spread ?? DEFAULT_CONFIG.spread;
  const activeCoreHeat = coreHeat ?? ctx?.config.coreHeat ?? DEFAULT_CONFIG.coreHeat;
  const activeTurbulence = turbulence ?? ctx?.config.turbulence ?? DEFAULT_CONFIG.turbulence;
  const activeShowEmbers = showEmbers ?? ctx?.config.showEmbers ?? DEFAULT_CONFIG.showEmbers;
  const activeParallax = mouseParallax ?? ctx?.config.mouseParallax ?? DEFAULT_CONFIG.mouseParallax;
  const activeDimmer = dimmerOpacity ?? ctx?.config.dimmerOpacity ?? DEFAULT_CONFIG.dimmerOpacity;

  // Dynamic CSS variables injected into DOM for child components to inherit ambient colors
  const ambientTheme = useMemo(() => {
    switch (activeState) {
      case "violation":
        return {
          primary: "#E02A00",
          glow: "rgba(224, 42, 0, 0.45)",
          rim: "rgba(255, 60, 20, 0.6)",
        };
      case "celebration":
        return {
          primary: "#FFB82E",
          glow: "rgba(255, 184, 46, 0.45)",
          rim: "rgba(255, 215, 80, 0.6)",
        };
      case "void":
        return {
          primary: "#FF6600",
          glow: "rgba(180, 50, 0, 0.15)",
          rim: "rgba(255, 100, 30, 0.2)",
        };
      case "magma":
      default:
        return {
          primary: "#FF7700",
          glow: "rgba(255, 119, 0, 0.35)",
          rim: "rgba(255, 140, 40, 0.45)",
        };
    }
  }, [activeState]);

  return (
    <div
      className={`relative w-full min-h-screen bg-[#070403] text-[#F5F2EB] overflow-x-hidden ${className}`}
      style={
        {
          "--flare-primary": ambientTheme.primary,
          "--flare-glow": ambientTheme.glow,
          "--flare-rim": ambientTheme.rim,
        } as React.CSSProperties
      }
    >
      {/* ======================================================================
          BACKGROUND ENGINE: High-Fidelity WebGL Rocket Plume & God Rays
          ====================================================================== */}
      <div className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden">
        {/* Base Obsidian Void */}
        <div className="absolute inset-0 bg-[#070403]" />

        {/* 1. WebGL Rocket Flare Canvas (Pure Plasma Flare) */}
        <RocketFlareShader
          state={activeState}
          intensity={activeIntensity}
          speed={activeSpeed}
          spread={activeSpread}
          coreHeat={activeCoreHeat}
          turbulence={activeTurbulence}
          mouseParallax={activeParallax}
        />

        {/* 2. Soft Ambient Horizon Glow (adds cinematic atmosphere across ultrawide monitors) */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1200px] h-[550px] rounded-full pointer-events-none transition-all duration-700"
          style={{
            background: `radial-gradient(ellipse at bottom center, ${ambientTheme.glow} 0%, rgba(200, 50, 0, 0.15) 50%, transparent 80%)`,
            filter: "blur(80px)",
            opacity: activeIntensity * 0.75,
          }}
        />

        {/* 3. Floating Magma Embers (Micro-particles rising through the plume) */}
        {activeShowEmbers && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => {
              const leftPercent = 32 + ((i * 19) % 36);
              const sizePx = 1.5 + (i % 3);
              const durationSec = 3.5 + (i % 4) * 0.8;
              const delaySec = -(i * 0.5);

              return (
                <div
                  key={i}
                  className="absolute rounded-full animate-ember-pulse"
                  style={{
                    left: `${leftPercent}%`,
                    bottom: `${12 + (i * 4.2)}%`,
                    width: `${sizePx}px`,
                    height: `${sizePx}px`,
                    backgroundColor: ambientTheme.primary,
                    boxShadow: `0 0 8px ${ambientTheme.rim}`,
                    opacity: 0.35 + ((i % 4) * 0.15),
                    animationDuration: `${durationSec}s`,
                    animationDelay: `${delaySec}s`,
                  }}
                />
              );
            })}
          </div>
        )}

        {/* 4. Top Void Vignette (guarantees crystal-clear legibility for future top navigation) */}
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-[#070403] via-[#070403]/80 to-transparent pointer-events-none" />

        {/* 5. Custom Dimmer Overlay (for modal / dialog focus states) */}
        {activeDimmer > 0 && (
          <div
            className="absolute inset-0 bg-[#070403] pointer-events-none transition-opacity duration-500"
            style={{ opacity: activeDimmer }}
          />
        )}
      </div>

      {/* ======================================================================
          CHILDREN / FOREGROUND CONTENT
          ====================================================================== */}
      {children && <div className="relative z-10 w-full min-h-screen">{children}</div>}
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
  const [config, setConfig] = useState<BackgroundConfig>(DEFAULT_CONFIG);

  const setState = useCallback((state: BackgroundState) => {
    setConfig((prev) => ({ ...prev, state }));
  }, []);

  const setIntensity = useCallback((intensity: number) => {
    setConfig((prev) => ({ ...prev, intensity }));
  }, []);

  const setSpeed = useCallback((speed: number) => {
    setConfig((prev) => ({ ...prev, speed }));
  }, []);

  const setSpread = useCallback((spread: number) => {
    setConfig((prev) => ({ ...prev, spread }));
  }, []);

  const setCoreHeat = useCallback((coreHeat: number) => {
    setConfig((prev) => ({ ...prev, coreHeat }));
  }, []);

  const setTurbulence = useCallback((turbulence: number) => {
    setConfig((prev) => ({ ...prev, turbulence }));
  }, []);

  const setShowHull = useCallback((showHull: boolean) => {
    setConfig((prev) => ({ ...prev, showHull }));
  }, []);

  const setFlipY = useCallback((flipY: boolean) => {
    setConfig((prev) => ({ ...prev, flipY }));
  }, []);

  const setShowEmbers = useCallback((showEmbers: boolean) => {
    setConfig((prev) => ({ ...prev, showEmbers }));
  }, []);

  const triggerViolationBurst = useCallback((durationMs = 2800) => {
    setConfig((prev) => ({
      ...prev,
      state: "violation",
      intensity: 1.45,
      turbulence: 1.5,
      speed: 1.6,
    }));
    setTimeout(() => {
      setConfig((prev) => ({
        ...prev,
        state: "magma",
        intensity: 1.15,
        turbulence: 1.0,
        speed: 1.0,
      }));
    }, durationMs);
  }, []);

  const triggerCelebrationBurst = useCallback((durationMs = 3200) => {
    setConfig((prev) => ({
      ...prev,
      state: "celebration",
      intensity: 1.5,
      coreHeat: 1.6,
      speed: 1.3,
    }));
    setTimeout(() => {
      setConfig((prev) => ({
        ...prev,
        state: "magma",
        intensity: 1.15,
        coreHeat: 1.25,
        speed: 1.0,
      }));
    }, durationMs);
  }, []);

  const resetToDefaults = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
  }, []);

  const contextValue = useMemo(
    () => ({
      config,
      setConfig,
      setState,
      setIntensity,
      setSpeed,
      setSpread,
      setCoreHeat,
      setTurbulence,
      setShowHull,
      setFlipY,
      setShowEmbers,
      triggerViolationBurst,
      triggerCelebrationBurst,
      resetToDefaults,
    }),
    [
      config,
      setState,
      setIntensity,
      setSpeed,
      setSpread,
      setCoreHeat,
      setTurbulence,
      setShowHull,
      setFlipY,
      setShowEmbers,
      triggerViolationBurst,
      triggerCelebrationBurst,
      resetToDefaults,
    ]
  );

  return (
    <BackgroundContext.Provider value={contextValue}>
      {children}
    </BackgroundContext.Provider>
  );
}
