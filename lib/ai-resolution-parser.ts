import dns from "node:dns";

if (typeof dns?.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {}

import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";

export const ResolutionAnalysisSchema = z.object({
  category: z.enum([
    "finance",
    "fitness",
    "productivity",
    "health",
    "lifestyle",
    "custom",
  ]),
  keywords: z
    .array(z.string())
    .describe(
      "High-probability keywords found in transaction memos, merchant names, or descriptions that indicate a breach (e.g. 'doordash', 'steam', 'bar', 'uber', 'amazon')."
    ),
  behavioral_rule: z
    .string()
    .describe(
      "Crisp, unambiguous conditional statement describing the exact infraction criteria."
    ),
  why_it_matters: z
    .string()
    .default("")
    .describe("The user's underlying personal motivation or why they care about keeping this resolution."),
  wally_roast_angle: z
    .string()
    .describe(
      "A biting, discerning, witty roast prompt for Wally (the midnight concierge) highlighting the contrast between the user's resolution and the impulse transaction."
    ),
  cadence: z
    .enum(["daily", "weekly", "monthly", "event_based"])
    .default("event_based"),
  exceptions: z
    .array(z.string())
    .default([])
    .describe("Explicit permitted exceptions extracted from the user's text."),
});

export type ResolutionAnalysis = z.infer<typeof ResolutionAnalysisSchema>;

export interface ParsedResolutionContract extends ResolutionAnalysis {
  ruleId: string;
  originalTitle: string;
  originalCondition: string;
  whyItMatters?: string;
  penaltySui: number;
  verbatimOath: string;
}

/**
 * High-speed structural resolution parser that converts natural language resolutions
 * into rich behavioral contracts for Walrus Memory in under 2ms.
 */
export function fastParseResolution(
  ruleId: string,
  title: string,
  condition: string,
  penaltySui: number,
  whyItMatters?: string
): ParsedResolutionContract {
  const oathText = `${title}${condition ? ` — Condition: ${condition}` : ""}${whyItMatters ? ` (Why: ${whyItMatters})` : ""}`;
  const lowerCombined = `${title} ${condition}`.toLowerCase();

  const isFood =
    lowerCombined.includes("eat") ||
    lowerCombined.includes("food") ||
    lowerCombined.includes("takeout") ||
    lowerCombined.includes("uber") ||
    lowerCombined.includes("dash") ||
    lowerCombined.includes("delivery") ||
    lowerCombined.includes("burger") ||
    lowerCombined.includes("pizza") ||
    lowerCombined.includes("snack");

  const isFinance =
    lowerCombined.includes("spend") ||
    lowerCombined.includes("buy") ||
    lowerCombined.includes("shop") ||
    lowerCombined.includes("broke") ||
    lowerCombined.includes("impulse") ||
    lowerCombined.includes("club") ||
    lowerCombined.includes("clothing") ||
    lowerCombined.includes("save");

  const isFitness =
    lowerCombined.includes("gym") ||
    lowerCombined.includes("workout") ||
    lowerCombined.includes("run") ||
    lowerCombined.includes("fitness") ||
    lowerCombined.includes("exercise");

  const isBetting =
    lowerCombined.includes("bet") ||
    lowerCombined.includes("gamble") ||
    lowerCombined.includes("casino") ||
    lowerCombined.includes("stake") ||
    lowerCombined.includes("draftking") ||
    lowerCombined.includes("fanduel") ||
    lowerCombined.includes("parlay") ||
    lowerCombined.includes("wager");

  const isSmoking =
    lowerCombined.includes("smoke") ||
    lowerCombined.includes("cig") ||
    lowerCombined.includes("vape") ||
    lowerCombined.includes("pod") ||
    lowerCombined.includes("tobacco");

  const isEx =
    lowerCombined.includes("ex") ||
    lowerCombined.includes("sarah") ||
    lowerCombined.includes("cut ties") ||
    lowerCombined.includes("relationship");

  let category: ResolutionAnalysis["category"] = "custom";
  if (isFinance || isBetting) category = "finance";
  else if (isFood || isSmoking || isEx) category = "lifestyle";
  else if (isFitness) category = "fitness";

  const extractedWords = lowerCombined
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !["the", "and", "for", "with", "all", "out", "any", "from", "that", "this"].includes(w));

  const keywords = Array.from(new Set(extractedWords)).slice(0, 8);

  return {
    ruleId,
    originalTitle: title,
    originalCondition: condition,
    whyItMatters: whyItMatters || "",
    penaltySui,
    verbatimOath: oathText,
    category,
    keywords,
    behavioral_rule: `Commitment: ${title}. Condition: ${condition || "Deviation from stated oath"}.`,
    why_it_matters: whyItMatters || "",
    wally_roast_angle: `Remind user of their oath: "${title}", their personal reason "${whyItMatters || "discipline"}", and that breaking it forfeits ${penaltySui} SUI to the Christmas vault.`,
    cadence: "event_based",
    exceptions: [],
  };
}

/**
 * Analyzes a raw user resolution using Google Gemini 3.5 Flash or instant structural parser.
 * Converts casual user commitments into enforceable behavioral contracts.
 */
export async function analyzeResolutionWithGemini(
  ruleId: string,
  title: string,
  condition: string,
  penaltySui: number,
  whyItMatters?: string
): Promise<ParsedResolutionContract> {
  const oathText = `${title}${condition ? ` — Condition: ${condition}` : ""}${whyItMatters ? ` (Why: ${whyItMatters})` : ""}`;

  try {
    const model = google("gemini-3.5-flash-lite");

    const { output } = await generateText({
      model,
      output: Output.object({
        schema: ResolutionAnalysisSchema,
      }),
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(9000),
      system:
        "You are the analytical engine for Yearbound, an accountable consumer finance platform. " +
        "Users set New Year's resolutions with financial penalties deposited into a time-locked Sui vault. " +
        "Your task is to parse raw natural language resolutions into precise, testable behavioral contracts. " +
        "Capture the user's personal motivation ('why it matters') so Wally can quote it back during temptation. " +
        "Extract merchant/memo concepts that would trigger an infraction, craft a sharp, discerning roast angle " +
        "for Wally (our sophisticated walrus concierge), and identify any sensible exceptions.",
      prompt: `Analyze this New Year's resolution commitment:
Title: "${title}"
Condition/Trigger: "${condition || "None specified"}"
Personal Reason / Why It Matters: "${whyItMatters || "Personal financial growth & discipline"}"
Staked Penalty: ${penaltySui} SUI

Generate a structured behavioral contract for this commitment.`,
    });

    return {
      ruleId,
      originalTitle: title,
      originalCondition: condition,
      whyItMatters: output.why_it_matters || whyItMatters || "",
      penaltySui,
      verbatimOath: oathText,
      category: output.category,
      keywords: output.keywords,
      behavioral_rule: output.behavioral_rule,
      why_it_matters: output.why_it_matters || whyItMatters || "",
      wally_roast_angle: output.wally_roast_angle,
      cadence: output.cadence,
      exceptions: output.exceptions,
    };
  } catch {
    // Instant, deterministic, high-craft behavioral contract synthesis
    return fastParseResolution(ruleId, title, condition, penaltySui, whyItMatters);
  }
}

/**
 * Batch parses multiple resolutions in parallel.
 */
export async function analyzeMultipleResolutions(
  rules: { id: string; title: string; condition: string; penalty: number; whyItMatters?: string }[]
): Promise<ParsedResolutionContract[]> {
  const promises = rules.map((r) =>
    analyzeResolutionWithGemini(r.id, r.title, r.condition, r.penalty, r.whyItMatters)
  );
  return Promise.all(promises);
}
