import dns from "node:dns";

if (typeof dns?.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {}

import { NextResponse } from "next/server";
import { tatumService, type SuiNetwork } from "@/lib/tatum";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");
    const network = (searchParams.get("network") === "testnet" ? "testnet" : "mainnet") as SuiNetwork;

    if (!address || !address.startsWith("0x")) {
      return NextResponse.json(
        { error: "Invalid Sui address. Must start with 0x." },
        { status: 400 }
      );
    }

    const balanceSui = await tatumService.getSuiBalance(address, network);

    return NextResponse.json(
      {
        success: true,
        address,
        network,
        balanceSui,
        provider: `Tatum Sui ${network === "testnet" ? "Testnet" : "Mainnet"} Gateway`,
        isLive: true,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Sui balance query failed";
    console.warn("[Sui Balance API] Notice querying balance:", message);
    return NextResponse.json(
      {
        success: true,
        balanceSui: 0,
        isLive: false,
        notice: message,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  }
}
