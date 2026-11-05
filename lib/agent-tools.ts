import { tool } from "ai";
import { z } from "zod";
import {
  walrusService,
  type CommitmentRulePayload,
  type AccountabilityEventPayload,
} from "./walrus";
import { tatumService } from "./tatum";

export const storeCommitmentInputSchema = z.object({
  title: z.string().describe("Concise name of the commitment, e.g. 'Exercise 4x per week'"),
  description: z.string().describe("Detailed description of what constitutes honoring the commitment"),
  category: z
    .enum(["fitness", "finance", "productivity", "health", "custom"])
    .describe("Category of the goal"),
  penalty_amount_sui: z.number().positive().describe("Penalty amount in SUI tokens deposited if broken"),
  cadence: z.enum(["daily", "weekly", "monthly", "event_based"]).describe("Frequency of verification"),
  exceptions: z.array(z.string()).describe("Valid excuses agreed upon, e.g. ['Documented illness', 'Emergency travel']"),
});

export const recallContextInputSchema = z.object({
  query: z.string().describe("Natural language query to search user memory context"),
});

export const recordEventInputSchema = z.object({
  commitment_id: z.string().describe("The ID of the commitment being reviewed"),
  verdict: z.enum(["honored", "broken", "excused"]).describe("The verdict of the check-in"),
  user_explanation: z.string().describe("User's explanation, emotional state, or reasoning"),
  penalty_amount_sui: z.number().nonnegative().describe("Amount of penalty due if broken"),
});

export const checkVaultInputSchema = z.object({
  vault_object_id: z.string().optional().describe("Vault object ID on Sui. Defaults to configured environment vault."),
});

export const yearboundAgentTools = {
  /**
   * Tool 1: Store a newly established user commitment rule in Walrus Memory.
   */
  store_commitment: tool({
    description:
      "Persist a new personal commitment rule with an associated financial penalty into Walrus Memory on Mainnet.",
    inputSchema: storeCommitmentInputSchema,
    execute: async (input: z.infer<typeof storeCommitmentInputSchema>) => {
      const { title, description, category, penalty_amount_sui, cadence, exceptions } = input;
      const commitmentId = `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const payload: CommitmentRulePayload = {
        type: "commitment_rule",
        commitment_id: commitmentId,
        rule_id: commitmentId,
        title,
        description,
        category,
        penalty_amount_sui,
        cadence,
        exceptions,
        keywords: [title.toLowerCase(), category],
        behavioral_rule: `Commitment: ${title}. Condition: ${description}`,
        wally_roast_angle: `Remind user of their oath '${title}' and penalty of ${penalty_amount_sui} SUI.`,
        verbatim_oath: `${title}: ${description}`,
        created_at: new Date().toISOString(),
        status: "active",
      };

      const result = await walrusService.remember(payload);
      return {
        success: true,
        commitment_id: commitmentId,
        walrus_job_id: result.jobId,
        walrus_blob_id: result.blobId,
        message: `Commitment '${title}' written to Walrus Memory. Penalty: ${penalty_amount_sui} SUI.`,
      };
    },
  }),

  /**
   * Tool 2: Recall context from Walrus Memory to inform the current conversation.
   */
  recall_context: tool({
    description:
      "Retrieve relevant cross-session memories from Walrus Memory (past commitments, slip-ups, excuses, patterns).",
    inputSchema: recallContextInputSchema,
    execute: async (input: z.infer<typeof recallContextInputSchema>) => {
      const memories = await walrusService.recall(input.query, 6);
      return {
        query: input.query,
        count: memories.length,
        memories,
      };
    },
  }),

  /**
   * Tool 3: Record an accountability event (slip-up or honored) with emotional context.
   */
  record_accountability_event: tool({
    description:
      "Log whether a commitment was honored or broken, capturing the user's reflection and emotional context in Walrus.",
    inputSchema: recordEventInputSchema,
    execute: async (input: z.infer<typeof recordEventInputSchema>) => {
      const { commitment_id, verdict, user_explanation, penalty_amount_sui } = input;
      const payload: AccountabilityEventPayload = {
        type: "accountability_event",
        commitment_id,
        verdict,
        user_explanation,
        penalty_deposited_sui: verdict === "broken" ? penalty_amount_sui : 0,
        timestamp: new Date().toISOString(),
      };

      const result = await walrusService.remember(payload);
      return {
        verdict,
        walrus_job_id: result.jobId,
        walrus_blob_id: result.blobId,
        penalty_triggered: verdict === "broken",
        penalty_amount_sui: payload.penalty_deposited_sui,
        message:
          verdict === "broken"
            ? `Broken commitment recorded. ${penalty_amount_sui} SUI will be routed to your personal vault.`
            : `Commitment recorded as ${verdict}. Memory saved to Walrus.`,
      };
    },
  }),

  /**
   * Tool 4: Inspect current Sui Vault status using Tatum RPC.
   */
  check_vault_status: tool({
    description:
      "Query live on-chain vault balance and lock duration from Sui via Tatum RPC.",
    inputSchema: checkVaultInputSchema,
    execute: async (input: z.infer<typeof checkVaultInputSchema>) => {
      const targetId = input.vault_object_id || process.env.VAULT_OBJECT_ID || "";
      if (!targetId || targetId.includes("your_")) {
        return {
          status: "simulated",
          balance_sui: 15.0,
          unlock_date: "2026-12-31T23:59:59.000Z",
          is_unlocked: false,
          note: "Running in preview mode until VAULT_OBJECT_ID is deployed on Sui.",
        };
      }

      const state = await tatumService.getVaultState(targetId);
      if (!state) {
        return { error: `Could not fetch vault ${targetId} from Tatum Sui RPC.` };
      }

      return {
        vault_object_id: state.objectId,
        balance_sui: state.balanceSui,
        unlock_date: state.unlockDate,
        is_unlocked: state.isUnlocked,
      };
    },
  }),
};
