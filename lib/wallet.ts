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

  const existingSecret = localStorage.getItem(REAL_WALLET_STORAGE_KEY);
  if (existingSecret) {
    try {
      // 1. Direct suiprivkey bech32 string
      if (existingSecret.startsWith("suiprivkey")) {
        const kp = Ed25519Keypair.fromSecretKey(existingSecret);
        return { keypair: kp, isNew: false };
      }

      // 2. Raw hex or legacy ASCII buffer
      const raw = fromHex(existingSecret.startsWith("0x") ? existingSecret.slice(2) : existingSecret);
      if (raw.length === 32) {
        const kp = Ed25519Keypair.fromSecretKey(raw);
        return { keypair: kp, isNew: false };
      }
      
      const decodedStr = new TextDecoder().decode(raw);
      if (decodedStr.startsWith("suiprivkey")) {
        const kp = Ed25519Keypair.fromSecretKey(decodedStr);
        return { keypair: kp, isNew: false };
      }
    } catch (err) {
      console.warn("[Wallet] Failed to restore real keypair from storage, generating new one:", err);
    }
  }

  const newKp = new Ed25519Keypair();
  const secretKeyStr = newKp.getSecretKey();

  try {
    localStorage.setItem(REAL_WALLET_STORAGE_KEY, secretKeyStr);
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
// SUI BROWSER WALLET EXTENSION INTEGRATION
// Auto-detects installed Sui Wallet Standard extensions (Sui Wallet, Nightly, Slingshot)
// -----------------------------------------------------------------------------
export interface InstalledSuiWallet {
  name: string;
  provider: any;
}

export function detectInstalledSuiWallet(): InstalledSuiWallet | null {
  if (typeof window === "undefined") return null;

  const win = window as any;

  if (win.suiWallet) {
    return { name: "Sui Wallet", provider: win.suiWallet };
  }
  if (win.slingshot) {
    return { name: "Slingshot", provider: win.slingshot };
  }
  if (win.nightly?.sui) {
    return { name: "Nightly", provider: win.nightly.sui };
  }
  if (win.suiet) {
    return { name: "Suiet", provider: win.suiet };
  }

  return null;
}

export async function connectExtensionWallet(): Promise<{ address: string; walletName: string }> {
  const detected = detectInstalledSuiWallet();
  if (!detected) {
    throw new Error("No compatible Sui wallet extension detected in this browser.");
  }

  const { provider, name } = detected;

  try {
    if (typeof provider.requestPermissions === "function") {
      await provider.requestPermissions();
    }
  } catch (err) {
    console.warn("[Wallet] Permission request bypassed or rejected:", err);
  }

  let accounts: any[] = [];
  if (typeof provider.getAccounts === "function") {
    accounts = await provider.getAccounts();
  }

  if (!accounts || accounts.length === 0) {
    throw new Error("No accounts found in wallet extension or connection was declined.");
  }

  const rawAddress = typeof accounts[0] === "string" ? accounts[0] : accounts[0]?.address;
  if (!rawAddress) {
    throw new Error("Could not extract account address from wallet extension.");
  }

  return {
    address: rawAddress,
    walletName: name,
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
  if (mode === "demo") {
    const kp = getDemoKeypair();
    const signed = await kp.signPersonalMessage(message);
    return {
      signature: signed.signature,
      publicKey: kp.getPublicKey().toBase64(),
      address: kp.toSuiAddress(),
    };
  }

  if (mode === "real") {
    const kp = getOrCreateRealKeypair().keypair;
    const signed = await kp.signPersonalMessage(message);
    return {
      signature: signed.signature,
      publicKey: kp.getPublicKey().toBase64(),
      address: kp.toSuiAddress(),
    };
  }

  // Linked external extension mode
  const detected = detectInstalledSuiWallet();
  if (detected?.provider && typeof detected.provider.signPersonalMessage === "function") {
    try {
      const signed = await detected.provider.signPersonalMessage({ message });
      return {
        signature: signed.signature || "ext_signed",
        publicKey: signed.publicKey || "ext_pk",
        address: signed.address || "",
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "User rejected signature in extension";
      throw new Error(`Extension signature failed: ${msg}`);
    }
  }

  throw new Error("Signing with an external address requires a connected Sui wallet extension.");
}
