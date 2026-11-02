import { NextResponse } from "next/server";
import {
  createX402Challenge,
  verifyAndSettleX402Payment,
} from "@/lib/vault-x402";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount_sui, commitment_id, reason } = body;

    const penaltyAmount = Number(amount_sui);
    if (!penaltyAmount || penaltyAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid penalty amount. Must be greater than 0 SUI." },
        { status: 400 }
      );
    }

    const vaultDestination = process.env.VAULT_OBJECT_ID || "0x_yearbound_default_vault";
    const xPaymentHeader = req.headers.get("x-payment");

    // Step 1: If no payment signature provided, return HTTP 402 challenge
    if (!xPaymentHeader) {
      const challenge = createX402Challenge(
        penaltyAmount,
        vaultDestination,
        reason || "Broken commitment penalty"
      );
      return NextResponse.json(challenge, {
        status: 402,
        headers: {
          "WWW-Authenticate": 'x402 realm="Yearbound Sui Escrow Vault"',
        },
      });
    }

    // Step 2: Verify signed x402 payment header and settle
    const settlement = await verifyAndSettleX402Payment(
      xPaymentHeader,
      penaltyAmount,
      vaultDestination
    );

    if (!settlement.valid) {
      return NextResponse.json(
        { error: settlement.error || "Payment verification failed" },
        { status: 400 }
      );
    }

    // Step 3: Return 200 OK with on-chain confirmation
    return NextResponse.json({
      status: "deposited",
      tx_hash: settlement.txHash,
      deposited_amount_sui: penaltyAmount,
      vault_destination: vaultDestination,
      commitment_id: commitment_id || null,
      reason: reason || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Vault processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
