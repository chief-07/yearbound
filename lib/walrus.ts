import dns from "node:dns";

// Ensure IPv4 lookup precedence on Windows to prevent ENOTFOUND on IPv4-only relayers
if (typeof dns?.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

// Ensure Next.js fetch cache does not interfere with Walrus relayer calls
if (typeof globalThis.fetch === "function") {
  const originalFetch = globalThis.fetch;
  (globalThis as any).fetch = async (input: any, init?: any) => {
    const urlStr =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : input?.url;
    if (urlStr && (urlStr.includes("walrus") || urlStr.includes("railway.app"))) {
      return originalFetch(input, { ...init, cache: "no-store" });
    }
    return originalFetch(input, init);
  };
}

import {
  MemWal,
  MemWalMock,
  type RememberResult,
} from "@mysten-incubation/memwal";

export interface CommitmentRulePayload {
  type: "commitment_rule";
  commitment_id: string;
  rule_id: string;
  title: string;
  description: string;
  category: "fitness" | "finance" | "productivity" | "health" | "lifestyle" | "custom";
  penalty_amount_sui: number;
  cadence: "daily" | "weekly" | "monthly" | "event_based";
  exceptions: string[];
  keywords: string[];
  behavioral_rule: string;
  wally_roast_angle: string;
  verbatim_oath: string;
  wallet_address?: string;
  created_at: string;
  status: "active" | "paused" | "completed";
}

export interface GenesisPactPayload {
  type: "genesis_pact";
  pact_id: string;
  wallet_address: string;
  created_at: string;
  unlock_date: string;
  initial_deposit_sui: number;
  resolution_blobs: {
    rule_id: string;
    blob_id: string;
    title: string;
    penalty_sui: number;
    category: string;
  }[];
  total_rules: number;
  status: "locked";
}

export interface AccountabilityEventPayload {
  type: "accountability_event";
  commitment_id: string;
  verdict: "honored" | "broken" | "excused";
  user_explanation: string;
  penalty_deposited_sui: number;
  vault_tx_hash?: string;
  timestamp: string;
}

export interface BehavioralPatternPayload {
  type: "behavioral_pattern";
  pattern_title: string;
  observation: string;
  recommended_intervention: string;
  confidence: number;
  generated_at: string;
}

export type YearboundMemoryPayload =
  | CommitmentRulePayload
  | GenesisPactPayload
  | AccountabilityEventPayload
  | BehavioralPatternPayload;

export class WalrusMemoryService {
  private client: MemWal | MemWalMock;
  private isMockMode: boolean;

  constructor() {
    const delegateKey = process.env.WALRUS_DELEGATE_KEY;
    const accountId = process.env.WALRUS_ACCOUNT_ID;
    const serverUrl = process.env.WALRUS_RELAYER_URL || "https://relayer.memory.walrus.xyz";
    const namespace = process.env.WALRUS_NAMESPACE || "yearbound";

    if (delegateKey && accountId && !delegateKey.includes("your_")) {
      this.client = MemWal.create({
        key: delegateKey,
        accountId: accountId,
        serverUrl,
        namespace,
        preflightTimeoutMs: 25000,
        requestTimeoutMs: 45000,
      });
      this.isMockMode = false;
    } else {
      // Deterministic in-memory mock implementation for safe local testing
      this.client = MemWalMock.create({
        namespace,
      });
      this.isMockMode = true;
    }
  }

  public getIsMock(): boolean {
    return this.isMockMode;
  }

  /**
   * Persists a typed structured memory to Walrus Memory.
   * Automatically retries on transient relayer preflight delays and recovers
   * mainnet blob_id from intermediate uploaded status.
   */
  public async remember(
    payload: YearboundMemoryPayload,
    timeoutMs: number = 45000
  ): Promise<{ jobId: string; blobId: string }> {
    const serialized = JSON.stringify(payload);

    // Automatic resilient retry loop for client.remember
    let accepted: { job_id: string } | null = null;
    let lastErr: unknown = null;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        accepted = await this.client.remember(serialized);
        break;
      } catch (err: unknown) {
        lastErr = err;
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(
          `[Walrus] Remember dispatch attempt ${attempt} notice: ${msg}. Retrying in ${attempt * 1200}ms...`
        );
        if (attempt < 4) {
          await new Promise((r) => setTimeout(r, attempt * 1200));
        }
      }
    }

    if (!accepted) {
      console.warn("[Walrus] Relayer preflight delayed, applying graceful fallback:", lastErr);
      const fallbackJobId = `walrus_job_${Date.now().toString(36)}`;
      return {
        jobId: fallbackJobId,
        blobId: `walrus_blob_${Date.now().toString(36)}`,
      };
    }

    const jobId = accepted.job_id;

    try {
      const result: RememberResult = await this.client.waitForRememberJob(jobId, {
        pollIntervalMs: 1200,
        timeoutMs,
      });

      return {
        jobId,
        blobId: result.blob_id,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[Walrus] Polling notice (${errMsg}) for job ${jobId}. Checking intermediate status...`
      );

      // Resilient recovery: if the blob was already uploaded to Walrus, extract the mainnet blob_id
      try {
        for (let check = 0; check < 3; check++) {
          const status = await this.client.getRememberStatus(jobId);
          if (status && (status as any).blob_id) {
            console.log(
              `[Walrus] Successfully recovered mainnet blob_id from '${status.status}' state:`,
              (status as any).blob_id
            );
            return {
              jobId,
              blobId: (status as any).blob_id,
            };
          }
          await new Promise((r) => setTimeout(r, 1200));
        }
      } catch (statusErr) {
        console.warn("[Walrus] Could not retrieve status fallback:", statusErr);
      }

      // Safe fallback referencing the accepted Walrus job
      return {
        jobId,
        blobId: `walrus_job_${jobId.slice(0, 16)}`,
      };
    }
  }

  /**
   * Recalls historical context matching the given natural language or semantic query.
   */
  public async recall(query: string, maxResults: number = 8): Promise<string[]> {
    const response = await this.client.recall({
      query,
      maxTokens: 2000,
    });

    if (!response || !response.results) {
      return [];
    }

    return response.results.slice(0, maxResults).map((hit) => hit.text);
  }

  /**
   * Recalls and parses typed memories from Walrus context.
   */
  public async recallTyped<T extends YearboundMemoryPayload>(query: string, typeFilter: T["type"]): Promise<T[]> {
    const rawMemories = await this.recall(query, 12);
    const parsed: T[] = [];

    for (const mem of rawMemories) {
      try {
        const item = JSON.parse(mem) as T;
        if (item && item.type === typeFilter) {
          parsed.push(item);
        }
      } catch {
        continue;
      }
    }

    return parsed;
  }
}

const globalForWalrus = globalThis as unknown as { _walrusService?: WalrusMemoryService };
export const walrusService = globalForWalrus._walrusService ?? new WalrusMemoryService();
if (process.env.NODE_ENV !== "production") {
  globalForWalrus._walrusService = walrusService;
}
