import type { Metadata, Viewport } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { PwaInstallProvider } from "@/components/pwa-install-provider";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-outfit",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  title: "Yearbound — Financial Resolve Wallet",
  description:
    "Set financial resolutions enforced on-chain by Wally, Walrus Memory, and Sui x402 escrow vaults.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Yearbound",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`dark min-h-full antialiased ${outfit.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-[#000000] text-[#F5F1EB] flex flex-col font-sans">
        <Script
          id="yb-intro-veil"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=window.location.pathname;if(p==='/'||p===''){var r=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;var f=window.location.search.indexOf('intro=1')!==-1;var s=sessionStorage.getItem('yearbound_intro_seen_v1')==='1';if(!r&&(f||!s)){document.documentElement.classList.add('yb-intro-active');setTimeout(function(){document.documentElement.classList.remove('yb-intro-active')},11000);}}}catch(e){}})();`,
          }}
        />
        <PwaInstallProvider>{children}</PwaInstallProvider>
      </body>
    </html>
  );
}
