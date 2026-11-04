import { NextResponse } from "next/server";
import { walrusService, type CommitmentRulePayload } from "@/lib/walrus";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { rules, initialDepositSui = 10, unlockDate = "2026-12-25" } = body;

    if (!rules || !Array.isArray(rules) || rules.length === 0) {
      return NextResponse.json(
        { error: "At least one commitment rule is required." },
        { status: 400 }
      );
    }

    const commitmentId = `pact_${Date.now()}`;
    const results = [];

    // Store each rule as an immutable commitment memory in Walrus
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

    // Pick the primary blobId for confirmation display
    const primaryBlobId = results[0]?.blobId || `blob_${Math.random().toString(36).substring(2, 10)}`;

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
