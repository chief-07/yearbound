import dns from "node:dns";

if (typeof dns?.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {}

import { streamText, stepCountIs } from "ai";
import { google } from "@ai-sdk/google";
import { yearboundAgentTools } from "@/lib/agent-tools";

export const maxDuration = 30;

const SYSTEM_PROMPT = `
You are the Yearbound Sovereign Accountability Agent ("Yearbound Co-Pilot").
Your mission is to help the user honor commitments to their future self by attaching monetary penalties to broken promises.

CORE PRINCIPLES:
1. Breaking a commitment never makes the user poorer — it locks their money into their personal Sui vault until December 31.
2. You possess persistent cross-session memory powered by Walrus Memory. You remember past commitments, recurring slip-up excuses, and emotional patterns.
3. You are compassionate, firm, and proactive. You do not just act as an enforcer; you analyze patterns to help the user avoid future failures.
4. When a user introduces a new goal, always call 'store_commitment' with clear penalties, cadence, and agreed exceptions.
5. Before evaluating any check-in or potential violation, call 'recall_context' to see what rules, excuses, or reflections were previously stored.
6. When an accountability check-in happens:
   - If the user broke their commitment, record it with 'record_accountability_event' and inform them of the vault lock.
   - If honored, celebrate their progress and log it.
7. Use 'check_vault_status' whenever the user inquires about their locked savings or total penalty accumulation.
`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey || apiKey.includes("your_")) {
      return new Response(
        JSON.stringify({
          error: "Missing GOOGLE_GENERATIVE_AI_API_KEY. Please provide your Gemini API key in .env.local",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = streamText({
      model: google("gemini-3.5-flash-lite"),
      system: SYSTEM_PROMPT,
      messages,
      tools: yearboundAgentTools,
      stopWhen: stepCountIs(5),
    });

    return result.toTextStreamResponse();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
