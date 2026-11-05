import dns from "node:dns";

if (typeof dns?.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

import { NextResponse } from "next/server";
import { SuiGrpcClient } from "@mysten/sui/grpc";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");
    const network = (searchParams.get("network") || "mainnet") as "testnet" | "mainnet";

    if (!address || !address.startsWith("0x")) {
      return NextResponse.json(
        { error: "Invalid Sui address. Must start with 0x." },
        { status: 400 }
      );
    }

    const baseUrl =
      network === "mainnet"
        ? "https://mysten-rpc.mainnet.sui.io"
        : "https://mysten-rpc.testnet.sui.io";

    const client = new SuiGrpcClient({ network, baseUrl });
    const balanceData = await client.getBalance({
      owner: address,
      coinType: "0x2::sui::SUI",
    });

    const mist =
      balanceData?.balance?.totalBalance ||
      balanceData?.balance?.balance ||
      "0";
    const balanceSui = Number(mist) / 1_000_000_000;

    return NextResponse.json({
      success: true,
      address,
      network,
      balanceSui,
      mist,
      isLive: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Sui RPC query failed";
    console.error("[Sui RPC] Error querying balance:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
