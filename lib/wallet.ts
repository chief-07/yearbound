import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromHex, toHex } from "@mysten/sui/utils";

export type WalletMode = "demo" | "real" | "linked";

export interface WalletInfo {
  mode: WalletMode;
  address: string;
  publicKeyBase64: string;
  hasSigner: boolean;
  network: "testnet" | "mainnet";
}

// -----------------------------------------------------------------------------
// DETERMINISTIC DEMO WALLET
// Always derives the exact same cryptographic Ed25519 keypair from a constant seed.
// This guarantees Demo mode is a 100% REAL cryptographic Sui wallet capable of signing.
// -----------------------------------------------------------------------------
const DEMO_SEED_HEX = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";

export function getDemoKeypair(): Ed25519Keypair {
  const seedBytes = fromHex(DEMO_SEED_HEX);
  return Ed25519Keypair.fromSecretKey(seedBytes);
}

export const DEMO_SUI_ADDRESS = "0xc3566d06a7384723209d9ed87fff4c7d867b83b839fc0efa43de6981f59e59bc";

export function getDemoWalletInfo(): WalletInfo {
  const kp = getDemoKeypair();
  return {
    mode: "demo",
    address: DEMO_SUI_ADDRESS,
    publicKeyBase64: kp.getPublicKey().toBase64(),
    hasSigner: true,
    network: "testnet",
  };
}

// -----------------------------------------------------------------------------
// PERSISTENT LIVE / REAL BURNER WALLET
// Stored in localStorage so it persists across refreshes and sessions.
// User can inspect, export the private key, or fund it via testnet/mainnet.
// -----------------------------------------------------------------------------
const REAL_WALLET_STORAGE_KEY = "yearbound_real_wallet_secret_v1";

export function getOrCreateRealKeypair(): { keypair: Ed25519Keypair; isNew: boolean } {
  if (typeof window === "undefined") {
    const kp = new Ed25519Keypair();
    return { keypair: kp, isNew: true };
  }

  const existingHex = localStorage.getItem(REAL_WALLET_STORAGE_KEY);
  if (existingHex) {
    try {
      const bytes = fromHex(existingHex);
      const kp = Ed25519Keypair.fromSecretKey(bytes);
      return { keypair: kp, isNew: false };
    } catch (err) {
      console.warn("[Wallet] Failed to restore real keypair from storage, generating new one:", err);
    }
  }

  const newKp = new Ed25519Keypair();
  const secretBytes = newKp.getSecretKey();
  // SecretKey can be a bech32 string or raw bytes depending on SDK version
  const secretHex = typeof secretBytes === "string" 
    ? Buffer.from(secretBytes).toString("hex")
    : toHex(secretBytes);

  try {
    localStorage.setItem(REAL_WALLET_STORAGE_KEY, secretHex);
  } catch (err) {
    console.warn("[Wallet] Could not persist real keypair to localStorage:", err);
  }

  return { keypair: newKp, isNew: true };
}

export function exportRealPrivateKeyHex(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REAL_WALLET_STORAGE_KEY);
}

export function getRealWalletInfo(): WalletInfo {
  const { keypair } = getOrCreateRealKeypair();
  return {
    mode: "real",
    address: keypair.toSuiAddress(),
    publicKeyBase64: keypair.getPublicKey().toBase64(),
    hasSigner: true,
    network: "testnet",
  };
}

// -----------------------------------------------------------------------------
// CRYPTOGRAPHIC SIGNING ABSTRACTION
// Allows signing personal messages or x402 authorization payloads.
// -----------------------------------------------------------------------------
export async function signPayloadWithWallet(
  mode: WalletMode,
  message: Uint8Array
): Promise<{ signature: string; publicKey: string; address: string }> {
  let kp: Ed25519Keypair;

  if (mode === "demo") {
    kp = getDemoKeypair();
  } else if (mode === "real") {
    kp = getOrCreateRealKeypair().keypair;
  } else {
    throw new Error("Linked external wallet signing requires wallet extension adapter.");
  }

  const signed = await kp.signPersonalMessage(message);
  return {
    signature: signed.signature,
    publicKey: kp.getPublicKey().toBase64(),
    address: kp.toSuiAddress(),
  };
}
