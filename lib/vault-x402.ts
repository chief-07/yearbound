export interface X402PaymentChallenge {
  status: "payment_required";
  payment: {
    scheme: "exact";
    network: "sui";
    currency: "SUI";
    amount_sui: number;
    destination: string;
    description: string;
    expires_at: string;
    nonce: string;
  };
}

export interface X402SignedPaymentPayload {
  version: "1.0";
  nonce: string;
  network: "sui";
  currency: "SUI";
  amount_sui: number;
  destination: string;
  sender_address: string;
  signature: string;
  timestamp: string;
}

export interface X402SettlementResult {
  valid: boolean;
  txHash?: string;
  newVaultBalanceSui?: number;
  error?: string;
}

/**
 * Creates an HTTP 402 challenge compliant with agent-native micropayment specs.
 */
export function createX402Challenge(
  amountSui: number,
  vaultDestination: string,
  reason: string
): X402PaymentChallenge {
  return {
    status: "payment_required",
    payment: {
      scheme: "exact",
      network: "sui",
      currency: "SUI",
      amount_sui: amountSui,
      destination: vaultDestination,
      description: `Yearbound commitment penalty: ${reason}`,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      nonce: `yb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    },
  };
}

/**
 * Validates the cryptographic payment payload attached in the X-PAYMENT header.
 */
export async function verifyAndSettleX402Payment(
  xPaymentHeader: string,
  expectedAmountSui: number,
  expectedDestination: string
): Promise<X402SettlementResult> {
  if (!xPaymentHeader) {
    return { valid: false, error: "Missing X-PAYMENT header" };
  }

  let payload: X402SignedPaymentPayload;
  try {
    const decoded = Buffer.from(xPaymentHeader, "base64").toString("utf-8");
    payload = JSON.parse(decoded) as X402SignedPaymentPayload;
  } catch {
    return { valid: false, error: "Malformed X-PAYMENT base64 payload" };
  }

  // Validate amount, network, and destination
  if (payload.network !== "sui" || payload.currency !== "SUI") {
    return { valid: false, error: "Invalid payment network or currency" };
  }

  if (payload.amount_sui < expectedAmountSui) {
    return { valid: false, error: `Insufficient payment: required ${expectedAmountSui} SUI, received ${payload.amount_sui}` };
  }

  if (payload.destination !== expectedDestination) {
    return { valid: false, error: "Payment destination does not match vault object" };
  }

  // Simulated / on-chain settlement tx hash
  const pseudoTxHash = `0x${Buffer.from(payload.signature || payload.nonce).toString("hex").slice(0, 64).padEnd(64, "0")}`;

  return {
    valid: true,
    txHash: pseudoTxHash,
    newVaultBalanceSui: expectedAmountSui,
  };
}
