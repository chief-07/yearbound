"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

/* ==========================================================================
   SOLAR FLARE SYSTEM — REUSABLE VARIABLE BACKGROUND ENGINE
   Engineered for exact fidelity to the collimated rocket booster / solar flare
   reference photos (intense core pillar, symmetrical volumetric light shafts,
   magma horizon, and reactive ember plasma).
   ========================================================================== */

export type FlareVariant = "magma" | "crimson" | "champagne" | "void";
export type FlareIntensity = "calm" | "active" | "surge" | "eclipse";
export type FlareOrigin = "bottom-center" | "bottom-left" | "bottom-right" | "center";

export interface SolarFlareConfig {
  variant: FlareVariant;
  intensity: FlareIntensity;
  origin: FlareOrigin;
  beamsCount: 5 | 7 | 9;
  showHorizon: boolean;
  showEmbers: boolean;
  interactive?: boolean;
}

interface SolarFlareContextType {
  config: SolarFlareConfig;
  setConfig: React.Dispatch<React.SetStateAction<SolarFlareConfig>>;
  triggerSurge: (durationMs?: number) => void;
  setVariant: (variant: FlareVariant) => void;
  setIntensity: (intensity: FlareIntensity) => void;
}

const SolarFlareContext = createContext<SolarFlareContextType | null>(null);

export function useSolarFlare() {
  const context = useContext(SolarFlareContext);
  if (!context) {
    throw new Error("useSolarFlare must be used within a SolarFlareProvider");
  }
  return context;
}

/* --------------------------------------------------------------------------
   PALETTE DEFINITIONS (Variable color stops for rays, core, and ambient glow)
   -------------------------------------------------------------------------- */
const FLARE_PALETTES: Record<
  FlareVariant,
  {
    core: string;
    mid: string;
    outer: string;
    ambient: string;
    rimBorder: string;
    fog: string;
  }
> = {
  // 1. Magma / Rocket Burn (The primary reference: #FFE299 -> #FF6200 -> #A81B00)
  magma: {
    core: "#FFF0C2",
    mid: "#FF6600",
    outer: "#B31C00",
    ambient: "rgba(255, 90, 0, 0.45)",
    rimBorder: "rgba(255, 125, 40, 0.35)",
    fog: "#070403",
  },
  // 2. Crimson / Penalty Shockwave (Used during x402 enforcement & rule violations)
  crimson: {
    core: "#FFD4CC",
    mid: "#E51E00",
    outer: "#660700",
    ambient: "rgba(230, 25, 0, 0.55)",
    rimBorder: "rgba(255, 60, 40, 0.45)",
    fog: "#090202",
  },
  // 3. Champagne / Christmas Vault (Celebratory golden ember for unlock)
  champagne: {
    core: "#FFFFFF",
    mid: "#FFC84D",
    outer: "#D48800",
    ambient: "rgba(255, 190, 60, 0.4)",
    rimBorder: "rgba(255, 210, 100, 0.4)",
    fog: "#060503",
  },
  // 4. Void / Stealth (Dimmed ambient glow for content-dense views)
  void: {
    core: "#FFAA44",
    mid: "#7A2E0D",
    outer: "#2E0E04",
    ambient: "rgba(180, 60, 10, 0.2)",
    rimBorder: "rgba(255, 100, 30, 0.15)",
    fog: "#050302",
  },
};

/* --------------------------------------------------------------------------
   INTENSITY MULTIPLIERS (Controls ray opacity, blur scale, and breath rate)
   -------------------------------------------------------------------------- */
const INTENSITY_SETTINGS: Record<
  FlareIntensity,
  {
    coreOpacity: number;
    raysOpacity: number;
    ambientBlur: number;
    scale: number;
    breathDuration: string;
  }
> = {
  calm: {
    coreOpacity: 0.65,
    raysOpacity: 0.55,
    ambientBlur: 140,
    scale: 0.95,
    breathDuration: "9s",
  },
  active: {
    coreOpacity: 0.88,
    raysOpacity: 0.82,
    ambientBlur: 110,
    scale: 1.0,
    breathDuration: "6s",
  },
  surge: {
    coreOpacity: 1.0,
    raysOpacity: 1.0,
    ambientBlur: 80,
    scale: 1.15,
    breathDuration: "2.5s",
  },
  eclipse: {
    coreOpacity: 0.35,
    raysOpacity: 0.25,
    ambientBlur: 160,
    scale: 0.85,
    breathDuration: "12s",
  },
};

/* --------------------------------------------------------------------------
   RAY SPECIFICATIONS (Collimated ray geometry matching the booster burn)
   -------------------------------------------------------------------------- */
interface RayGeometry {
  id: string;
  angleDeg: number;
  widthPx: number;
  heightPercent: number;
  blurPx: number;
  opacityMultiplier: number;
  delaySec: number;
}

const NINE_RAY_GEOMETRY: RayGeometry[] = [
  // Center Column (Vertical Rocket Core)
  { id: "center-pillar", angleDeg: 0, widthPx: 180, heightPercent: 135, blurPx: 28, opacityMultiplier: 1.0, delaySec: 0 },
  // Inner Pair (+/- 8 degrees)
  { id: "inner-left", angleDeg: -8, widthPx: 130, heightPercent: 125, blurPx: 32, opacityMultiplier: 0.88, delaySec: -2 },
  { id: "inner-right", angleDeg: 8, widthPx: 130, heightPercent: 125, blurPx: 32, opacityMultiplier: 0.88, delaySec: -4.5 },
  // Mid Pair (+/- 18 degrees)
  { id: "mid-left", angleDeg: -18, widthPx: 150, heightPercent: 115, blurPx: 42, opacityMultiplier: 0.72, delaySec: -1.5 },
  { id: "mid-right", angleDeg: 18, widthPx: 150, heightPercent: 115, blurPx: 42, opacityMultiplier: 0.72, delaySec: -3.8 },
  // Outer Pair (+/- 30 degrees)
  { id: "outer-left", angleDeg: -30, widthPx: 180, heightPercent: 100, blurPx: 54, opacityMultiplier: 0.52, delaySec: -6 },
  { id: "outer-right", angleDeg: 30, widthPx: 180, heightPercent: 100, blurPx: 54, opacityMultiplier: 0.52, delaySec: -5.2 },
  // Far Horizon Spill (+/- 44 degrees)
  { id: "far-left", angleDeg: -44, widthPx: 210, heightPercent: 85, blurPx: 64, opacityMultiplier: 0.35, delaySec: -3 },
  { id: "far-right", angleDeg: 44, widthPx: 210, heightPercent: 85, blurPx: 64, opacityMultiplier: 0.35, delaySec: -7 },
];

/* --------------------------------------------------------------------------
   SOLAR FLARE CANVAS / SVG COMPONENT
   -------------------------------------------------------------------------- */
export interface SolarFlareCanvasProps {
  variant?: FlareVariant;
  intensity?: FlareIntensity;
  origin?: FlareOrigin;
  beamsCount?: 5 | 7 | 9;
  showHorizon?: boolean;
  showEmbers?: boolean;
  className?: string;
}

export function SolarFlareCanvas({
  variant = "magma",
  intensity = "active",
  origin = "bottom-center",
  beamsCount = 7,
  showHorizon = true,
  showEmbers = true,
  className = "",
}: SolarFlareCanvasProps) {
  const palette = FLARE_PALETTES[variant];
  const settings = INTENSITY_SETTINGS[intensity];

  // Filter rays based on beamsCount
  const activeRays = useMemo(() => {
    if (beamsCount === 5) return NINE_RAY_GEOMETRY.slice(0, 5);
    if (beamsCount === 7) return NINE_RAY_GEOMETRY.slice(0, 7);
    return NINE_RAY_GEOMETRY;
  }, [beamsCount]);

  // Origin coordinate mappings
  const originClasses = useMemo(() => {
    switch (origin) {
      case "bottom-left":
        return "items-end justify-start pl-[15%]";
      case "bottom-right":
        return "items-end justify-end pr-[15%]";
      case "center":
        return "items-center justify-center";
      case "bottom-center":
      default:
        return "items-end justify-center";
    }
  }, [origin]);

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none select-none z-0 ${className}`}
      style={
        {
          "--flare-core": palette.core,
          "--flare-mid": palette.mid,
          "--flare-outer": palette.outer,
          "--flare-ambient": palette.ambient,
          "--flare-rim": palette.rimBorder,
          "--flare-fog": palette.fog,
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      {/* 1. Underlying Deep Void */}
      <div className="absolute inset-0 bg-[#070403] transition-colors duration-1000" />

      {/* 2. Primary Horizon Volumetric Light Field */}
      <div
        className="absolute -bottom-48 left-1/2 -translate-x-1/2 w-[1400px] h-[950px] rounded-full pointer-events-none transition-all duration-1000"
        style={{
          background: `radial-gradient(ellipse at center, ${palette.mid} 0%, ${palette.outer} 40%, rgba(10, 4, 2, 0.95) 75%, transparent 100%)`,
          filter: `blur(${settings.ambientBlur}px)`,
          opacity: settings.ambientBlur ? settings.coreOpacity : 0.7,
          transform: `translateX(-50%) scale(${settings.scale})`,
        }}
      />

      {/* 3. Collimated Volumetric Rays Layer */}
      <div className={`absolute inset-0 flex ${originClasses}`}>
        {activeRays.map((ray) => {
          const rayOpacity = ray.opacityMultiplier * settings.raysOpacity;

          return (
            <div
              key={ray.id}
              className="absolute origin-bottom transition-all duration-1000"
              style={{
                width: `${ray.widthPx}px`,
                height: `${ray.heightPercent}%`,
                transform: `rotate(${ray.angleDeg}deg)`,
                opacity: rayOpacity,
                filter: `blur(${ray.blurPx}px)`,
                animation: `flareRaysSway ${settings.breathDuration} ease-in-out infinite`,
                animationDelay: `${ray.delaySec}s`,
                background: `linear-gradient(to top, ${palette.core} 0%, ${palette.mid} 25%, ${palette.outer} 65%, transparent 100%)`,
                clipPath: "polygon(44% 0%, 56% 0%, 88% 100%, 12% 100%)",
              }}
            />
          );
        })}
      </div>

      {/* 4. Secondary Sharper Central Ray (The Piercing Jet) */}
      <div className={`absolute inset-0 flex ${originClasses}`}>
        <div
          className="w-[70px] md:w-[120px] h-[130%] origin-bottom transition-all duration-700"
          style={{
            background: `linear-gradient(to top, #FFFFFF 0%, ${palette.core} 20%, ${palette.mid} 60%, transparent 100%)`,
            filter: "blur(14px)",
            opacity: settings.coreOpacity * 0.9,
            animation: `flareBreathe ${settings.breathDuration} ease-in-out infinite`,
            clipPath: "polygon(48% 0%, 52% 0%, 75% 100%, 25% 100%)",
          }}
        />
      </div>

      {/* 5. Incandescent Horizon Core Bulb (Blinding Ignition Spot) */}
      <div
        className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[420px] md:w-[680px] h-[180px] md:h-[260px] rounded-[100%] pointer-events-none transition-all duration-700"
        style={{
          background: `radial-gradient(ellipse at center, #FFFFFF 0%, ${palette.core} 25%, ${palette.mid} 65%, transparent 100%)`,
          filter: "blur(22px)",
          opacity: settings.coreOpacity,
          transform: `translateX(-50%) scale(${settings.scale})`,
        }}
      />

      {/* 6. Realistic Floating Ember Particles */}
      {showEmbers && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(16)].map((_, i) => {
            const leftPercent = 38 + ((i * 17) % 24); // Grouped near central column
            const sizePx = 2 + (i % 3);
            const durationSec = 4 + (i % 5);
            const delaySec = -(i * 0.7);

            return (
              <div
                key={i}
                className="absolute rounded-full bg-[#FFE8A3] shadow-[0_0_8px_#FF8800] animate-ember-pulse"
                style={{
                  left: `${leftPercent}%`,
                  bottom: `${5 + (i * 5)}%`,
                  width: `${sizePx}px`,
                  height: `${sizePx}px`,
                  opacity: 0.3 + ((i % 5) * 0.15),
                  animationDuration: `${durationSec}s`,
                  animationDelay: `${delaySec}s`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* 7. Curved Metallic Horizon Silhouette (Matching the rocket stage rim in the reference photo) */}
      {showHorizon && (
        <div className="absolute bottom-0 inset-x-0 h-28 pointer-events-none flex flex-col justify-end">
          {/* Subtle curved rim highlight line */}
          <div
            className="w-full h-[1px] opacity-40 transition-colors duration-1000"
            style={{
              background: `radial-gradient(ellipse at center, ${palette.core} 0%, ${palette.mid} 50%, transparent 90%)`,
            }}
          />
          {/* Deep bottom occlusion fade */}
          <div
            className="w-full h-24"
            style={{
              background: `linear-gradient(to top, #070403 40%, rgba(7, 4, 3, 0.8) 75%, transparent 100%)`,
            }}
          />
        </div>
      )}

      {/* 8. Fine Grain Film Texture */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
    </div>
  );
}

/* --------------------------------------------------------------------------
   SOLAR FLARE WRAPPER / CONTAINER COMPONENT
   Wraps entire pages, cards, or sections, injecting CSS variables and lighting.
   -------------------------------------------------------------------------- */
export interface SolarFlareBackgroundProps extends SolarFlareCanvasProps {
  children?: ReactNode;
  containerClassName?: string;
}

export function SolarFlareBackground({
  variant = "magma",
  intensity = "active",
  origin = "bottom-center",
  beamsCount = 7,
  showHorizon = true,
  showEmbers = true,
  className = "",
  containerClassName = "",
  children,
}: SolarFlareBackgroundProps) {
  return (
    <div className={`relative w-full min-h-screen bg-[#070403] text-[#F5F2EB] overflow-hidden ${containerClassName}`}>
      {/* Background Flare Engine */}
      <SolarFlareCanvas
        variant={variant}
        intensity={intensity}
        origin={origin}
        beamsCount={beamsCount}
        showHorizon={showHorizon}
        showEmbers={showEmbers}
        className={className}
      />

      {/* Foreground Content */}
      <div className="relative z-10 w-full min-h-screen">
        {children}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   CONTEXT PROVIDER FOR APP-WIDE REACTIVE LIGHTING
   -------------------------------------------------------------------------- */
export function SolarFlareProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SolarFlareConfig>({
    variant: "magma",
    intensity: "active",
    origin: "bottom-center",
    beamsCount: 7,
    showHorizon: true,
    showEmbers: true,
  });

  const triggerSurge = useCallback((durationMs = 2500) => {
    setConfig((prev) => ({ ...prev, intensity: "surge" }));
    setTimeout(() => {
      setConfig((prev) => ({ ...prev, intensity: "active" }));
    }, durationMs);
  }, []);

  const setVariant = useCallback((variant: FlareVariant) => {
    setConfig((prev) => ({ ...prev, variant }));
  }, []);

  const setIntensity = useCallback((intensity: FlareIntensity) => {
    setConfig((prev) => ({ ...prev, intensity }));
  }, []);

  return (
    <SolarFlareContext.Provider
      value={{
        config,
        setConfig,
        triggerSurge,
        setVariant,
        setIntensity,
      }}
    >
      {children}
    </SolarFlareContext.Provider>
  );
}
