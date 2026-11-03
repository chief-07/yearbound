import React from "react";

interface ProgressRingProps {
  progress: number; // e.g. 72
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function ProgressRing({
  progress = 72,
  size = 110,
  strokeWidth = 9,
  className = "",
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient
            id="ringGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#FFA500" />
            <stop offset="60%" stopColor="#FF5500" />
            <stop offset="100%" stopColor="#D82A00" />
          </linearGradient>
          <filter id="ringGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 120, 40, 0.12)"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress Foreground with Glow */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          filter="url(#ringGlow)"
          className="transition-all duration-1000 ease-out"
        />
      </svg>

      {/* Center Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xl font-bold tracking-tight text-white font-mono leading-none">
          {progress}%
        </span>
        <span className="text-[10px] text-neutral-400 font-medium tracking-wide mt-1">
          On Track
        </span>
      </div>
    </div>
  );
}
