import {
  MemWal,
  MemWalMock,
  type RememberResult,
} from "@mysten-incubation/memwal";

export interface CommitmentRulePayload {
  type: "commitment_rule";
  commitment_id: string;
  title: string;
  description: string;
  category: "fitness" | "finance" | "productivity" | "health" | "custom";
  penalty_amount_sui: number;
  cadence: "daily" | "weekly" | "monthly" | "event_based";
  exceptions: string[];
  created_at: string;
  status: "active" | "paused" | "completed";
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
  | AccountabilityEventPayload
  | BehavioralPatternPayload;

export class WalrusMemoryService {
  private client: MemWal | MemWalMock;
  private isMockMode: boolean;

  constructor() {
    const delegateKey = process.env.WALRUS_DELEGATE_KEY;
    const accountId = process.env.WALRUS_ACCOUNT_ID;
    const serverUrl = process.env.WALRUS_RELAYER_URL || "https://relayer.walrus.space";
    const namespace = process.env.WALRUS_NAMESPACE || "yearbound";

    if (delegateKey && accountId && !delegateKey.includes("your_")) {
      this.client = MemWal.create({
        key: delegateKey,
        accountId: accountId,
        serverUrl,
        namespace,
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
   * Awaits job completion to guarantee persistence.
   */
  public async remember(payload: YearboundMemoryPayload): Promise<{ jobId: string; blobId: string }> {
    const serialized = JSON.stringify(payload);
    const accepted = await this.client.remember(serialized);
    const result: RememberResult = await this.client.waitForRememberJob(accepted.job_id);

    return {
      jobId: accepted.job_id,
      blobId: result.blob_id,
    };
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

export const walrusService = new WalrusMemoryService();
