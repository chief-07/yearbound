import dns from "node:dns";

if (typeof dns?.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {}

import { NextResponse } from "next/server";
import { requestSuiFromFaucetV3, getFaucetHost } from "@mysten/sui/faucet";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { address, network = "testnet" } = body;

    if (!address || typeof address !== "string" || !address.startsWith("0x")) {
      return NextResponse.json(
        { success: false, error: "Valid Sui address (0x...) is required" },
        { status: 400 }
      );
    }

    if (network !== "testnet" && network !== "devnet") {
      return NextResponse.json(
        { success: false, error: "Faucet is only available on testnet or devnet" },
        { status: 400 }
      );
    }

    const host = getFaucetHost(network);
    const faucetResult = await requestSuiFromFaucetV3({
      host,
      recipient: address,
      timeout: 90000,
    });

    const amountMist = faucetResult.amountMist || "1000000000";
    const amountSui = Number(amountMist) / 1_000_000_000;

    return NextResponse.json({
      success: true,
      address,
      network,
      digest: faucetResult.digest,
      amountMist,
      amountSui,
      explorerUrl: `https://suiscan.xyz/${network}/tx/${faucetResult.digest}`,
      message: `Successfully received ${amountSui} SUI on ${network}.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Faucet request failed";
    console.warn("[Sui Faucet API] Notice:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
