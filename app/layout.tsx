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
      <body className="min-h-full bg-neutral-950 text-neutral-100 flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
