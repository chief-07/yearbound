import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Yearbound — Financial Resolve Wallet",
  description:
    "Set financial resolutions enforced on-chain by Wally, Walrus Memory, and Sui escrow vaults.",
  icons: {
    icon: "/favicon.ico",
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=window.location.pathname;if(p==='/'||p===''){var r=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;var f=window.location.search.indexOf('intro=1')!==-1;var s=sessionStorage.getItem('yearbound_intro_seen_v1')==='1';if(!r&&(f||!s)){document.documentElement.classList.add('yb-intro-active');setTimeout(function(){document.documentElement.classList.remove('yb-intro-active')},11000);}}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#000000] text-[#F5F1EB] flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
