import dns from "node:dns";

if (typeof dns?.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {}

import { NextRequest, NextResponse } from "next/server";
import {
  walrusService,
  type GenesisPactPayload,
  type CommitmentRulePayload,
  type AccountabilityEventPayload,
  type BehavioralPatternPayload,
} from "@/lib/walrus";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address") || "";

    console.log(`[Walrus Hydrate] Querying decentralized memory for address ${address || "default"}...`);

    // Concurrent typed recall of all core memory structures from Walrus using natural semantic search
    const [pacts, rules, events, patterns] = await Promise.all([
      walrusService.recallTyped<GenesisPactPayload>("genesis pact commitment resolution rules", "genesis_pact"),
      walrusService.recallTyped<CommitmentRulePayload>("commitment rule resolution boundary penalty", "commitment_rule"),
      walrusService.recallTyped<AccountabilityEventPayload>("accountability event transaction verdict honored broken", "accountability_event"),
      walrusService.recallTyped<BehavioralPatternPayload>("behavioral pattern habit cluster insight recommendation", "behavioral_pattern"),
    ]);

    const normalizedAddr = address.trim().toLowerCase();
    const isHexAddress = normalizedAddr.startsWith("0x");

    // Match pact for this specific address/pact ID (do not hijack another wallet's pact on a fresh address)
    const activePact = isHexAddress
      ? pacts.find((p) => p.wallet_address?.toLowerCase() === normalizedAddr) || null
      : pacts.find(
          (p) =>
            !normalizedAddr ||
            p.wallet_address?.toLowerCase() === normalizedAddr ||
            p.pact_id?.toLowerCase() === normalizedAddr
        ) ||
        pacts[0] ||
        null;

    // Filter rules associated with this user's active pact/address
    const activeRules = rules.filter((r) => {
      if (isHexAddress) {
        if (r.wallet_address?.toLowerCase() === normalizedAddr) return true;
        if (activePact && r.commitment_id === activePact.pact_id) return true;
        return false;
      }
      return (
        !activePact ||
        r.commitment_id === activePact.pact_id ||
        !r.wallet_address ||
        r.wallet_address.toLowerCase() === normalizedAddr
      );
    });

    // Filter events associated strictly with this user or active pact
    const matchedEvents = (events || []).filter((e) => {
      if (!normalizedAddr) return true;
      if (e.wallet_address && e.wallet_address.toLowerCase() === normalizedAddr) return true;
      if (activePact && e.commitment_id === activePact.pact_id) return true;
      return !isHexAddress;
    });

    // Filter patterns strictly by address when an address is provided
    const matchedPatterns = (patterns || []).filter((p) => {
      if (!isHexAddress) return true;
      return p.wallet_address?.toLowerCase() === normalizedAddr;
    });

    // Format events for client hydration
    const formattedEvents = matchedEvents.map((e, idx) => ({
      id: `walrus_evt_${idx}_${Date.now().toString(36)}`,
      ruleTitle: e.rule_title || "Yearbound Resolution",
      ruleCondition: e.user_explanation || "Adherence checked",
      amount: e.amount_sui ? String(e.amount_sui) : "15",
      memo: e.user_explanation,
      timestamp: e.timestamp,
      penaltySui: e.penalty_deposited_sui,
      blobId: `walrus_blob_${idx}_recalled`,
      verdict: e.verdict,
      recipient: e.recipient || "0x_recipient",
      txHash: e.vault_tx_hash,
      repeatCount: e.repeat_infraction_count,
      streakBroken: e.streak_broken,
      source: "timeline" as const,
    }));

    return NextResponse.json({
      success: true,
      hydratedFromWalrus: true,
      address,
      pact: activePact,
      rules: activeRules.length > 0 ? activeRules : null,
      events: formattedEvents,
      patterns: matchedPatterns,
      memoryStats: {
        pactsCount: pacts.length,
        rulesCount: activeRules.length,
        eventsCount: formattedEvents.length,
        patternsCount: matchedPatterns.length,
      },
      source: "Walrus Memory (MemWal Mainnet)",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Hydration error";
    console.warn("[Walrus Hydrate] Notice during recall:", message);
    return NextResponse.json({
      success: false,
      hydratedFromWalrus: false,
      error: message,
    });
  }
}
