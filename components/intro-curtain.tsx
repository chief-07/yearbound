"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

export const INTRO_STORAGE_KEY = "yearbound_intro_seen_v1";

type BeatIndex = 0 | 1 | 2;

interface IntroCurtainProps {
  onExitStart?: () => void;
  onComplete: () => void;
}

interface TrailPoint {
  x: number;
  y: number;
}

interface Shell {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  age: number;
  flightTime: number;
  burstCount: number;
  burstScale: number;
  isSubtle?: boolean;
  trail: TrailPoint[];
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  drag: number;
  age: number;
  maxAge: number;
  size: number;
  hasStarGlint: boolean;
  isInnerCore: boolean;
  isAfterglowDust?: boolean;
  twinklePhase: number;
  isGlitter: boolean;
  trail: TrailPoint[];
}

interface FlashHalo {
  x: number;
  y: number;
  radius: number;
  age: number;
  maxAge: number;
}

interface ScheduledShell {
  fireAtSec: number;
  fired: boolean;
  startXRatio: number;
  startYRatio: number;
  targetXRatio: number;
  targetYRatio: number;
  flightTime: number;
  burstCount: number;
  burstScale: number;
  isSubtle?: boolean;
}

function interpolateGoldColor(progress: number, alpha: number, isInnerCore: boolean): string {
  // Brief white flash (<100ms) -> Pale champagne -> Luminous Yearbound gold (#ebaf64) -> Copper ember
  if (progress < 0.08) {
    return `rgba(255, 255, 255, ${Math.min(1, alpha).toFixed(3)})`;
  }
  if (progress < 0.24) {
    const t = (progress - 0.08) / 0.16;
    const r = Math.round(255 - t * 8);
    const g = Math.round(248 - t * 34);
    const b = Math.round(224 - t * 92);
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
  }
  if (progress < 0.72) {
    const t = (progress - 0.24) / 0.48;
    // Champagne gold #ebaf64 (235, 175, 100)
    const r = Math.round(247 - t * (isInnerCore ? 26 : 12));
    const g = Math.round(214 - t * (isInnerCore ? 60 : 39));
    const b = Math.round(132 - t * (isInnerCore ? 58 : 32));
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
  }
  const t = (progress - 0.72) / 0.28;
  const r = Math.round(230 - t * 110);
  const g = Math.round(168 - t * 105);
  const b = Math.round(96 - t * 76);
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
}

function drawFourPointStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  arm: number,
  alpha: number
) {
  if (alpha <= 0.03 || arm < 0.8) return;
  ctx.save();
  ctx.strokeStyle = `rgba(255, 238, 192, ${alpha.toFixed(3)})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - arm, y);
  ctx.lineTo(x + arm, y);
  ctx.moveTo(x, y - arm);
  ctx.lineTo(x, y + arm);
  ctx.stroke();

  ctx.fillStyle = `rgba(255, 250, 235, ${Math.min(1, alpha * 1.1).toFixed(3)})`;
  ctx.fillRect(x - 0.7, y - 0.7, 1.4, 1.4);
  ctx.restore();
}

export function IntroCurtain({ onExitStart, onComplete }: IntroCurtainProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [beat, setBeat] = useState<BeatIndex>(0);
  const [isExiting, setIsExiting] = useState(false);
  const completedRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  const clearScheduledTimers = useCallback(() => {
    for (const id of timersRef.current) {
      window.clearTimeout(id);
    }
    timersRef.current = [];
  }, []);

  const finishCurtain = useCallback(
    (exitDurationMs = 900) => {
      if (completedRef.current) return;
      completedRef.current = true;
      clearScheduledTimers();
      try {
        sessionStorage.setItem(INTRO_STORAGE_KEY, "1");
      } catch {
        // Ignore storage restrictions
      }
      setIsExiting(true);
      onExitStart?.();
      const t = window.setTimeout(() => {
        document.documentElement.classList.remove("yb-intro-active");
        onComplete();
      }, exitDurationMs);
      timersRef.current.push(t);
    },
    [clearScheduledTimers, onComplete, onExitStart]
  );

  useEffect(() => {
    const rafHandoff = requestAnimationFrame(() => {
      document.documentElement.classList.remove("yb-intro-active");
    });

    // Calm, lingering beat schedule so each sentence sits comfortably with the reader:
    // 0.00s - 2.40s: "Every New Year..."
    // 2.40s - 5.60s: "millions make resolutions they don't keep"
    // 5.60s - 9.00s: "We built a wallet that remembers."
    // 9.00s - 9.90s: 900ms dissolve into Hero while champagne sparkles linger on site
    const tBeat1 = window.setTimeout(() => setBeat(1), 2400);
    const tBeat2 = window.setTimeout(() => setBeat(2), 5600);
    const tFade = window.setTimeout(() => finishCurtain(900), 9000);

    timersRef.current.push(tBeat1, tBeat2, tFade);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        finishCurtain(360);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(rafHandoff);
      window.removeEventListener("keydown", handleKeyDown);
      clearScheduledTimers();
    };
  }, [finishCurtain, clearScheduledTimers]);

  // Beat-choreographed wide sweeping gold & white filigree fireworks engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const syncCanvasSize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);
    };

    syncCanvasSize();
    window.addEventListener("resize", syncCanvasSize);

    const isNarrow = () => width < 640;

    // Calm, richly choreographed multi-shell display matched to the 9.0s beat cadence:
    // - Beat 0 (0.0 - 2.4s): Five staggered champagne gold bursts framing the opening sky
    // - Beat 1 (2.4 - 5.6s): Earlier willow streams droop gently + three quiet ambient peripheral crowns keep the sky alive
    // - Beat 2 (5.6 - 9.0s): Six cascading willow & brocade crowns leaving shimmering dust through the site handoff
    const cuePlan: ScheduledShell[] = [
      // Beat 0 shells
      {
        fireAtSec: 0.08,
        fired: false,
        startXRatio: 0.2,
        startYRatio: 0.96,
        targetXRatio: 0.22,
        targetYRatio: 0.24,
        flightTime: 0.56,
        burstCount: 68,
        burstScale: 1.08,
      },
      {
        fireAtSec: 0.42,
        fired: false,
        startXRatio: 0.8,
        startYRatio: 0.96,
        targetXRatio: 0.78,
        targetYRatio: 0.27,
        flightTime: 0.58,
        burstCount: 64,
        burstScale: 1.04,
      },
      {
        fireAtSec: 0.84,
        fired: false,
        startXRatio: 0.16,
        startYRatio: 0.97,
        targetXRatio: 0.15,
        targetYRatio: 0.58,
        flightTime: 0.5,
        burstCount: 50,
        burstScale: 0.88,
      },
      {
        fireAtSec: 1.2,
        fired: false,
        startXRatio: 0.64,
        startYRatio: 0.97,
        targetXRatio: 0.62,
        targetYRatio: 0.18,
        flightTime: 0.56,
        burstCount: 58,
        burstScale: 0.96,
      },
      {
        fireAtSec: 1.66,
        fired: false,
        startXRatio: 0.34,
        startYRatio: 0.97,
        targetXRatio: 0.33,
        targetYRatio: 0.17,
        flightTime: 0.54,
        burstCount: 48,
        burstScale: 0.86,
      },
      // Beat 1 calm peripheral bursts (frame outer perimeter softly around center sentence)
      {
        fireAtSec: 2.7,
        fired: false,
        startXRatio: 0.15,
        startYRatio: 0.97,
        targetXRatio: 0.14,
        targetYRatio: 0.68,
        flightTime: 0.5,
        burstCount: 36,
        burstScale: 0.74,
        isSubtle: true,
      },
      {
        fireAtSec: 3.48,
        fired: false,
        startXRatio: 0.85,
        startYRatio: 0.97,
        targetXRatio: 0.86,
        targetYRatio: 0.65,
        flightTime: 0.5,
        burstCount: 38,
        burstScale: 0.76,
        isSubtle: true,
      },
      {
        fireAtSec: 4.24,
        fired: false,
        startXRatio: 0.28,
        startYRatio: 0.97,
        targetXRatio: 0.28,
        targetYRatio: 0.21,
        flightTime: 0.54,
        burstCount: 38,
        burstScale: 0.78,
        isSubtle: true,
      },
      // Beat 2 finale cascade
      {
        fireAtSec: 5.08,
        fired: false,
        startXRatio: 0.21,
        startYRatio: 0.97,
        targetXRatio: 0.22,
        targetYRatio: 0.22,
        flightTime: 0.56,
        burstCount: 74,
        burstScale: 1.18,
      },
      {
        fireAtSec: 5.42,
        fired: false,
        startXRatio: 0.79,
        startYRatio: 0.97,
        targetXRatio: 0.78,
        targetYRatio: 0.24,
        flightTime: 0.56,
        burstCount: 70,
        burstScale: 1.14,
      },
      {
        fireAtSec: 5.86,
        fired: false,
        startXRatio: 0.49,
        startYRatio: 0.98,
        targetXRatio: 0.5,
        targetYRatio: 0.15,
        flightTime: 0.58,
        burstCount: 64,
        burstScale: 1.06,
      },
      {
        fireAtSec: 6.36,
        fired: false,
        startXRatio: 0.15,
        startYRatio: 0.98,
        targetXRatio: 0.15,
        targetYRatio: 0.52,
        flightTime: 0.52,
        burstCount: 54,
        burstScale: 0.94,
      },
      {
        fireAtSec: 6.76,
        fired: false,
        startXRatio: 0.85,
        startYRatio: 0.98,
        targetXRatio: 0.85,
        targetYRatio: 0.54,
        flightTime: 0.52,
        burstCount: 54,
        burstScale: 0.94,
      },
      {
        fireAtSec: 7.34,
        fired: false,
        startXRatio: 0.36,
        startYRatio: 0.98,
        targetXRatio: 0.35,
        targetYRatio: 0.22,
        flightTime: 0.56,
        burstCount: 52,
        burstScale: 0.92,
      },
    ];

    const shells: Shell[] = [];
    const sparks: Spark[] = [];
    const flashes: FlashHalo[] = [];

    const launchShell = (cue: ScheduledShell) => {
      const mobile = isNarrow();
      const targetX =
        width *
        (mobile
          ? cue.targetXRatio < 0.4
            ? 0.25
            : cue.targetXRatio > 0.6
            ? 0.76
            : 0.5
          : cue.targetXRatio);
      const targetY =
        height * (mobile ? Math.max(0.14, cue.targetYRatio - 0.02) : cue.targetYRatio);
      const startX = width * cue.startXRatio;
      const startY = height * cue.startYRatio;

      const T = cue.flightTime;
      const dy = startY - targetY;
      const gravity = (2 * dy) / (T * T);
      const vy = -gravity * T;
      const vx = (targetX - startX) / T;

      shells.push({
        x: startX,
        y: startY,
        vx,
        vy,
        gravity,
        age: 0,
        flightTime: T,
        burstCount: mobile ? Math.round(cue.burstCount * 0.78) : cue.burstCount,
        burstScale: cue.burstScale * (mobile ? 0.74 : 1.0),
        isSubtle: cue.isSubtle,
        trail: [{ x: startX, y: startY }],
      });
    };

    const explodeShell = (shell: Shell) => {
      const spreadSpan = Math.min(width, height) * (shell.isSubtle ? 0.25 : 0.62) * shell.burstScale;

      if (!shell.isSubtle) {
        flashes.push({
          x: shell.x,
          y: shell.y,
          radius: spreadSpan * 0.44,
          age: 0,
          maxAge: 0.32,
        });
      }

      const outerCount = Math.round(shell.burstCount * 0.62);
      const innerCount = shell.burstCount - outerCount;
      const dustCount = shell.isSubtle ? 6 : Math.round(shell.burstCount * 0.35);

      for (let i = 0; i < outerCount; i++) {
        const angle = (i / outerCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
        const radialWeight = 0.58 + Math.pow(Math.random(), 0.72) * 0.52;
        const speed = spreadSpan * radialWeight;
        sparks.push({
          x: shell.x,
          y: shell.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          gravity: shell.isSubtle ? 74 : 72,
          drag: shell.isSubtle ? 0.955 : 0.968,
          age: 0,
          maxAge: shell.isSubtle ? 1.15 + Math.random() * 0.3 : 1.9 + Math.random() * 0.6,
          size: shell.isSubtle ? 1.05 : 1.65,
          hasStarGlint: !shell.isSubtle && i % 4 === 0,
          isInnerCore: false,
          twinklePhase: Math.random() * Math.PI * 2,
          isGlitter: !shell.isSubtle && i % 3 === 0,
          trail: [{ x: shell.x, y: shell.y }],
        });
      }

      // Volumetric secondary golden petal ring inside the outer willow canopy
      for (let i = 0; i < innerCount; i++) {
        const angle = (i / innerCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.32;
        const speed = spreadSpan * (0.32 + Math.random() * 0.34);
        sparks.push({
          x: shell.x,
          y: shell.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          gravity: 58,
          drag: 0.96,
          age: 0,
          maxAge: shell.isSubtle ? 0.9 : 1.35 + Math.random() * 0.4,
          size: 1.2,
          hasStarGlint: false,
          isInnerCore: true,
          twinklePhase: Math.random() * Math.PI * 2,
          isGlitter: false,
          trail: [{ x: shell.x, y: shell.y }],
        });
      }

      // Lingering afterglow champagne dust motes that drift gently long after the willow fades
      for (let i = 0; i < dustCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = spreadSpan * (0.24 + Math.random() * 0.62);
        sparks.push({
          x: shell.x,
          y: shell.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          gravity: 16 + Math.random() * 14,
          drag: 0.94,
          age: 0,
          maxAge: shell.isSubtle ? 1.5 : 2.6 + Math.random() * 1.1,
          size: 1.05,
          hasStarGlint: i % 2 === 0,
          isInnerCore: false,
          isAfterglowDust: true,
          twinklePhase: Math.random() * Math.PI * 2,
          isGlitter: true,
          trail: [{ x: shell.x, y: shell.y }],
        });
      }
    };

    const startTimeMs = performance.now();
    let prevTimeMs = startTimeMs;
    let rafId = 0;

    const tick = (nowMs: number) => {
      const dt = Math.min((nowMs - prevTimeMs) / 1000, 0.04);
      prevTimeMs = nowMs;
      const elapsedSec = (nowMs - startTimeMs) / 1000;

      for (const cue of cuePlan) {
        if (!cue.fired && elapsedSec >= cue.fireAtSec) {
          cue.fired = true;
          launchShell(cue);
        }
      }

      // Pure #000000 clear prevents 4-point star smearing and keeps tapered willow splines razor-sharp
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = "lighter";

      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        f.age += dt;
        if (f.age >= f.maxAge) {
          flashes.splice(i, 1);
          continue;
        }
        const p = f.age / f.maxAge;
        const alpha = (1 - p) * (1 - p) * 0.12;
        const grad = ctx.createRadialGradient(
          f.x,
          f.y,
          0,
          f.x,
          f.y,
          f.radius * (0.4 + p * 0.78)
        );
        grad.addColorStop(0, `rgba(255, 246, 218, ${(alpha * 1.35).toFixed(3)})`);
        grad.addColorStop(0.45, `rgba(235, 175, 100, ${(alpha * 0.7).toFixed(3)})`);
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius * 1.18, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = shells.length - 1; i >= 0; i--) {
        const s = shells[i];
        s.age += dt;
        s.vy += s.gravity * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;

        s.trail.push({ x: s.x, y: s.y });
        if (s.trail.length > 9) s.trail.shift();

        if (!s.isSubtle && s.trail.length >= 2) {
          const tail = s.trail[0];
          const shellGrad = ctx.createLinearGradient(tail.x, tail.y, s.x, s.y);
          shellGrad.addColorStop(0, "rgba(235, 175, 100, 0)");
          shellGrad.addColorStop(1, "rgba(235, 175, 100, 0.58)");
          ctx.strokeStyle = shellGrad;
          ctx.lineWidth = 1.5;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(tail.x, tail.y);
          for (let j = 1; j < s.trail.length; j++) {
            ctx.lineTo(s.trail[j].x, s.trail[j].y);
          }
          ctx.stroke();

          ctx.fillStyle = "rgba(255, 248, 228, 0.95)";
          ctx.beginPath();
          ctx.arc(s.x, s.y, 1.75, 0, Math.PI * 2);
          ctx.fill();
        }

        if (s.age >= s.flightTime) {
          explodeShell(s);
          shells.splice(i, 1);
        }
      }

      const frameScale = dt * 60;
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.age += dt;
        if (sp.age >= sp.maxAge) {
          sparks.splice(i, 1);
          continue;
        }

        const dragFactor = Math.pow(sp.drag, frameScale);
        sp.vx *= dragFactor;
        sp.vy = sp.vy * dragFactor + sp.gravity * dt;
        if (sp.isAfterglowDust) {
          sp.x += sp.vx * dt + Math.sin(sp.age * 2.1 + sp.twinklePhase) * 14 * dt;
        } else {
          sp.x += sp.vx * dt;
        }
        sp.y += sp.vy * dt;

        const progress = sp.age / sp.maxAge;

        if (sp.isAfterglowDust) {
          const dustAlpha =
            progress < 0.12
              ? progress / 0.12
              : Math.max(0, 1 - Math.pow((progress - 0.12) / 0.88, 1.15));
          const dustTwinkle = 0.35 + 0.65 * Math.abs(Math.sin(sp.age * 5.4 + sp.twinklePhase));
          const finalAlpha = dustAlpha * dustTwinkle * 0.85;

          if (finalAlpha > 0.04) {
            ctx.fillStyle = `rgba(235, 175, 100, ${(finalAlpha * 0.24).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, sp.size * 2.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `rgba(255, 245, 218, ${(finalAlpha * 0.92).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, sp.size * 0.72, 0, Math.PI * 2);
            ctx.fill();

            if (sp.hasStarGlint && progress > 0.18) {
              drawFourPointStar(ctx, sp.x, sp.y, 2.8 * dustTwinkle + 0.8, finalAlpha * 0.78);
            }
          }
          continue;
        }

        sp.trail.push({ x: sp.x, y: sp.y });
        if (sp.trail.length > 13) sp.trail.shift();

        const baseAlpha =
          progress < 0.14
            ? 0.95
            : Math.max(0, 0.95 * (1 - Math.pow((progress - 0.14) / 0.86, 1.3)));
        const glitterMod =
          sp.isGlitter && progress > 0.42
            ? 0.48 + 0.52 * Math.abs(Math.sin(sp.age * 15 + sp.twinklePhase))
            : 1;
        const alpha = baseAlpha * glitterMod;

        if (sp.trail.length >= 2) {
          const prev = sp.trail[0];
          const dx = sp.x - prev.x;
          const dy = sp.y - prev.y;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";

          // Build smooth tail-to-head gradient only when span is measurable
          const useGrad = dx * dx + dy * dy > 4;

          // Pass 1: Soft warm gold optical bloom under-stroke
          if (!sp.isInnerCore) {
            if (useGrad) {
              const bloomGrad = ctx.createLinearGradient(prev.x, prev.y, sp.x, sp.y);
              bloomGrad.addColorStop(0, "rgba(235, 175, 100, 0)");
              bloomGrad.addColorStop(1, `rgba(235, 175, 100, ${(alpha * 0.24).toFixed(3)})`);
              ctx.strokeStyle = bloomGrad;
            } else {
              ctx.strokeStyle = `rgba(235, 175, 100, ${(alpha * 0.22).toFixed(3)})`;
            }
            ctx.lineWidth = Math.max(1.5, sp.size * 2.6 * (1 - progress * 0.48));
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            for (let j = 1; j < sp.trail.length; j++) {
              ctx.lineTo(sp.trail[j].x, sp.trail[j].y);
            }
            ctx.stroke();
          }

          // Pass 2: Crisp luminous filament core tapering gently from tail
          if (useGrad) {
            const coreGrad = ctx.createLinearGradient(prev.x, prev.y, sp.x, sp.y);
            coreGrad.addColorStop(0, interpolateGoldColor(Math.min(1, progress + 0.22), alpha * 0.06, true));
            coreGrad.addColorStop(0.55, interpolateGoldColor(progress, alpha * 0.55, sp.isInnerCore));
            coreGrad.addColorStop(1, interpolateGoldColor(progress, alpha * 0.96, sp.isInnerCore));
            ctx.strokeStyle = coreGrad;
          } else {
            ctx.strokeStyle = interpolateGoldColor(progress, alpha * 0.92, sp.isInnerCore);
          }
          ctx.lineWidth = Math.max(0.7, sp.size * (1 - progress * 0.5));
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          for (let j = 1; j < sp.trail.length; j++) {
            ctx.lineTo(sp.trail[j].x, sp.trail[j].y);
          }
          ctx.stroke();
        }

        // Luminous ember head bead
        if (alpha > 0.12) {
          ctx.fillStyle = interpolateGoldColor(Math.max(0, progress - 0.12), alpha, sp.isInnerCore);
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, Math.max(0.7, sp.size * 0.85 * (1 - progress * 0.45)), 0, Math.PI * 2);
          ctx.fill();
        }

        if (sp.hasStarGlint && progress > 0.28 && progress < 0.86) {
          const glintCurve = Math.sin(((progress - 0.28) / 0.58) * Math.PI);
          drawFourPointStar(ctx, sp.x, sp.y, 4.2 * glintCurve + 1.1, alpha * 0.88 * glintCurve);
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", syncCanvasSize);
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Yearbound introduction"
      className="fixed inset-0 z-50 bg-[#000000] select-none overflow-hidden transition-opacity duration-[900ms]"
      style={{
        opacity: isExiting ? 0 : 1,
        pointerEvents: isExiting ? "none" : "auto",
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 w-full h-full block"
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 52% 28% at 50% 50%, rgba(0, 0, 0, 0.62) 0%, rgba(0, 0, 0, 0.18) 65%, transparent 100%)",
        }}
      />

      <div className="relative z-10 h-full w-full flex items-center justify-center px-6">
        <div className="relative w-full max-w-[820px] min-h-[160px] flex items-center justify-center text-center">
          <p
            className="font-sans font-semibold tracking-[-0.03em] leading-[1.12] text-[#F5F1EB] text-[clamp(2rem,5.2vw,4rem)] transition-all duration-[700ms]"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: beat === 0 ? 1 : 0,
              transform: beat === 0 ? "translateY(0)" : "translateY(-8px)",
              transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <span>Every New Year...</span>
          </p>

          <p
            className="font-sans font-semibold tracking-[-0.03em] leading-[1.14] text-[#D8D3CA] text-[clamp(1.85rem,4.6vw,3.5rem)] transition-all duration-[700ms]"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: beat === 1 ? 1 : 0,
              transform:
                beat === 1
                  ? "translateY(0)"
                  : beat < 1
                  ? "translateY(8px)"
                  : "translateY(-8px)",
              transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <span>
              millions make resolutions they{" "}
              <span className="whitespace-nowrap">don&apos;t keep</span>
            </span>
          </p>

          <p
            className="font-sans font-semibold tracking-[-0.03em] leading-[1.12] text-[#F5F1EB] text-[clamp(1.9rem,4.8vw,3.65rem)] transition-all duration-[700ms]"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: beat === 2 ? 1 : 0,
              transform: beat === 2 ? "translateY(0)" : "translateY(8px)",
              transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <span>
              We built a wallet{" "}
              <span className="text-[#ebaf64] whitespace-nowrap">that remembers.</span>
            </span>
          </p>
        </div>
      </div>

      <div className="absolute bottom-7 right-6 sm:bottom-9 sm:right-10 z-20">
        <button
          type="button"
          onClick={() => finishCurtain(360)}
          className="min-h-[44px] px-4 inline-flex items-center gap-2 text-sm font-medium text-[#F5F1EB]/70 hover:text-[#ebaf64] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ebaf64]"
        >
          <span>Skip intro</span>
        </button>
      </div>
    </div>
  );
}
