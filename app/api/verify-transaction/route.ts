import dns from "node:dns";

if (typeof dns?.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {}

import { NextResponse } from "next/server";
import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import { tatumService } from "@/lib/tatum";
import {
  walrusService,
  type AccountabilityEventPayload,
  type BehavioralPatternPayload,
} from "@/lib/walrus";
import { synthesizeWallyIntervention } from "@/lib/wally-synthesizer";

const TransactionAuditSchema = z.object({
  verdict: z
    .enum(["honored", "broken", "excused"])
    .describe(
      "broken if the transfer memo, recipient, amount, or context semantically breaches ANY listed resolution; honored if it complies; excused only if explicitly allowed by rule exceptions"
    ),
  reason: z
    .string()
    .describe("Crisp 1-sentence explanation of why the transfer violates or honors the evaluated rule"),
  matched_rule: z
    .string()
    .describe(
      "The EXACT title of the breached resolution from the provided list if broken, or 'Resolutions Honored' if honored"
    ),
  wally_roast: z
    .string()
    .describe(
      "Wally's sharp, direct, discerning 1-2 sentence second-person message referencing their actual promise/motivation and Walrus memory (zero roleplay gestures, zero robotic templates)"
    ),
  behavioral_insight: z
    .string()
    .optional()
    .describe("Concise pattern observation if repeating infractions or habit risks appear in history"),
});

interface InputRule {
  id?: string;
  blobId?: string;
  title: string;
  condition: string;
  whyItMatters?: string;
  penalty?: number;
}

interface HistoricalRecord {
  id?: string;
  ruleTitle?: string;
  verdict?: "honored" | "broken" | "excused";
  memo?: string;
  timestamp?: string;
  penaltySui?: number;
  amount?: string | number;
}

function findMatchingRule(ruleTitleFromAi: string | undefined, userRules: InputRule[]): InputRule | null {
  if (!ruleTitleFromAi || !userRules.length) return null;
  const target = ruleTitleFromAi.trim().toLowerCase();
  if (!target || target === "resolutions honored" || target === "none") return null;

  // 1. Exact match
  const exact = userRules.find((r) => r.title.trim().toLowerCase() === target);
  if (exact) return exact;

  // 2. Substring match
  const sub = userRules.find((r) => {
    const rt = r.title.trim().toLowerCase();
    return rt.includes(target) || target.includes(rt);
  });
  if (sub) return sub;

  // 3. Token overlap match
  const targetWords = target.split(/\s+/).filter((w) => w.length > 2);
  let bestRule: InputRule | null = null;
  let bestScore = 0;
  for (const r of userRules) {
    const ruleText = `${r.title} ${r.condition}`.toLowerCase();
    const score = targetWords.reduce((acc, w) => (ruleText.includes(w) ? acc + 1 : acc), 0);
    if (score > bestScore) {
      bestScore = score;
      bestRule = r;
    }
  }
  return bestScore > 0 ? bestRule : null;
}

function deterministicFallbackAudit(
  userRules: InputRule[],
  cleanRecipient: string,
  cleanMemo: string,
  isLateNight: boolean
): { matchedRule: InputRule | null; reason: string } {
  const lowerMemo = cleanMemo.toLowerCase();
  const lowerRecipient = cleanRecipient.toLowerCase();

  // A. Banned Recipient Check
  for (const rule of userRules) {
    const cond = (rule.condition || "").toLowerCase();
    const title = (rule.title || "").toLowerCase();
    if (
      lowerRecipient &&
      (cond.includes(lowerRecipient) ||
        title.includes(lowerRecipient) ||
        (cond.includes("banned") && lowerRecipient.length > 3 && cond.includes(lowerRecipient.slice(0, 8))))
    ) {
      return {
        matchedRule: rule,
        reason: `Transfers to recipient '${cleanRecipient}' are prohibited under resolution '${rule.title}'.`,
      };
    }
  }

  // B. Broad Semantic Category Fallback (only invoked when LLM is offline/unavailable)
  const categories: Array<{
    ruleTokens: string[];
    memoTokens: string[];
    checkNightOnly?: boolean;
  }> = [
    {
      ruleTokens: ["smok", "cig", "vape", "nicotine", "tobacco"],
      memoTokens: [
        "cig", "cigs", "cigarette", "cigarettes", "smoke", "smokes", "smoking",
        "vape", "vaping", "pod", "pods", "juul", "elfbar", "iqos", "zyns", "zyn",
        "nicotine", "tobacco", "marlboro", "camel", "newport", "lighter", "pack of", "menthol",
      ],
    },
    {
      ruleTokens: ["bet", "gambl", "sport", "wager", "casino", "parlay"],
      memoTokens: [
        "bet", "betting", "sport", "draftking", "fanduel", "parlay", "odds",
        "stake", "wager", "casino", "poker", "blackjack", "slots", "roulette", "betmgm",
      ],
    },
    {
      ruleTokens: ["food", "takeout", "delivery", "eat", "restaurant"],
      memoTokens: [
        "food", "takeout", "delivery", "burger", "pizza", "snack", "ubereats",
        "uber eats", "doordash", "grubhub", "mcdonald", "kfc", "taco", "fries",
      ],
      checkNightOnly: true,
    },
    {
      ruleTokens: ["ex", "sarah", "ties", "relationship", "contact"],
      memoTokens: ["sarah", "ex", "apology", "miss you", "reconcile", "gift for her", "gift for him"],
    },
    {
      ruleTokens: ["drink", "alcohol", "sober", "booze", "liquor"],
      memoTokens: ["beer", "wine", "vodka", "whiskey", "tequila", "bar", "drinks", "liquor", "booze", "clubbing"],
    },
    {
      ruleTokens: ["impulse", "shop", "club", "spending", "spend"],
      memoTokens: ["club", "bottle service", "zara", "sneakers", "impulse", "shopping spree", "designer"],
    },
  ];

  for (const rule of userRules) {
    const combinedRule = `${rule.title || ""} ${rule.condition || ""}`.toLowerCase();

    for (const cat of categories) {
      const ruleMatches = cat.ruleTokens.some((t) => combinedRule.includes(t));
      const memoMatches = cat.memoTokens.some((t) => lowerMemo.includes(t));
      if (ruleMatches && memoMatches) {
        if (!cat.checkNightOnly || isLateNight || !combinedRule.includes("10 pm")) {
          return {
            matchedRule: rule,
            reason: `Memo '${cleanMemo}' violates your resolution '${rule.title}'.`,
          };
        }
      }
    }

    const memoWords = lowerMemo.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
    for (const word of memoWords) {
      if (combinedRule.includes(word)) {
        return {
          matchedRule: rule,
          reason: `Memo '${cleanMemo}' conflicts with resolution '${rule.title}'.`,
        };
      }
    }
  }

  return { matchedRule: null, reason: "" };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      recipient = "",
      amount = 0.05,
      memo = "",
      walletAddress = "0x_demo_wallet",
      timestamp = new Date().toISOString(),
      vaultObjectId = process.env.VAULT_OBJECT_ID || "0x_yearbound_default_vault",
      rules = [],
      history = [],
    } = body;

    const transferAmount = Number(amount) || 0;
    const cleanMemo = String(memo || "").trim();
    const cleanRecipient = String(recipient || "").trim();
    const userRules: InputRule[] = Array.isArray(rules) ? rules : [];
    const clientHistory: HistoricalRecord[] = Array.isArray(history) ? history : [];

    // -------------------------------------------------------------------------
    // 1. TATUM SUI GATEWAY & WALRUS MEMORY RECALL (Parallel Preflight)
    // -------------------------------------------------------------------------
    const targetNetwork =
      body.network === "testnet" || body.walletMode === "demo" ? "testnet" : "mainnet";

    let tatumBalanceSui = 0;
    let tatumVaultSui = 0;
    let spendingVelocity = {
      recentTxCount: 0,
      isHighVelocity: false,
      provider: `Tatum Sui ${targetNetwork} Gateway`,
    };
    let inflowMetrics = {
      totalInflowSui: 0,
      incomingTxCount: 0,
      auditedPeriodDays: 30,
      provider: `Tatum Sui ${targetNetwork} Gateway`,
    };

    let walrusEvents: AccountabilityEventPayload[] = [];
    let walrusPatterns: BehavioralPatternPayload[] = [];
    let rawRecalledTexts: string[] = [];

    const queryStr = `${cleanMemo} ${cleanRecipient} accountability event behavioral pattern ${userRules.map((r) => r.title).join(" ")}`.trim();

    await Promise.race([
      Promise.all([
        (async () => {
          try {
            if (walletAddress && /^0x[0-9a-fA-F]{10,64}$/.test(walletAddress)) {
              const [balances, recentTxs] = await Promise.all([
                tatumService.getWalletBalances(walletAddress, targetNetwork),
                tatumService.getRecentTransactions(walletAddress, 15, targetNetwork),
              ]);
              const suiCoin = balances.find(
                (b) => b.coinType.includes("::sui::SUI") || b.coinType === "0x2::sui::SUI"
              );
              if (suiCoin) {
                tatumBalanceSui = Number(suiCoin.totalBalance) / 1_000_000_000;
              }
              const txCount = Array.isArray(recentTxs) ? recentTxs.length : 0;
              spendingVelocity = {
                recentTxCount: txCount,
                isHighVelocity: txCount >= 3,
                provider: `Tatum Sui ${targetNetwork} Gateway`,
              };
              inflowMetrics = {
                totalInflowSui: Number(Math.max(0, tatumBalanceSui).toFixed(2)),
                incomingTxCount: txCount,
                auditedPeriodDays: 30,
                provider: `Tatum Sui ${targetNetwork} Gateway`,
              };
            }
            if (vaultObjectId && /^0x[0-9a-fA-F]{64}$/.test(vaultObjectId)) {
              const vaultState = await tatumService.getVaultState(vaultObjectId, targetNetwork);
              if (vaultState) {
                tatumVaultSui = vaultState.balanceSui;
              }
            }
          } catch (tatumErr) {
            console.warn("[Verify API] Tatum GraphQL notice:", tatumErr instanceof Error ? tatumErr.message : tatumErr);
          }
        })(),
        (async () => {
          try {
            // Single consolidated Walrus recall query avoids redundant relayer /version preflights
            const rawTexts = await walrusService.recall(queryStr, 14);
            const normAddr = (walletAddress || "").trim().toLowerCase();

            const events: AccountabilityEventPayload[] = [];
            const patterns: BehavioralPatternPayload[] = [];

            for (const mem of rawTexts || []) {
              if (!mem) continue;
              const first = mem.indexOf("{");
              const last = mem.lastIndexOf("}");
              if (first !== -1 && last > first) {
                try {
                  const obj = JSON.parse(mem.slice(first, last + 1));
                  if (obj?.type === "accountability_event") events.push(obj);
                  else if (obj?.type === "behavioral_pattern") patterns.push(obj);
                } catch {}
              }
            }

            walrusEvents = events.filter(
              (e) => !normAddr || !normAddr.startsWith("0x") || e.wallet_address?.toLowerCase() === normAddr
            );
            walrusPatterns = patterns.filter(
              (p) => !normAddr || !normAddr.startsWith("0x") || p.wallet_address?.toLowerCase() === normAddr
            );
            rawRecalledTexts = (rawTexts || []).filter((txt) => {
              if (!normAddr || !normAddr.startsWith("0x")) return true;
              const addrMatch = txt.match(/"wallet_address"\s*:\s*"(0x[^"]+)"/i);
              return !addrMatch || addrMatch[1].toLowerCase() === normAddr;
            });
          } catch (walrusErr) {
            console.warn("[Verify API] Walrus recall notice:", walrusErr instanceof Error ? walrusErr.message : walrusErr);
          }
        })(),
      ]),
      new Promise((resolve) => setTimeout(resolve, 2200)),
    ]);

    const isSolvent = tatumBalanceSui >= transferAmount;

    // Optional inflow rule check telemetry
    const inflowRule = userRules.find((r) => {
      const txt = `${r.title} ${r.condition}`.toLowerCase();
      return (
        txt.includes("save") ||
        txt.includes("deposit") ||
        txt.includes("inflow") ||
        txt.includes("earn") ||
        txt.includes("income") ||
        txt.includes("accumulate")
      );
    });

    let inflowRuleChecked: { title: string; targetSui: number; isMet: boolean } | undefined;
    if (inflowRule) {
      const numMatch = `${inflowRule.title} ${inflowRule.condition}`.match(
        /(\d+[\d,.]*)\s*(?:sui|SUI|\$)?/
      );
      const targetSui = numMatch && numMatch[1] ? parseFloat(numMatch[1].replace(/,/g, "")) : 500;
      inflowRuleChecked = {
        title: inflowRule.title,
        targetSui,
        isMet: inflowMetrics.totalInflowSui >= targetSui,
      };
    }

    // Combine Walrus events with client session history
    const combinedHistory: HistoricalRecord[] = [...clientHistory];
    for (const we of walrusEvents) {
      const alreadyIncluded = combinedHistory.some(
        (h) => h.memo === we.user_explanation && h.timestamp === we.timestamp
      );
      if (!alreadyIncluded) {
        combinedHistory.push({
          ruleTitle: we.rule_title,
          verdict: we.verdict,
          memo: we.user_explanation,
          timestamp: we.timestamp,
          penaltySui: we.penalty_deposited_sui,
        });
      }
    }

    const pastBreaches = combinedHistory.filter((h) => h.verdict === "broken");
    let cleanStreakCount = 0;
    for (let i = 0; i < combinedHistory.length; i++) {
      if (combinedHistory[i].verdict === "honored") {
        cleanStreakCount++;
      } else if (combinedHistory[i].verdict === "broken") {
        break;
      }
    }
    const cleanStreakDays = Math.max(1, Math.round(cleanStreakCount * 1.5));

    const currentHour = new Date(timestamp).getHours();
    const isLateNight = currentHour >= 22 || currentHour < 5;

    // -------------------------------------------------------------------------
    // 2. PRIMARY INTELLIGENT LLM AUDIT (Gemini Cross-Checking ALL Rules & Memory)
    // -------------------------------------------------------------------------
    let aiAuditOutput: z.infer<typeof TransactionAuditSchema> | null = null;
    let auditedBy = "Semantic Fallback Auditor";

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (apiKey && !apiKey.includes("your_")) {
      const formattedRules = userRules
        .map(
          (r, i) =>
            `${i + 1}. Title: "${r.title}"\n   Boundary: "${r.condition}"\n   Personal Motivation (Why It Matters): "${r.whyItMatters || "Personal discipline"}"\n   Base Penalty: ${r.penalty || 0.05} SUI`
        )
        .join("\n");

      const recentHistorySummary =
        combinedHistory.length > 0
          ? combinedHistory
              .slice(0, 8)
              .map(
                (h) =>
                  `- [${(h.verdict || "unknown").toUpperCase()}] Rule: "${h.ruleTitle || "General"}" | Memo: "${h.memo || "None"}" (${h.timestamp || "recent"})`
              )
              .join("\n")
          : "No prior transfers recorded yet.";

      const recalledSnippets =
        rawRecalledTexts.length > 0
          ? rawRecalledTexts
              .slice(0, 4)
              .map((t) => `- ${t.slice(0, 220)}`)
              .join("\n")
          : "None";

      const auditPrompt = `
TRANSFER UNDER REVIEW:
- Amount: ${transferAmount} SUI
- Recipient: "${cleanRecipient || "Unspecified"}"
- User Memo / Intent: "${cleanMemo}"
- Timestamp: ${timestamp} (Local hour ~${currentHour}:00, Late night curfew: ${isLateNight ? "YES" : "NO"})

ALL ACTIVE USER RESOLUTIONS (GENESIS PACT IN WALRUS MEMORY):
${formattedRules || "No custom rules specified."}

RECENT ACCOUNTABILITY HISTORY (WALRUS + SESSION):
${recentHistorySummary}

BEHAVIORAL PATTERNS RECALLED FROM WALRUS:
${
  walrusPatterns.length > 0
    ? walrusPatterns.map((p) => `- ${p.pattern_title}: ${p.observation}`).join("\n")
    : "None recorded yet."
}

RAW WALRUS MEMORY EXCERPTS:
${recalledSnippets}

TATUM ON-CHAIN CONTEXT:
- Network: Sui ${targetNetwork}
- Live Balance: ${tatumBalanceSui.toFixed(2)} SUI
- 24h Transfer Count: ${spendingVelocity.recentTxCount}
- Current Clean Honored Streak: ${cleanStreakCount} transfers

TASK:
Using your full real-world knowledge, slang understanding, merchant awareness, and semantic reasoning, cross-check this transfer against EVERY active resolution above.
- Think beyond literal keyword matching! For example:
  * "cigs", "pack of smokes", "juul", "vape", "lighter", "marlboro", "nicotine", "7-eleven smokes" -> violates quitting smoking!
  * "draftkings", "parlay", "fanduel", "stake", "odds", "blackjack", "casino deposit" -> violates anti-gambling!
  * "ubereats", "doordash", "late night pizza", "midnight burger" -> violates no late-night takeout (check curfew rules thoughtfully; if the memo says "late-night UberEats" or occurs past 10 PM or indicates takeout indulgence banned by the rule, mark broken!).
  * Any money/gift/apology sent to an ex ("Sarah", matching recipient banned address, etc.) -> violates cutting ties!
  * Excessive clubbing / luxury / non-essential shopping splurges -> violates spending limits if indicated!
  * Conversely, normal legitimate spending (e.g. weekly groceries, produce, rent, utilities, transit, savings transfer, genuine honest compliance not violating any listed rule) -> mark "honored"!
- If broken:
  1. Set verdict = "broken".
  2. Set matched_rule to the EXACT title of the breached resolution from the list.
  3. Explain why concisely in reason.
  4. Write wally_roast directly addressing the user in 1-2 crisp, human second-person sentences that weave in their personal motivation (e.g. saving for their Japan trip, protecting mental health, respecting boundaries) without sounding robotic. Do NOT use third-person physical actions. Do NOT say "remember, you are doing this for:".
- If honored:
  1. Set verdict = "honored".
  2. Set matched_rule = "Resolutions Honored".
  3. Confirm concisely in reason and write a brief, sharp, encouraging wally_roast line.
      `.trim();

      const candidateModels = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.5-flash"];
      for (const modelId of candidateModels) {
        try {
          const { output } = await generateText({
            model: google(modelId),
            output: Output.object({
              schema: TransactionAuditSchema,
            }),
            maxRetries: 0,
            abortSignal: AbortSignal.timeout(modelId === "gemini-3.5-flash" ? 15000 : 12000),
            system:
              "You are Wally, the intelligent financial accountability concierge for Yearbound. " +
              "You strictly enforce the user's New Year's resolutions stored in Walrus Memory using genuine semantic intelligence rather than dumb keyword filters. " +
              "Never use third-person roleplay gestures or mechanical quote templates.",
            prompt: auditPrompt,
          });

          if (output && output.verdict) {
            aiAuditOutput = output;
            auditedBy = `Gemini AI (${modelId}) + Walrus Memory`;
            break;
          }
        } catch (aiErr) {
          console.warn(`[Verify API] ${modelId} inference notice:`, aiErr instanceof Error ? aiErr.message : aiErr);
        }
      }
    }

    // -------------------------------------------------------------------------
    // 3. RESOLVE FINAL VERDICT, RULE METADATA, ESCALATED PENALTY & PATTERNS
    // -------------------------------------------------------------------------
    let isBreached = false;
    let matchedViolationRule: InputRule | null = null;
    let finalReason = "";
    let aiRoast: string | undefined;
    let aiBehavioralInsight: string | undefined;

    if (aiAuditOutput) {
      isBreached = aiAuditOutput.verdict === "broken";
      finalReason = aiAuditOutput.reason;
      aiRoast = aiAuditOutput.wally_roast;
      aiBehavioralInsight = aiAuditOutput.behavioral_insight;

      if (isBreached) {
        matchedViolationRule = findMatchingRule(aiAuditOutput.matched_rule, userRules);
        if (!matchedViolationRule) {
          // Cross-check deterministic matcher only to recover exact rule metadata if AI paraphrased the rule title
          const det = deterministicFallbackAudit(userRules, cleanRecipient, cleanMemo, isLateNight);
          matchedViolationRule = det.matchedRule || userRules[0] || null;
        }
      }
    } else {
      const det = deterministicFallbackAudit(userRules, cleanRecipient, cleanMemo, isLateNight);
      matchedViolationRule = det.matchedRule;
      isBreached = Boolean(matchedViolationRule);
      finalReason = isBreached
        ? det.reason
        : "Discipline maintained. Transaction verified as resolution-compliant.";
    }

    const targetRuleTitle = isBreached
      ? matchedViolationRule?.title || aiAuditOutput?.matched_rule || userRules[0]?.title || "Resolution"
      : "Resolutions Honored";

    const pastRuleBreaches = isBreached
      ? pastBreaches.filter((b) => {
          const bTitle = (b.ruleTitle || "").toLowerCase();
          const tTitle = targetRuleTitle.toLowerCase();
          return bTitle === tTitle || bTitle.includes(tTitle) || tTitle.includes(bTitle);
        })
      : [];

    const previousBreachCount = pastRuleBreaches.length;
    const repeatCount = isBreached ? previousBreachCount + 1 : 0;
    const streakBroken = isBreached && cleanStreakCount > 0;

    // Escalated penalty curve: 1st: 1.0x | 2nd: 1.5x | 3rd: 2.0x | 4th+: 2.5x
    const basePenalty = Number(matchedViolationRule?.penalty) || 0.05;
    const penaltyMultiplier =
      repeatCount <= 1 ? 1 : repeatCount === 2 ? 1.5 : repeatCount === 3 ? 2 : 2.5;
    const escalatedPenalty = Math.round(basePenalty * penaltyMultiplier * 100) / 100;

    const pastBreachSummaries = pastRuleBreaches
      .slice(0, 3)
      .map((b) => `"${b.memo || "Unspecified"}" on ${b.timestamp || "recent date"}`)
      .join(", ");

    let newPatternDetected: BehavioralPatternPayload | null = null;
    if (isBreached && repeatCount >= 2) {
      newPatternDetected = {
        type: "behavioral_pattern",
        pattern_title: repeatCount >= 3 ? "Chronic Relapse Pattern" : "Recurring Violation Habit",
        observation: `User has breached '${targetRuleTitle}' ${repeatCount} times. Prior memos include: ${pastBreachSummaries || cleanMemo}.`,
        recommended_intervention: `Escalated fine to ${escalatedPenalty} SUI. Enforce strict pre-spend reflection.`,
        confidence: 0.94,
        rule_title: targetRuleTitle,
        repeat_count: repeatCount,
        wallet_address: walletAddress,
        generated_at: new Date().toISOString(),
      };

      walrusService
        .remember(newPatternDetected, 4000)
        .then((res) => console.log(`[Walrus] Autonomously recorded pattern blob #${res.blobId}`))
        .catch((err) => console.warn("[Walrus] Pattern background save notice:", err));
    }

    const motivation = matchedViolationRule?.whyItMatters || "";

    const fallbackRoast = isBreached
      ? synthesizeWallyIntervention({
          ruleTitle: targetRuleTitle,
          motivation,
          condition: matchedViolationRule?.condition,
          recipient: cleanRecipient,
          memo: cleanMemo,
          amountSui: transferAmount,
          repeatCount,
          cleanStreakDays,
        })
      : "Transaction verified. Completely honors your active commitments in Walrus Memory.";

    const finalRoast =
      aiRoast && !aiRoast.toLowerCase().includes("doing this for:") ? aiRoast : fallbackRoast;

    return NextResponse.json({
      success: true,
      verdict: isBreached ? "broken" : "honored",
      reason:
        finalReason ||
        (isBreached
          ? `Transaction memo '${cleanMemo}' breaches your commitment to '${targetRuleTitle}'.`
          : "Discipline maintained. Transaction verified as resolution-compliant."),
      matchedRule: targetRuleTitle,
      matchedRuleId: matchedViolationRule?.id || null,
      matchedRuleBlobId: matchedViolationRule?.blobId || null,
      motivation: motivation || null,
      penaltySui: isBreached ? escalatedPenalty : 0,
      wallyRoast: finalRoast,
      repeatInfractionCount: repeatCount,
      streakBroken,
      behavioralInsight: newPatternDetected?.observation || aiBehavioralInsight || undefined,
      auditedBy,
      tatum: {
        balanceSui: tatumBalanceSui,
        vaultLockedSui: tatumVaultSui,
        isSolvent,
        inflowMetrics,
        inflowRuleChecked,
        verifiedVia: `Tatum Sui ${targetNetwork} Gateway`,
      },
      walrus: {
        recalledCount: rawRecalledTexts.length + walrusEvents.length,
        totalPastBreaches: pastBreaches.length,
        previousRuleBreaches: previousBreachCount,
        cleanStreakCount,
        cleanStreakDays,
        patternsCount: walrusPatterns.length,
        verifiedVia: walrusService.getIsMock()
          ? "Walrus Memory (Session Fallback)"
          : "Walrus Memory (MemWal Mainnet)",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Verification failure";
    console.error("[Verify API] Fatal error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
