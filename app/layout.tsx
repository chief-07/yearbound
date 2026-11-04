import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yearbound — Make a Pact With Your Future Self",
  description:
    "Autonomous AI commitment and accountability protocol. Enforcing behavioral rules with Sui escrow vaults, Walrus Memory, and x402 agent payments.",
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
    <html lang="en" className="dark h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@300;400;500;600;700&family=Syne:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-[#070403] text-[#F5F2EB] flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
