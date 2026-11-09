import dns from "node:dns";

if (typeof dns?.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {}

import { NextRequest, NextResponse } from "next/server";
import { tatumService } from "@/lib/tatum";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address") || "";

    if (!address) {
      return NextResponse.json(
        { success: false, error: "Address is required" },
        { status: 400 }
      );
    }

    const network = searchParams.get("network") === "testnet" ? "testnet" : "mainnet";

    const metrics = await tatumService.getInflowMetrics(address, 30, network);
    const velocity = await tatumService.getSpendingVelocity(address, 24, network);

    return NextResponse.json({
      success: true,
      address,
      network,
      metrics,
      velocity,
      provider: `Tatum Sui Gateway (${network})`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to query Tatum inflows";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
