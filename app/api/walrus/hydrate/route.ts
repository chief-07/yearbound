import dns from "node:dns";

if (typeof dns?.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

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

    // Match pacts or default to latest available
    const activePact = pacts.find((p) => !address || p.wallet_address === address) || pacts[0] || null;

    // Filter rules associated with this pact/address or return all active rules
    const activeRules = rules.filter(
      (r) => !activePact || r.commitment_id === activePact.pact_id || !r.wallet_address || r.wallet_address === address
    );

    // Format events for client hydration
    const formattedEvents = (events || []).map((e, idx) => ({
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
      patterns: patterns || [],
      memoryStats: {
        pactsCount: pacts.length,
        rulesCount: rules.length,
        eventsCount: events.length,
        patternsCount: patterns.length,
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
