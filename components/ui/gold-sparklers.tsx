"use client";

import React from "react";

/* ==========================================================================
   GOLD CELEBRATORY SPARKLERS (Floating Atmospheric Embers)
   - Sparse, refined particle count (16 deliberate celebratory sparks)
   - Originates from the bottom flare, drifting upward across the app
   - Reduced transparency (subtle 0.45 - 0.70 gold glow)
   - Organic shimmer & horizontal sway
   ========================================================================== */

interface SparklerConfig {
  id: number;
  left: number;       // percentage 5 - 95
  size: number;       // px 3 - 6
  duration: number;   // seconds 6 - 12
  delay: number;      // seconds negative for instant staggered loop
  opacity: number;    // 0.45 - 0.70
  swayDist: number;   // px horizontal drift
  isStar: boolean;    // star cross sparkle or circular amber spark
}

const SPARKLERS: SparklerConfig[] = [
  { id: 1, left: 12, size: 4, duration: 8.5, delay: -1.2, opacity: 0.55, swayDist: 14, isStar: true },
  { id: 2, left: 24, size: 3, duration: 10.0, delay: -4.5, opacity: 0.50, swayDist: -12, isStar: false },
  { id: 3, left: 38, size: 5, duration: 7.8, delay: -2.8, opacity: 0.65, swayDist: 16, isStar: true },
  { id: 4, left: 48, size: 3.5, duration: 11.2, delay: -6.0, opacity: 0.48, swayDist: -10, isStar: false },
  { id: 5, left: 62, size: 4.5, duration: 8.2, delay: -0.5, opacity: 0.60, swayDist: 18, isStar: true },
  { id: 6, left: 74, size: 3, duration: 9.5, delay: -5.2, opacity: 0.52, swayDist: -15, isStar: false },
  { id: 7, left: 86, size: 5, duration: 8.0, delay: -3.4, opacity: 0.58, swayDist: 12, isStar: true },
  { id: 8, left: 18, size: 3.5, duration: 11.0, delay: -7.5, opacity: 0.46, swayDist: -8, isStar: false },
  { id: 9, left: 32, size: 4, duration: 9.0, delay: -2.1, opacity: 0.62, swayDist: 14, isStar: true },
  { id: 10, left: 54, size: 3, duration: 10.5, delay: -8.0, opacity: 0.50, swayDist: -14, isStar: false },
  { id: 11, left: 68, size: 5.5, duration: 7.5, delay: -1.8, opacity: 0.68, swayDist: 15, isStar: true },
  { id: 12, left: 82, size: 3.5, duration: 9.8, delay: -4.0, opacity: 0.54, swayDist: -11, isStar: false },
  { id: 13, left: 42, size: 4, duration: 8.8, delay: -3.0, opacity: 0.58, swayDist: 10, isStar: true },
  { id: 14, left: 78, size: 3, duration: 11.5, delay: -6.8, opacity: 0.48, swayDist: -12, isStar: false },
];

export function GoldSparklers({ className = "" }: { className?: string }) {
  return (
    <div
      className={`absolute inset-0 pointer-events-none select-none overflow-hidden z-10 ${className}`}
      aria-hidden="true"
    >
      {SPARKLERS.map((s) => (
        <div
          key={s.id}
          className="absolute"
          style={{
            left: `${s.left}%`,
            bottom: "-20px",
            animation: `floatUpward ${s.duration}s ease-in-out infinite`,
            animationDelay: `${s.delay}s`,
            opacity: s.opacity,
          }}
        >
          {s.isStar ? (
            /* 4-point golden star cross */
            <div
              className="relative flex items-center justify-center animate-pulse"
              style={{
                width: `${s.size * 2.2}px`,
                height: `${s.size * 2.2}px`,
                animationDuration: `${2 + (s.id % 3)}s`,
              }}
            >
              <div
                className="absolute inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#FFE89E] to-transparent"
                style={{ boxShadow: "0 0 6px #FFAA00" }}
              />
              <div
                className="absolute inset-y-0 w-[1.5px] bg-gradient-to-b from-transparent via-[#FFE89E] to-transparent"
                style={{ boxShadow: "0 0 6px #FFAA00" }}
              />
              <div
                className="w-1.5 h-1.5 rounded-full bg-[#FFF5D6]"
                style={{ boxShadow: "0 0 8px #FFB833" }}
              />
            </div>
          ) : (
            /* Glowing circular amber ember */
            <div
              className="rounded-full bg-gradient-to-tr from-[#FF9900] via-[#FFD066] to-[#FFF0B3] animate-pulse"
              style={{
                width: `${s.size}px`,
                height: `${s.size}px`,
                boxShadow: `0 0 ${s.size * 2}px #FF9900, 0 0 ${s.size * 4}px rgba(255, 180, 50, 0.5)`,
                animationDuration: `${2.5 + (s.id % 2)}s`,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
