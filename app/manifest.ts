import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: "Yearbound — Financial Resolve Wallet",
    short_name: "Yearbound",
    description:
      "Set personal spending rules backed by Walrus Memory and Sui escrow vaults locked until December 25.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#000000",
    theme_color: "#EBAF64",
    categories: ["finance", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/assets/bg/midnight_walrus.png",
        sizes: "576x1024",
        type: "image/png",
        form_factor: "narrow",
        label: "Midnight Wally by the lake — Yearbound financial resolve",
      },
      {
        src: "/assets/onboarding/walrus_memory.png",
        sizes: "576x1024",
        type: "image/png",
        form_factor: "narrow",
        label: "Wally recalls your spending commitments in Walrus Memory",
      },
      {
        src: "/assets/onboarding/walrus_vault.png",
        sizes: "576x1024",
        type: "image/png",
        form_factor: "narrow",
        label: "Escrowed penalties lock until December 25",
      },
      {
        src: "/assets/onboarding/walrus_bench.png",
        sizes: "576x1024",
        type: "image/png",
        form_factor: "narrow",
        label: "Pause and verify intent before every transfer",
      },
      {
        src: "/assets/bg/starry_sky.png",
        sizes: "576x1024",
        type: "image/png",
        form_factor: "narrow",
        label: "Yearbound midnight background",
      },
      {
        src: "/wally_concept.jpg",
        sizes: "1376x768",
        type: "image/jpeg",
        form_factor: "wide",
        label: "Yearbound desktop wallet and December 25 vault overview",
      },
    ],
  };
}
