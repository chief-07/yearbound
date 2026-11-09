import { isValidSuiAddress } from "@mysten/sui/utils";
import {
  YEARBOUND_VAULT_ADDRESS,
  YEARBOUND_TESTNET_VAULT_ADDRESS,
} from "./vault-x402";
import type { WalletMode } from "./wallet";

export const DEFAULT_GENESIS_PLEDGE_SUI = 0.20;
export const MAINNET_MIN_GAS_BUFFER_SUI = 0.002;
export const MAINNET_DUAL_TX_GAS_BUFFER_SUI = 0.005;

export interface VaultDisplayState {
  totalLockedSui: number;
  initialPledgeSui: number;
  infractionTollsSui: number;
  explorerNetwork: "testnet" | "mainnet";
  vaultContractAddress: string;
  explorerAccountUrl: string;
  canFundGenesisPledge: boolean;
  isUnfundedMainnetVault: boolean;
  settlementGatewayLabel: string;
}

export function getVaultDisplayState(params: {
  accountType: WalletMode;
  escrowDeposit: number;
  initialPledgeSui: number;
  availableBalance: number;
  isDegradedMode?: boolean;
  targetGenesisPledgeSui?: number;
}): VaultDisplayState {
  const isTestnetDemo = params.accountType === "demo";
  const targetPledge = params.targetGenesisPledgeSui ?? DEFAULT_GENESIS_PLEDGE_SUI;

  const safeEscrow =
    typeof params.escrowDeposit === "number" && Number.isFinite(params.escrowDeposit)
      ? Math.max(0, params.escrowDeposit)
      : 0;
  const safeInitial =
    typeof params.initialPledgeSui === "number" && Number.isFinite(params.initialPledgeSui)
      ? Math.max(0, params.initialPledgeSui)
      : 0;

  const infractionTollsSui = Math.max(0, Number((safeEscrow - safeInitial).toFixed(4)));
  const explorerNetwork = isTestnetDemo ? "testnet" : "mainnet";
  const vaultContractAddress = isTestnetDemo
    ? YEARBOUND_TESTNET_VAULT_ADDRESS
    : YEARBOUND_VAULT_ADDRESS;

  const safeAvailable =
    typeof params.availableBalance === "number" && Number.isFinite(params.availableBalance)
      ? Math.max(0, params.availableBalance)
      : 0;

  const canFundGenesisPledge =
    !isTestnetDemo &&
    !params.isDegradedMode &&
    safeInitial === 0 &&
    safeAvailable >= targetPledge + MAINNET_DUAL_TX_GAS_BUFFER_SUI;

  const settlementGatewayLabel = params.isDegradedMode
    ? "Offline (Tatum disabled)"
    : params.accountType === "real"
    ? "Tatum Sui Mainnet Gateway (Live On-Chain)"
    : params.accountType === "linked"
    ? "Sui Wallet Standard (Mainnet)"
    : "Tatum Sui Testnet Gateway (Live On-Chain)";

  return {
    totalLockedSui: safeEscrow,
    initialPledgeSui: safeInitial,
    infractionTollsSui,
    explorerNetwork,
    vaultContractAddress,
    explorerAccountUrl: `https://suiscan.xyz/${explorerNetwork}/account/${vaultContractAddress}`,
    canFundGenesisPledge,
    isUnfundedMainnetVault: !isTestnetDemo && safeEscrow === 0,
    settlementGatewayLabel,
  };
}

export function checkMainnetTransferReadiness(params: {
  accountType: WalletMode;
  amountSui: number;
  availableBalance: number;
  recipient: string;
}): { ready: boolean; reason?: string } {
  const amt = Number.isFinite(params.amountSui) ? params.amountSui : 0;
  const bal = Number.isFinite(params.availableBalance) ? params.availableBalance : 0;
  const trimmedRecipient = (params.recipient || "").trim();

  if (amt <= 0) {
    return { ready: false, reason: "Enter an amount above 0 SUI" };
  }

  if (bal <= 0 || amt > bal) {
    return { ready: false, reason: "Insufficient SUI Balance" };
  }

  if (params.accountType === "real" || params.accountType === "linked") {
    if (amt + MAINNET_MIN_GAS_BUFFER_SUI > bal) {
      return {
        ready: false,
        reason: `Keep at least ${MAINNET_MIN_GAS_BUFFER_SUI} SUI for Mainnet gas fees`,
      };
    }

    if (!trimmedRecipient) {
      return { ready: false, reason: "Enter a valid 0x Sui Mainnet address" };
    }

    if (!isValidSuiAddress(trimmedRecipient)) {
      return {
        ready: false,
        reason: "Enter a valid 0x Sui address for Mainnet transfer",
      };
    }
  } else if (!trimmedRecipient) {
    return { ready: false, reason: "Enter a Sui address or contact name" };
  }

  return { ready: true };
}

export function checkMainnetPenaltySolvency(params: {
  accountType: WalletMode;
  transferAmountSui: number;
  penaltyAmountSui: number;
  availableBalance: number;
}): { ok: boolean; requiredSui: number; reason?: string } {
  if (params.accountType === "demo") {
    return { ok: true, requiredSui: 0 };
  }

  const transferAmt = Math.max(0, Number(params.transferAmountSui) || 0);
  const penaltyAmt = Math.max(0, Number(params.penaltyAmountSui) || 0);
  const bal = Math.max(0, Number(params.availableBalance) || 0);
  const requiredSui = Number((transferAmt + penaltyAmt + MAINNET_DUAL_TX_GAS_BUFFER_SUI).toFixed(4));

  if (bal < requiredSui) {
    return {
      ok: false,
      requiredSui,
      reason: `Insufficient Mainnet SUI: need ${requiredSui.toFixed(3)} SUI for transfer + penalty + gas (${bal.toFixed(
        3
      )} SUI available).`,
    };
  }

  return { ok: true, requiredSui };
}
