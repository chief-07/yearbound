import dns from "node:dns";

// Windows IPv4 lookup precedence to avoid ENOTFOUND on Railway/Walrus relayer
if (typeof dns?.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {}

import { NextResponse } from "next/server";
import {
  walrusService,
  type CommitmentRulePayload,
  type GenesisPactPayload,
  type AccountabilityEventPayload,
  type BehavioralPatternPayload,
} from "@/lib/walrus";
import { analyzeMultipleResolutions } from "@/lib/ai-resolution-parser";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Handling Accountability Event / Infraction Logging
    if (body.type === "accountability_event") {
      const payload: AccountabilityEventPayload = {
        type: "accountability_event",
        commitment_id: body.commitment_id || "pact_primary",
        rule_id: body.rule_id,
        rule_title: body.rule_title,
        verdict: body.verdict || "broken",
        user_explanation: body.user_explanation || "No explanation provided",
        penalty_deposited_sui: Number.isFinite(Number(body.penalty_deposited_sui))
          ? Number(body.penalty_deposited_sui)
          : 0.05,
        vault_tx_hash: body.vault_tx_hash || undefined,
        voucher_signature: body.voucher_signature || undefined,
        settlement_type: body.settlement_type || (body.vault_tx_hash ? "on_chain_ptb" : "cryptographic_voucher"),
        is_real_on_chain: Boolean(body.is_real_on_chain),
        explorer_url: body.explorer_url || undefined,
        timestamp: new Date().toISOString(),
        recipient: body.recipient,
        amount_sui: Number(body.amount_sui) || undefined,
        repeat_infraction_count: Number(body.repeat_infraction_count) || undefined,
        streak_broken: Boolean(body.streak_broken),
        wallet_address: body.wallet_address,
      };

      // Rapid timeout (3500ms) prevents UI stall while ensuring blob assignment
      const rememberResult = await walrusService.remember(payload, 3500);
      return NextResponse.json({
        success: true,
        blobId: rememberResult.blobId,
        jobId: rememberResult.jobId,
        payload,
        isMock: walrusService.getIsMock(),
      });
    }

    // 1B. Handling Autonomous Behavioral Pattern Inscription
    if (body.type === "behavioral_pattern") {
      const payload: BehavioralPatternPayload = {
        type: "behavioral_pattern",
        pattern_title: body.pattern_title || "Recurring Spending Pattern",
        observation: body.observation || "Habit cluster observed across historical transactions",
        recommended_intervention: body.recommended_intervention || "Increase vault lock stakes",
        confidence: Number(body.confidence) || 0.92,
        rule_title: body.rule_title,
        repeat_count: Number(body.repeat_count) || undefined,
        wallet_address: body.wallet_address,
        generated_at: new Date().toISOString(),
      };

      const rememberResult = await walrusService.remember(payload, 3500);
      return NextResponse.json({
        success: true,
        blobId: rememberResult.blobId,
        jobId: rememberResult.jobId,
        payload,
        isMock: walrusService.getIsMock(),
      });
    }

    // 2. Handling Initial Commitment Rules & Genesis Pact Storage
    const {
      rules,
      initialDepositSui = 10,
      unlockDate = "2026-12-25",
      walletAddress = "0x_demo_wallet",
    } = body;

    if (!rules || !Array.isArray(rules) || rules.length === 0) {
      return NextResponse.json(
        { error: "At least one commitment rule is required." },
        { status: 400 }
      );
    }

    const pactId = `pact_${Date.now()}`;
    console.log(`[Walrus API] Processing ${rules.length} resolutions for pact ${pactId}...`);

    // Step A: Semantic analysis via Google Gemini 3.5 Flash
    const analyzedRules = await analyzeMultipleResolutions(
      rules.map((r) => ({
        id: String(r.id),
        title: String(r.title || "Untitled Resolution"),
        condition: String(r.condition || ""),
        whyItMatters: String(r.whyItMatters || r.why_it_matters || ""),
        penalty: Number(r.penalty) || 5,
      }))
    );

    // Step B: Persist each behavioral contract into Walrus Memory concurrently in parallel
    console.log(`[Walrus API] Committing ${analyzedRules.length} resolution blobs in parallel to Walrus Mainnet...`);
    const committedBlobs = await Promise.all(
      analyzedRules.map(async (analyzed) => {
        const payload: CommitmentRulePayload = {
          type: "commitment_rule",
          commitment_id: pactId,
          rule_id: analyzed.ruleId,
          title: analyzed.originalTitle,
          description: analyzed.originalCondition,
          category: analyzed.category,
          penalty_amount_sui: analyzed.penaltySui,
          cadence: analyzed.cadence,
          exceptions: analyzed.exceptions,
          keywords: analyzed.keywords,
          behavioral_rule: analyzed.behavioral_rule,
          why_it_matters: analyzed.whyItMatters,
          wally_roast_angle: analyzed.wally_roast_angle,
          verbatim_oath: analyzed.verbatimOath,
          wallet_address: walletAddress,
          created_at: new Date().toISOString(),
          status: "active",
        };

        // Rapid timeout (4000ms) ensures prompt UI progression while registering on Walrus
        const rememberResult = await walrusService.remember(payload, 4000);
        return {
          ruleId: analyzed.ruleId,
          blobId: rememberResult.blobId,
          jobId: rememberResult.jobId,
          title: analyzed.originalTitle,
          category: analyzed.category,
          penaltySui: analyzed.penaltySui,
          keywords: analyzed.keywords,
          behavioralRule: analyzed.behavioral_rule,
          wallyRoastAngle: analyzed.wally_roast_angle,
        };
      })
    );

    // Step C: Persist Master Genesis Pact manifest referencing all individual resolution blobs
    const genesisManifest: GenesisPactPayload = {
      type: "genesis_pact",
      pact_id: pactId,
      wallet_address: walletAddress,
      created_at: new Date().toISOString(),
      unlock_date: unlockDate,
      initial_deposit_sui: Number(initialDepositSui),
      resolution_blobs: committedBlobs.map((b) => ({
        rule_id: b.ruleId,
        blob_id: b.blobId,
        title: b.title,
        penalty_sui: b.penaltySui,
        category: b.category,
      })),
      total_rules: committedBlobs.length,
      status: "locked",
    };

    const genesisRememberResult = await walrusService.remember(genesisManifest, 4000);

    console.log(
      `[Walrus API] Genesis Pact committed! Manifest Blob ID: ${genesisRememberResult.blobId}`
    );

    return NextResponse.json({
      success: true,
      pactId,
      genesisBlobId: genesisRememberResult.blobId,
      genesisJobId: genesisRememberResult.jobId,
      primaryBlobId: genesisRememberResult.blobId,
      storedRulesCount: committedBlobs.length,
      initialDepositSui: Number(initialDepositSui),
      unlockDate,
      walletAddress,
      isMock: walrusService.getIsMock(),
      timestamp: new Date().toISOString(),
      blobs: committedBlobs,
      manifest: genesisManifest,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Walrus storage error";
    console.error("[Walrus API] Error during pact commit:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
