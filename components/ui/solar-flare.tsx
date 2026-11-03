import React from "react";

interface SolarFlareProps {
  surge?: boolean;
  className?: string;
}

export function SolarFlare({ surge = false, className = "" }: SolarFlareProps) {
  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none select-none z-0 ${className}`}
      aria-hidden="true"
    >
      {/* 1. Base Dark Void Ground */}
      <div className="absolute inset-0 bg-[#070403]" />

      {/* 2. Deep Volumetric Ambient Glow from Horizon */}
      <div
        className={`absolute -bottom-48 left-1/2 -translate-x-1/2 w-[1200px] h-[900px] rounded-full blur-[120px] transition-all duration-1000 ${
          surge
            ? "opacity-95 scale-110 bg-[radial-gradient(ellipse_at_center,#FFE082_0%,#FF5E00_45%,#B21E00_70%,transparent_100%)]"
            : "opacity-75 bg-[radial-gradient(ellipse_at_center,#FFA826_0%,#E04400_40%,#7A1200_75%,transparent_100%)]"
        }`}
      />

      {/* 3. Collimated Vertical Beams (The Rocket / Solar Flare Rays) */}
      <div className="absolute inset-0 flex items-end justify-center">
        {/* Central Vertical Pillar of Incandescent Light */}
        <div
          className={`w-[120px] md:w-[220px] h-[130%] bg-gradient-to-t from-[#FFF4CC] via-[#FF6600] to-transparent blur-[32px] transform -translate-y-16 animate-flare-breathe ${
            surge ? "opacity-100 blur-[24px]" : "opacity-85"
          }`}
          style={{
            clipPath: "polygon(40% 0%, 60% 0%, 85% 100%, 15% 100%)",
          }}
        />

        {/* Flanking Angled Ray 1 (Left Inner) */}
        <div
          className="w-[90px] md:w-[160px] h-[115%] bg-gradient-to-t from-[#FF7A00] via-[#C82A00] to-transparent blur-[40px] transform -translate-x-32 -rotate-12 animate-rays-sway opacity-70"
          style={{
            clipPath: "polygon(45% 0%, 55% 0%, 90% 100%, 10% 100%)",
            animationDelay: "-2s",
          }}
        />

        {/* Flanking Angled Ray 2 (Right Inner) */}
        <div
          className="w-[90px] md:w-[160px] h-[115%] bg-gradient-to-t from-[#FF7A00] via-[#C82A00] to-transparent blur-[40px] transform translate-x-32 rotate-12 animate-rays-sway opacity-70"
          style={{
            clipPath: "polygon(45% 0%, 55% 0%, 90% 100%, 10% 100%)",
            animationDelay: "-5s",
          }}
        />

        {/* Outer Wide Ray 3 (Left Outer) */}
        <div
          className="w-[140px] md:w-[240px] h-[95%] bg-gradient-to-t from-[#FF5500] via-[#851200] to-transparent blur-[56px] transform -translate-x-72 -rotate-25 opacity-45"
          style={{
            clipPath: "polygon(42% 0%, 58% 0%, 95% 100%, 5% 100%)",
          }}
        />

        {/* Outer Wide Ray 4 (Right Outer) */}
        <div
          className="w-[140px] md:w-[240px] h-[95%] bg-gradient-to-t from-[#FF5500] via-[#851200] to-transparent blur-[56px] transform translate-x-72 rotate-25 opacity-45"
          style={{
            clipPath: "polygon(42% 0%, 58% 0%, 95% 100%, 5% 100%)",
          }}
        />
      </div>

      {/* 4. Blinding Horizon Core (Hot Spot at Bottom Center) */}
      <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-[340px] md:w-[580px] h-[140px] md:h-[220px] bg-gradient-to-t from-[#FFFFFF] via-[#FFD066] to-transparent rounded-[100%] blur-[24px] opacity-90" />

      {/* 5. Bottom Atmospheric Fog / Silhouette Curve */}
      <div className="absolute bottom-0 inset-x-0 h-44 bg-gradient-to-t from-[#070403] via-[#070403]/70 to-transparent" />

      {/* 6. Subtle Noise / Texture Overlay */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />
    </div>
  );
}
