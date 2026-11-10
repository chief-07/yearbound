"use client";

import React, { useEffect, useRef } from "react";

interface AmbientSparklesProps {
  afterglowTrigger: number;
}

interface RestingMote {
  xRatio: number;
  yRatio: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  twinkleSpeed: number;
  hasStarGlint: boolean;
  isWarmWhite: boolean;
}

interface CascadeEmber {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  maxAge: number;
  size: number;
  phase: number;
  hasStarGlint: boolean;
  isWarmWhite: boolean;
}

function drawTinyStarGlint(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  arm: number,
  alpha: number
) {
  if (alpha <= 0.03 || arm < 0.8) return;
  ctx.save();
  ctx.strokeStyle = `rgba(255, 240, 200, ${alpha.toFixed(3)})`;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(x - arm, y);
  ctx.lineTo(x + arm, y);
  ctx.moveTo(x, y - arm);
  ctx.lineTo(x, y + arm);
  ctx.stroke();

  ctx.fillStyle = `rgba(255, 250, 236, ${Math.min(1, alpha * 1.15).toFixed(3)})`;
  ctx.fillRect(x - 0.65, y - 0.65, 1.3, 1.3);
  ctx.restore();
}

function getCenterTextDampening(x: number, y: number, width: number, height: number): number {
  if (width <= 0 || height <= 0) return 1;
  const nx = Math.abs(x / width - 0.5) / 0.26;
  const ny = Math.abs(y / height - 0.48) / 0.2;
  const distSq = nx * nx + ny * ny;
  if (distSq >= 1) return 1;
  return 0.56 + 0.44 * distSq;
}

function pickSkyRatio(): { xRatio: number; yRatio: number } {
  return {
    xRatio: 0.015 + Math.random() * 0.97,
    yRatio: 0.02 + Math.random() * 0.95,
  };
}

export function AmbientSparkles({ afterglowTrigger }: AmbientSparklesProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spawnCascadeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = canvas.clientWidth || window.innerWidth;
    let height = canvas.clientHeight || window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const restingMotes: RestingMote[] = [];
    const cascadeEmbers: CascadeEmber[] = [];

    const seedRestingMotes = () => {
      restingMotes.length = 0;
      const count = width < 640 ? 64 : 116;
      for (let i = 0; i < count; i++) {
        const { xRatio, yRatio } = pickSkyRatio();
        restingMotes.push({
          xRatio,
          yRatio,
          vx: (Math.random() - 0.5) * 4.5,
          vy: 1.5 + Math.random() * 4.2,
          size: 0.85 + Math.random() * 1.25,
          phase: Math.random() * Math.PI * 2,
          twinkleSpeed: 1.1 + Math.random() * 1.6,
          hasStarGlint: i % 2 === 0,
          isWarmWhite: i % 3 === 0,
        });
      }
    };

    const syncSize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width || window.innerWidth));
      height = Math.max(1, Math.round(rect.height || window.innerHeight));
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    syncSize();
    seedRestingMotes();

    const spawnCascade = () => {
      const burstCount = width < 640 ? 68 : 112;
      for (let i = 0; i < burstCount; i++) {
        const xRatio = 0.02 + Math.random() * 0.96;
        const yRatio = 0.03 + Math.random() * 0.88;
        cascadeEmbers.push({
          x: xRatio * width,
          y: yRatio * height,
          vx: (Math.random() - 0.5) * 14,
          vy: 14 + Math.random() * 20,
          age: 0,
          maxAge: 7.5 + Math.random() * 5.0,
          size: 1.0 + Math.random() * 1.25,
          phase: Math.random() * Math.PI * 2,
          hasStarGlint: i % 2 === 0,
          isWarmWhite: i % 3 === 0,
        });
      }
    };

    spawnCascadeRef.current = spawnCascade;

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const renderStaticFrame = () => {
      ctx.clearRect(0, 0, width, height);
      for (const m of restingMotes) {
        const x = m.xRatio * width;
        const y = m.yRatio * height;
        const zoneFade = getCenterTextDampening(x, y, width, height);
        const alpha = 0.55 * zoneFade;
        ctx.fillStyle = `rgba(235, 175, 100, ${(alpha * 0.25).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, m.size * 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = m.isWarmWhite
          ? `rgba(255, 248, 228, ${(alpha * 0.9).toFixed(3)})`
          : `rgba(235, 175, 100, ${(alpha * 0.9).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, m.size * 0.78, 0, Math.PI * 2);
        ctx.fill();

        if (m.hasStarGlint) {
          drawTinyStarGlint(ctx, x, y, m.size * 2.4, alpha * 0.7);
        }
      }
    };

    if (reducedMotion) {
      renderStaticFrame();
      const handleReducedResize = () => {
        syncSize();
        renderStaticFrame();
      };
      window.addEventListener("resize", handleReducedResize);
      return () => {
        spawnCascadeRef.current = null;
        window.removeEventListener("resize", handleReducedResize);
      };
    }

    window.addEventListener("resize", syncSize);

    let rafId = 0;
    let prevTimeMs = performance.now();
    let totalTimeSec = 0;

    const tick = (nowMs: number) => {
      if (document.hidden) {
        prevTimeMs = nowMs;
        rafId = requestAnimationFrame(tick);
        return;
      }

      const dt = Math.min((nowMs - prevTimeMs) / 1000, 0.05);
      prevTimeMs = nowMs;
      totalTimeSec += dt;

      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";

      // 1) Calm permanent residual sky sparkles
      for (const m of restingMotes) {
        m.xRatio += (m.vx * dt) / width;
        m.yRatio += (m.vy * dt) / height;

        if (m.yRatio > 1.04) m.yRatio = -0.02;
        if (m.xRatio < -0.02) m.xRatio = 1.02;
        if (m.xRatio > 1.02) m.xRatio = -0.02;

        const x = m.xRatio * width;
        const y = m.yRatio * height;
        const zoneFade = getCenterTextDampening(x, y, width, height);
        const wave = 0.42 + 0.58 * (0.5 + 0.5 * Math.sin(totalTimeSec * m.twinkleSpeed + m.phase));
        const alpha = wave * 0.82 * zoneFade;

        ctx.fillStyle = `rgba(235, 175, 100, ${(alpha * 0.28).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, m.size * 2.7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = m.isWarmWhite
          ? `rgba(255, 248, 228, ${(alpha * 0.96).toFixed(3)})`
          : `rgba(235, 175, 100, ${(alpha * 0.95).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, m.size * 0.82, 0, Math.PI * 2);
        ctx.fill();

        if (m.hasStarGlint && wave > 0.54) {
          drawTinyStarGlint(ctx, x, y, 2.6 * wave + 0.8, alpha * 0.84);
        }
      }

      // 2) Lingering firework afterglow cascade gently drifting downward across the Hero sky
      for (let i = cascadeEmbers.length - 1; i >= 0; i--) {
        const e = cascadeEmbers[i];
        e.age += dt;
        if (e.age >= e.maxAge || e.y > height + 30) {
          cascadeEmbers.splice(i, 1);
          continue;
        }

        e.vx *= Math.pow(0.985, dt * 60);
        e.x += (e.vx + Math.sin(e.age * 1.45 + e.phase) * 11) * dt;
        e.y += e.vy * dt;

        const progress = e.age / e.maxAge;
        const envelope =
          progress < 0.08
            ? progress / 0.08
            : Math.max(0, 1 - Math.pow((progress - 0.08) / 0.92, 1.35));
        const twinkle = 0.42 + 0.58 * Math.abs(Math.sin(e.age * 3.6 + e.phase));
        const zoneFade = getCenterTextDampening(e.x, e.y, width, height);
        const alpha = envelope * twinkle * 0.9 * zoneFade;

        if (alpha > 0.03) {
          ctx.fillStyle = `rgba(235, 175, 100, ${(alpha * 0.28).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.size * 2.8, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = e.isWarmWhite
            ? `rgba(255, 249, 232, ${(alpha * 0.96).toFixed(3)})`
            : `rgba(240, 185, 112, ${(alpha * 0.95).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.size * 0.85, 0, Math.PI * 2);
          ctx.fill();

          if (e.hasStarGlint) {
            drawTinyStarGlint(ctx, e.x, e.y, 3.1 * twinkle + 0.9, alpha * 0.86);
          }
        }
      }

      ctx.globalCompositeOperation = "source-over";
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      spawnCascadeRef.current = null;
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", syncSize);
    };
  }, []);

  useEffect(() => {
    if (afterglowTrigger > 0) {
      spawnCascadeRef.current?.();
    }
  }, [afterglowTrigger]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none select-none z-[1]"
    />
  );
}
