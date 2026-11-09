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
import {
  walrusService,
  type AccountabilityEventPayload,
  type BehavioralPatternPayload,
} from "@/lib/walrus";

const WallyBriefingSchema = z.object({
  message: z
    .string()
    .describe(
      "A sharp, genuine, helpful 1-2 sentence daily briefing or coaching message (max ~40 words) from Wally grounded in the user's Walrus memory, resolutions, balances, and recent activity."
    ),
});

interface BriefingRule {
  title: string;
  condition?: string;
  whyItMatters?: string;
  penalty?: number;
  breaches?: number;
}

interface BriefingEvent {
  ruleTitle?: string;
  verdict?: string;
  memo?: string;
  timestamp?: string;
  penaltySui?: number;
  amount?: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      walletAddress = "",
      rules = [],
      infractions = [],
      availableBalance = 0,
      escrowDeposit = 0,
      currentDateStr = "",
      activeMilestone = "jan1",
      isVaultUnlocked = false,
      isVaultClaimed = false,
    } = body;

    const userRules: BriefingRule[] = Array.isArray(rules) ? rules : [];
    const clientEvents: BriefingEvent[] = Array.isArray(infractions) ? infractions : [];

    // 1. Recall live cross-session context from Walrus Memory
    let walrusEvents: AccountabilityEventPayload[] = [];
    let walrusPatterns: BehavioralPatternPayload[] = [];
    let rawMemories: string[] = [];

    await Promise.race([
      (async () => {
        try {
          const raw = await walrusService.recall(
            `resolutions goals accountability event behavioral pattern ${walletAddress}`,
            12
          );
          const normAddr = (walletAddress || "").trim().toLowerCase();
          const events: AccountabilityEventPayload[] = [];
          const patterns: BehavioralPatternPayload[] = [];

          for (const mem of raw || []) {
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
          rawMemories = (raw || []).filter((txt) => {
            if (!normAddr || !normAddr.startsWith("0x")) return true;
            const addrMatch = txt.match(/"wallet_address"\s*:\s*"(0x[^"]+)"/i);
            return !addrMatch || addrMatch[1].toLowerCase() === normAddr;
          });
        } catch (err) {
          console.warn("[Wally Briefing] Walrus recall notice:", err);
        }
      })(),
      new Promise((resolve) => setTimeout(resolve, 2200)),
    ]);

    const breaches = clientEvents.filter((e) => e.verdict === "broken");
    const honored = clientEvents.filter((e) => e.verdict === "honored");

    // 2. Synthesize thoughtful coaching briefing using Gemini AI
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (apiKey && !apiKey.includes("your_")) {
      const rulesBlock = userRules
        .map(
          (r, idx) =>
            `${idx + 1}. "${r.title}" (${r.condition || "Active"}) — Why: "${r.whyItMatters || "Discipline"}" | Stake: ${r.penalty || 0.05} SUI | Session breaches: ${r.breaches || 0}`
        )
        .join("\n");

      const eventsBlock =
        clientEvents.length > 0
          ? clientEvents
              .slice(0, 6)
              .map(
                (e) =>
                  `- [${(e.verdict || "broken").toUpperCase()}] Rule: "${e.ruleTitle || "General"}" | Memo: "${e.memo || ""}" | Amount: ${e.amount || "?"} SUI | Fine: ${e.penaltySui || 0} SUI (${e.timestamp || ""})`
              )
              .join("\n")
          : walrusEvents.length > 0
          ? walrusEvents
              .slice(0, 5)
              .map(
                (e) =>
                  `- [${e.verdict.toUpperCase()}] Rule: "${e.rule_title || "Pact"}" | Memo: "${e.user_explanation}" (${e.timestamp})`
              )
              .join("\n")
          : "No transfers executed yet today.";

      const prompt = `
CURRENT DASHBOARD SNAPSHOT:
- Date: ${currentDateStr || "Today"} (Timeline milestone: ${activeMilestone})
- Available Balance: ${Number(availableBalance).toFixed(2)} SUI
- x402 Christmas Vault Locked: ${Number(escrowDeposit).toFixed(2)} SUI
- Christmas Vault Unlocked: ${isVaultUnlocked ? "YES" : "NO"} | Already Claimed: ${isVaultClaimed ? "YES" : "NO"}
- Honored transfers count: ${honored.length} | Breaches count: ${breaches.length}

ACTIVE RESOLUTIONS IN WALRUS MEMORY:
${rulesBlock || "Default Yearbound resolutions"}

RECENT TRANSACTIONS & ACCOUNTABILITY LOG:
${eventsBlock}

RECALLED WALRUS BEHAVIORAL PATTERNS:
${
  walrusPatterns.length > 0
    ? walrusPatterns.map((p) => `- ${p.pattern_title}: ${p.observation}`).join("\n")
    : "None recorded"
}

RAW WALRUS MEMORY SNIPPETS:
${rawMemories.slice(0, 3).map((m) => `- ${m.slice(0, 180)}`).join("\n") || "None"}

INSTRUCTIONS FOR WALLY'S BRIEFING:
Write ONE concise, insightful, supportive message (1-2 crisp sentences, ~25-42 words) directly to the user in second person ("you"):
- If Christmas Vault is unlocked & unclaimed: congratulate them briefly on reaching Dec 25 and highlight claiming their ${Number(escrowDeposit).toFixed(2)} SUI.
- If they just claimed Christmas savings: celebrate completing the year cycle and locking ${Number(escrowDeposit).toFixed(2)} SUI safely until Dec 25.
- If breaches exist: acknowledge the slip-up specifically without lecturing mechanically, connect it naturally to their bigger goal or next constructive step (e.g. protecting their Japan trip funds, clean focus, or staying steady from here).
- If they have clean honored transfers and 0 breaches: praise their specific compliant streak and encourage momentum without randomly pasting an unrelated rule's break-up motivation!
- If x402 Vault Locked is 0.00 SUI and 0 transactions yet: welcome them calmly, note how many commitments are guarded in Walrus Memory, and mention their Mainnet vault is at 0.00 SUI awaiting funding (never invent a deposit).
- If x402 Vault Locked > 0 and 0 transactions yet (fresh Genesis Pact): welcome them calmly, note how many commitments are guarded alongside their ${Number(escrowDeposit).toFixed(2)} SUI x402 pledge, and give one practical forward-looking reminder grounded in their goals.
- Tone: Sharp, calm, intelligent financial concierge (Stripe/Mercury/Apple editorial vibe). Zero cringe slang, zero roleplay physical gestures, zero robotic prefixes like "Walrus memory synthesis:" or "Genesis Pact locked in Walrus memory:".
      `.trim();

      for (const modelId of ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.5-flash"]) {
        const tStart = Date.now();
        try {
          const { output } = await generateText({
            model: google(modelId),
            output: Output.object({ schema: WallyBriefingSchema }),
            maxRetries: 0,
            abortSignal: AbortSignal.timeout(modelId === "gemini-3.5-flash" ? 15000 : 12000),
            system:
              "You are Wally, Yearbound's calm, incisive AI accountability concierge backed by Walrus Memory. Keep responses crisp, human, grounded in the user's real data, and genuinely helpful.",
            prompt,
          });

          if (output?.message) {
            return NextResponse.json({
              success: true,
              message: output.message.trim(),
              aiGenerated: true,
              model: modelId,
              recalledCount: rawMemories.length + walrusEvents.length,
            });
          }
        } catch (err) {
          console.warn(
            `[Wally Briefing] ${modelId} notice (${Date.now() - tStart}ms):`,
            err instanceof Error ? `${err.name}: ${err.message}` : err,
            (err as { statusCode?: number; cause?: unknown })?.statusCode || "",
            (err as { cause?: unknown })?.cause || ""
          );
        }
      }
    }

    // Clean, non-tacky fallback if AI call is temporarily unavailable
    const numericEscrow = Number(escrowDeposit) || 0;
    let fallbackMsg =
      numericEscrow > 0
        ? `All ${userRules.length || 5} resolutions are anchored in Walrus Memory with ${numericEscrow.toFixed(2)} SUI committed to your vault — spend deliberately today.`
        : `All ${userRules.length || 5} resolutions are anchored in Walrus Memory. Your Mainnet vault currently holds 0.00 SUI — fund your wallet via Receive when ready to lock on-chain.`;
    if (isVaultUnlocked && !isVaultClaimed) {
      fallbackMsg = `December 25 is here and your x402 time-lock has opened. Claim your ${numericEscrow.toFixed(2)} SUI savings whenever you're ready.`;
    } else if (isVaultClaimed) {
      fallbackMsg = `You carried your discipline through December 25 and reclaimed ${numericEscrow.toFixed(2)} SUI from your vault.`;
    } else if (breaches.length > 0) {
      const latest = breaches[0];
      fallbackMsg = `You hit a bump on "${latest.ruleTitle || "your pact"}"${latest.memo ? ` (${latest.memo})` : ""}, adding to your ${numericEscrow.toFixed(2)} SUI vault. Reset today and keep the rest of your goals protected.`;
    } else if (honored.length > 0) {
      fallbackMsg = `You're ${honored.length} for ${honored.length} on recent transfers with zero penalties triggered. Every clean decision keeps your wallet working for your real goals.`;
    }

    return NextResponse.json({
      success: true,
      message: fallbackMsg,
      aiGenerated: false,
      recalledCount: rawMemories.length + walrusEvents.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Briefing error";
    return NextResponse.json(
      {
        success: false,
        message: "Watching your active commitments in Walrus Memory — keep your wallet aligned with what matters.",
        error: message,
      },
      { status: 200 }
    );
  }
}
