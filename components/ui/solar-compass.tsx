import React from "react";

interface SolarCompassProps {
  className?: string;
  size?: number;
  glow?: boolean;
}

export function SolarCompass({
  className = "",
  size = 28,
  glow = true,
}: SolarCompassProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {glow && (
        <div
          className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-300 blur-md opacity-70 animate-pulse pointer-events-none"
          style={{ transform: "scale(1.2)" }}
        />
      )}
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-full h-full drop-shadow-[0_0_8px_rgba(255,120,20,0.8)]"
      >
        <defs>
          <linearGradient
            id="solarGoldGrad"
            x1="24"
            y1="0"
            x2="24"
            y2="48"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FFF2CC" />
            <stop offset="25%" stopColor="#FFAA00" />
            <stop offset="70%" stopColor="#FF5500" />
            <stop offset="100%" stopColor="#C82400" />
          </linearGradient>
          <linearGradient
            id="solarInnerGrad"
            x1="12"
            y1="12"
            x2="36"
            y2="36"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#FF8800" />
          </linearGradient>
        </defs>

        {/* Primary 4 Major Cardinal Rays */}
        <path
          d="M24 0L27.5 18L44 24L27.5 30L24 48L20.5 30L4 24L20.5 18L24 0Z"
          fill="url(#solarGoldGrad)"
        />

        {/* Diagonal 4 Minor Rays */}
        <path
          d="M24 10L26 21L37 24L26 27L24 38L22 27L11 24L22 21L24 10Z"
          fill="url(#solarGoldGrad)"
          opacity="0.85"
        />

        {/* Center Diamond Jewel */}
        <polygon
          points="24,19 29,24 24,29 19,24"
          fill="url(#solarInnerGrad)"
        />
      </svg>
    </div>
  );
}
