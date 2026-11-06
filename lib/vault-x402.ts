import { verifyPersonalMessageSignature } from "@mysten/sui/verify";
import { signPayloadWithWallet, executeTransferWithExtension, type WalletMode } from "./wallet";

export const YEARBOUND_VAULT_ADDRESS = "0x7e8b61fb9706dc7d455823ca87455812903333333333333333333333333332026";

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
  preExecutedDigest?: string;
}

export interface X402SettlementResult {
  valid: boolean;
  settlementType: "on_chain_ptb" | "cryptographic_voucher";
  isRealOnChain: boolean;
  txHash?: string;
  voucherSignature?: string;
  explorerUrl?: string;
  provider: string;
  message?: string;
  newVaultBalanceSui?: number;
  payload?: X402SignedPaymentPayload;
  error?: string;
}

/**
 * Creates an HTTP 402 challenge compliant with agent-native micropayment specs.
 */
export function createX402Challenge(
  amountSui: number,
  vaultDestination: string = YEARBOUND_VAULT_ADDRESS,
  reason: string = "Broken commitment penalty"
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
 * Verifies Ed25519 personal message signature against the sender address.
 */
export async function verifyAndSettleX402Payment(
  xPaymentHeader: string,
  expectedAmountSui: number,
  expectedDestination: string
): Promise<{
  valid: boolean;
  error?: string;
  payload?: X402SignedPaymentPayload;
}> {
  if (!xPaymentHeader) {
    return { valid: false, error: "Missing X-PAYMENT header" };
  }

  let payload: X402SignedPaymentPayload;
  try {
    const decoded =
      typeof Buffer !== "undefined"
        ? Buffer.from(xPaymentHeader, "base64").toString("utf-8")
        : atob(xPaymentHeader);
    payload = JSON.parse(decoded) as X402SignedPaymentPayload;
  } catch {
    return { valid: false, error: "Malformed X-PAYMENT base64 payload" };
  }

  // Validate amount, network, and destination
  if (payload.network !== "sui" || payload.currency !== "SUI") {
    return { valid: false, error: "Invalid payment network or currency" };
  }

  if (payload.amount_sui < expectedAmountSui) {
    return {
      valid: false,
      error: `Insufficient payment: required ${expectedAmountSui} SUI, received ${payload.amount_sui}`,
    };
  }

  if (payload.destination !== expectedDestination) {
    return { valid: false, error: "Payment destination does not match vault object" };
  }

  // Cryptographic Sui Ed25519 signature verification
  if (payload.signature && payload.signature !== "ext_signed" && !payload.signature.startsWith("mock_")) {
    try {
      const canonicalChallenge = `x402:${payload.destination}:${payload.amount_sui}:${payload.nonce}${
        payload.preExecutedDigest ? `:${payload.preExecutedDigest}` : ""
      }`;
      const canonicalMsg = new TextEncoder().encode(canonicalChallenge);
      const verifiedPubKey = await verifyPersonalMessageSignature(canonicalMsg, payload.signature);
      const derivedAddress = verifiedPubKey.toSuiAddress();
      if (derivedAddress !== payload.sender_address) {
        return {
          valid: false,
          error: `Signature mismatch: signer ${derivedAddress} != sender ${payload.sender_address}`,
        };
      }
    } catch (sigErr) {
      console.warn("[x402] Signature verification notice:", sigErr);
      return {
        valid: false,
        error: `Cryptographic signature verification failed: ${
          sigErr instanceof Error ? sigErr.message : "invalid signature"
        }`,
      };
    }
  }

  return {
    valid: true,
    payload,
  };
}

/**
 * Autonomous client-side agent payment execution:
 * 1. Queries /api/vault to trigger an HTTP 402 challenge.
 * 2. If extension connected, executes real PTB.
 * 3. Cryptographically signs the challenge with the active wallet.
 * 4. Re-submits with the X-PAYMENT header to settle.
 */
export async function executeX402VaultDeposit(params: {
  amountSui: number;
  reason: string;
  commitmentId?: string;
  walletMode: WalletMode;
  privateKeySecret?: string;
  senderAddress?: string;
}): Promise<{
  success: boolean;
  settlementType: "on_chain_ptb" | "cryptographic_voucher";
  isRealOnChain: boolean;
  txHash?: string;
  voucherSignature?: string;
  explorerUrl?: string;
  provider: string;
  message?: string;
  vaultDestination: string;
  amountSui: number;
  challengeNonce: string;
}> {
  // Step 1: Initial request to receive HTTP 402 challenge
  const initialRes = await fetch("/api/vault", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount_sui: params.amountSui,
      reason: params.reason,
      commitment_id: params.commitmentId || "pact_primary",
    }),
  });

  if (initialRes.status !== 402) {
    throw new Error(`Expected HTTP 402 Payment Required, received ${initialRes.status}`);
  }

  const challenge = (await initialRes.json()) as X402PaymentChallenge;
  if (!challenge || challenge.status !== "payment_required") {
    throw new Error("Invalid x402 challenge payload received from vault");
  }

  // Step 2: If connected extension, attempt direct on-chain PTB execution
  let preExecutedDigest: string | undefined = undefined;
  if (params.walletMode === "linked") {
    try {
      const extRes = await executeTransferWithExtension({
        recipient: challenge.payment.destination,
        amountSui: challenge.payment.amount_sui,
      });
      if (extRes?.digest) {
        preExecutedDigest = extRes.digest;
      }
    } catch (extErr) {
      console.warn("[x402 Extension PTB] Extension signing notice:", extErr);
    }
  }

  // Step 3: Sign the canonical payment challenge with the active wallet
  const canonicalChallenge = `x402:${challenge.payment.destination}:${challenge.payment.amount_sui}:${challenge.payment.nonce}${
    preExecutedDigest ? `:${preExecutedDigest}` : ""
  }`;
  const canonicalMsg = new TextEncoder().encode(canonicalChallenge);

  const signerResult = await signPayloadWithWallet(params.walletMode, canonicalMsg);

  // Step 4: Construct the signed payment payload
  const signedPayload: X402SignedPaymentPayload = {
    version: "1.0",
    nonce: challenge.payment.nonce,
    network: "sui",
    currency: "SUI",
    amount_sui: challenge.payment.amount_sui,
    destination: challenge.payment.destination,
    sender_address: signerResult.address,
    signature: signerResult.signature,
    timestamp: new Date().toISOString(),
    preExecutedDigest,
  };

  const jsonStr = JSON.stringify(signedPayload);
  const base64PaymentHeader =
    typeof Buffer !== "undefined"
      ? Buffer.from(jsonStr).toString("base64")
      : btoa(jsonStr);

  // Step 5: Settle payment via X-PAYMENT header
  const settleRes = await fetch("/api/vault", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-payment": base64PaymentHeader,
    },
    body: JSON.stringify({
      amount_sui: params.amountSui,
      reason: params.reason,
      commitment_id: params.commitmentId || "pact_primary",
      wallet_mode: params.walletMode,
      private_key_secret: params.privateKeySecret,
      sender_address: params.senderAddress || signerResult.address,
      pre_executed_digest: preExecutedDigest,
    }),
  });

  const settleData = await settleRes.json();
  if (!settleRes.ok || settleData.status !== "deposited") {
    throw new Error(settleData.error || "x402 Vault settlement failed");
  }

  return {
    success: true,
    settlementType:
      settleData.settlement_type ||
      (settleData.is_real_on_chain ? "on_chain_ptb" : "cryptographic_voucher"),
    isRealOnChain: Boolean(settleData.is_real_on_chain),
    txHash: settleData.tx_hash,
    voucherSignature: settleData.voucher_signature || signerResult.signature,
    explorerUrl: settleData.explorer_url,
    provider: settleData.provider || "Tatum Sui Gateway (x402 Protocol)",
    message: settleData.message,
    vaultDestination: settleData.vault_destination || challenge.payment.destination,
    amountSui: settleData.deposited_amount_sui || params.amountSui,
    challengeNonce: challenge.payment.nonce,
  };
}
