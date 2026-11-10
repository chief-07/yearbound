import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import YearboundApp from "@/components/yearbound-app";

export const metadata: Metadata = {
  title: "App — Yearbound",
  description:
    "Set your financial resolutions, lock accountability escrow on Sui, and verify spend through Wally and Walrus Memory.",
};

export default function WalletAppPage() {
  return (
    <>
      <YearboundApp />
      <Link
        href="/"
        className="fixed top-6 left-7 z-40 hidden md:inline-flex items-center gap-1.5 text-xs font-medium text-[#F5F1EB]/55 hover:text-[#ebaf64] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ebaf64] rounded px-2 py-1.5"
      >
        <ArrowLeft size={14} />
        <span>Yearbound</span>
      </Link>
    </>
  );
}
