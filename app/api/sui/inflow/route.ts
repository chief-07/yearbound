import dns from "node:dns";

if (typeof dns?.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

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

    const metrics = await tatumService.getInflowMetrics(address, 30);
    const velocity = await tatumService.getSpendingVelocity(address, 24);

    return NextResponse.json({
      success: true,
      address,
      metrics,
      velocity,
      provider: "Tatum Sui Gateway (mainnet)",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to query Tatum inflows";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
