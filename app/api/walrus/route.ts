import { NextResponse } from "next/server";
import {
  walrusService,
  type CommitmentRulePayload,
  type AccountabilityEventPayload,
} from "@/lib/walrus";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Handling Accountability Event / Infraction Logging
    if (body.type === "accountability_event") {
      const payload: AccountabilityEventPayload = {
        type: "accountability_event",
        commitment_id: body.commitment_id || "pact_primary",
        verdict: body.verdict || "broken",
        user_explanation: body.user_explanation || "No explanation provided",
        penalty_deposited_sui: Number(body.penalty_deposited_sui) || 10,
        vault_tx_hash: body.vault_tx_hash || `0x_sui_ptb_${Date.now().toString(16)}`,
        timestamp: new Date().toISOString(),
      };

      const rememberResult = await walrusService.remember(payload);
      return NextResponse.json({
        success: true,
        blobId: rememberResult.blobId,
        jobId: rememberResult.jobId,
        payload,
        isMock: walrusService.getIsMock(),
      });
    }

    // 2. Handling Initial Commitment Rules Storage
    const { rules, initialDepositSui = 10, unlockDate = "2026-12-25" } = body;

    if (!rules || !Array.isArray(rules) || rules.length === 0) {
      return NextResponse.json(
        { error: "At least one commitment rule is required." },
        { status: 400 }
      );
    }

    const commitmentId = `pact_${Date.now()}`;
    const results = [];

    for (const rule of rules) {
      const payload: CommitmentRulePayload = {
        type: "commitment_rule",
        commitment_id: commitmentId,
        title: rule.title || "Untitled Rule",
        description: rule.condition || "",
        category: "custom",
        penalty_amount_sui: Number(rule.penalty) || 5,
        cadence: "event_based",
        exceptions: [],
        created_at: new Date().toISOString(),
        status: "active",
      };

      const rememberResult = await walrusService.remember(payload);
      results.push({
        ruleId: rule.id,
        blobId: rememberResult.blobId,
        jobId: rememberResult.jobId,
      });
    }

    const primaryBlobId =
      results[0]?.blobId || `blob_${Math.random().toString(36).substring(2, 10)}`;

    return NextResponse.json({
      success: true,
      commitmentId,
      primaryBlobId,
      storedRulesCount: results.length,
      initialDepositSui,
      unlockDate,
      isMock: walrusService.getIsMock(),
      timestamp: new Date().toISOString(),
      blobs: results,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Walrus storage error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
