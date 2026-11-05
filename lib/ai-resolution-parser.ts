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
  penaltySui: number;
  verbatimOath: string;
}

/**
 * Analyzes a raw user resolution using Google Gemini 3.5 Flash via Vercel AI SDK.
 * Converts casual user commitments into enforceable behavioral contracts.
 */
export async function analyzeResolutionWithGemini(
  ruleId: string,
  title: string,
  condition: string,
  penaltySui: number
): Promise<ParsedResolutionContract> {
  const oathText = `${title}${condition ? ` — Condition: ${condition}` : ""}`;

  try {
    const model = google("gemini-3.5-flash");

    const { output } = await generateText({
      model,
      output: Output.object({
        schema: ResolutionAnalysisSchema,
      }),
      system:
        "You are the analytical engine for Yearbound, an accountable consumer finance platform. " +
        "Users set New Year's resolutions with financial penalties deposited into a time-locked Sui vault. " +
        "Your task is to parse raw natural language resolutions into precise, testable behavioral contracts. " +
        "Extract merchant/memo keywords that would trigger an infraction, craft a sharp, discerning roast angle " +
        "for Wally (our sophisticated walrus concierge), and identify any exceptions.",
      prompt: `Analyze this New Year's resolution commitment:
Title: "${title}"
Condition/Trigger: "${condition || "None specified"}"
Staked Penalty: ${penaltySui} SUI

Generate a structured behavioral contract for this commitment.`,
    });

    return {
      ruleId,
      originalTitle: title,
      originalCondition: condition,
      penaltySui,
      verbatimOath: oathText,
      category: output.category,
      keywords: output.keywords,
      behavioral_rule: output.behavioral_rule,
      wally_roast_angle: output.wally_roast_angle,
      cadence: output.cadence,
      exceptions: output.exceptions,
    };
  } catch (error: unknown) {
    console.warn(
      "[Gemini Parser] AI parsing error, applying resilient structural fallback:",
      error
    );

    // Resilient fallback ensuring zero app crash if AI quota or network drops
    const lowerTitle = title.toLowerCase();
    const isFood = lowerTitle.includes("eat") || lowerTitle.includes("food") || lowerTitle.includes("uber");
    const isFinance = lowerTitle.includes("spend") || lowerTitle.includes("buy") || lowerTitle.includes("trade") || lowerTitle.includes("shop");
    const isFitness = lowerTitle.includes("gym") || lowerTitle.includes("workout") || lowerTitle.includes("run");

    const fallbackCategory = isFinance
      ? "finance"
      : isFood
      ? "lifestyle"
      : isFitness
      ? "fitness"
      : "custom";

    const extractedWords = `${title} ${condition}`
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3);

    return {
      ruleId,
      originalTitle: title,
      originalCondition: condition,
      penaltySui,
      verbatimOath: oathText,
      category: fallbackCategory,
      keywords: Array.from(new Set(extractedWords)).slice(0, 5),
      behavioral_rule: `Commitment: ${title}. Breach condition: ${condition || "Any deviation from stated oath"}.`,
      wally_roast_angle: `Remind the user of their exact oath: "${oathText}", and how breaking it immediately sends ${penaltySui} SUI to the Christmas vault.`,
      cadence: "event_based",
      exceptions: [],
    };
  }
}

/**
 * Batch parses multiple resolutions in parallel.
 */
export async function analyzeMultipleResolutions(
  rules: { id: string; title: string; condition: string; penalty: number }[]
): Promise<ParsedResolutionContract[]> {
  const promises = rules.map((r) =>
    analyzeResolutionWithGemini(r.id, r.title, r.condition, r.penalty)
  );
  return Promise.all(promises);
}
