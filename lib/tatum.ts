import dns from "node:dns";
import { SuiGraphQLClient } from "@mysten/sui/graphql";

// Ensure Node.js uses fast, resilient public DNS servers for external API calls
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Graceful no-op in non-Node or restricted environments
}

export interface SuiCoinBalance {
  coinType: string;
  coinObjectCount: number;
  totalBalance: string;
}

export interface VaultState {
  objectId: string;
  owner: string;
  balanceSui: number;
  unlockTimestampMs: number;
  isUnlocked: boolean;
  unlockDate: string;
}

export interface TatumRpcResponse<T> {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
  };
}

export interface TatumExecutionResult {
  digest: string;
  status: string;
  timestamp?: string;
  executionError?: string | null;
  explorerUrl: string;
}

export class TatumSuiService {
  private rpcUrl: string;
  private gatewayUrl: string;
  private apiKey: string | null;
  private gqlClient: SuiGraphQLClient;

  constructor() {
    this.apiKey =
      process.env.TATUM_API_KEY && !process.env.TATUM_API_KEY.includes("your_")
        ? process.env.TATUM_API_KEY
        : null;

    this.gatewayUrl =
      process.env.TATUM_SUI_GATEWAY_URL ||
      "https://sui-mainnet.gateway.tatum.io/graphql";

    this.rpcUrl =
      this.apiKey && process.env.TATUM_SUI_RPC_URL
        ? process.env.TATUM_SUI_RPC_URL
        : "https://fullnode.mainnet.sui.io:443";

    const headers: Record<string, string> = {};
    if (this.apiKey) {
      headers["x-api-key"] = this.apiKey;
    }

    this.gqlClient = new SuiGraphQLClient({
      url: this.gatewayUrl,
      headers,
    });
  }

  /**
   * Returns the initialized Sui GraphQL Client backed by Tatum Gateway.
   */
  public getGraphQLClient(): SuiGraphQLClient {
    return this.gqlClient;
  }

  /**
   * Returns whether a valid Tatum API key is configured.
   */
  public hasTatumKey(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Internal JSON-RPC fallback caller for legacy nodes.
   */
  private async rpcCall<T>(method: string, params: unknown[]): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers["x-api-key"] = this.apiKey;
    }

    const response = await fetch(this.rpcUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method,
        params,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Tatum Sui RPC HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as TatumRpcResponse<T>;

    if (data.error) {
      throw new Error(`Tatum Sui RPC Error [${data.error.code}]: ${data.error.message}`);
    }

    return data.result as T;
  }

  /**
   * Retrieves all token balances for a given Sui wallet address via Tatum GraphQL Gateway.
   */
  public async getWalletBalances(address: string): Promise<SuiCoinBalance[]> {
    if (!address || !address.startsWith("0x")) {
      return [];
    }

    try {
      const query = `
        query GetBalances($address: SuiAddress!) {
          address(address: $address) {
            balances {
              nodes {
                coinType {
                  repr
                }
                totalBalance
              }
            }
          }
        }
      `;

      const result = await this.gqlClient.query<{
        address?: {
          balances?: {
            nodes?: Array<{
              coinType: { repr: string };
              totalBalance: string;
            }>;
          };
        };
      }>({
        query,
        variables: { address },
      });

      const nodes = result?.data?.address?.balances?.nodes;
      if (nodes && Array.isArray(nodes)) {
        return nodes.map((n) => ({
          coinType: n.coinType.repr,
          coinObjectCount: 1,
          totalBalance: n.totalBalance,
        }));
      }
    } catch (gqlErr) {
      console.warn("[Tatum Gateway] GraphQL balance query notice, trying RPC fallback:", gqlErr);
    }

    // Fallback to JSON-RPC if GraphQL is unavailable
    try {
      return await this.rpcCall<SuiCoinBalance[]>("suix_getAllBalances", [address]);
    } catch {
      return [];
    }
  }

  /**
   * Helper to retrieve SUI token balance formatted as a float.
   */
  public async getSuiBalance(address: string): Promise<number> {
    const balances = await this.getWalletBalances(address);
    const suiCoin = balances.find(
      (b) => b.coinType === "0x2::sui::SUI" || b.coinType.endsWith("::sui::SUI")
    );
    if (!suiCoin) return 0;
    const mist = BigInt(suiCoin.totalBalance || "0");
    return Number(mist) / 1_000_000_000;
  }

  /**
   * Executes a signed Sui Programmable Transaction Block via Tatum Gateway GraphQL mutation.
   */
  public async executeTransaction(
    transactionDataBcs: string,
    signatures: string[]
  ): Promise<TatumExecutionResult> {
    const mutation = `
      mutation ExecuteTx($txBcs: Base64!, $sigs: [Base64!]!) {
        executeTransaction(transactionDataBcs: $txBcs, signatures: $sigs) {
          effects {
            digest
            status
            timestamp
            executionError
          }
        }
      }
    `;

    const result = await this.gqlClient.query<{
      executeTransaction?: {
        effects?: {
          digest?: string;
          status?: string;
          timestamp?: string;
          executionError?: string | null;
        };
      };
    }>({
      query: mutation,
      variables: {
        txBcs: transactionDataBcs,
        sigs: signatures,
      },
    });

    const effects = result?.data?.executeTransaction?.effects;
    if (!effects || !effects.digest) {
      throw new Error(
        effects?.executionError ||
          "Tatum Sui Gateway did not return a valid transaction digest"
      );
    }

    return {
      digest: effects.digest,
      status: effects.status || "SUCCESS",
      timestamp: effects.timestamp,
      executionError: effects.executionError,
      explorerUrl: `https://suiscan.xyz/mainnet/tx/${effects.digest}`,
    };
  }

  /**
   * Reads and parses on-chain state for a Yearbound Vault shared object.
   */
  public async getVaultState(vaultObjectId: string): Promise<VaultState | null> {
    if (!vaultObjectId || !vaultObjectId.startsWith("0x")) {
      return null;
    }

    try {
      const rawObject = await this.rpcCall<{
        data?: {
          objectId: string;
          content?: {
            fields?: {
              owner?: string;
              balance?: string | number;
              unlock_timestamp_ms?: string | number;
            };
          };
        };
      }>("sui_getObject", [
        vaultObjectId,
        {
          showType: true,
          showContent: true,
          showOwner: true,
        },
      ]);

      const fields = rawObject?.data?.content?.fields;
      if (!fields) {
        return null;
      }

      const balanceMist = Number(fields.balance || 0);
      const balanceSui = balanceMist / 1_000_000_000;
      const unlockMs = Number(fields.unlock_timestamp_ms || 0);
      const now = Date.now();

      return {
        objectId: vaultObjectId,
        owner: String(fields.owner || ""),
        balanceSui,
        unlockTimestampMs: unlockMs,
        isUnlocked: now >= unlockMs,
        unlockDate: new Date(unlockMs).toISOString(),
      };
    } catch (err) {
      console.warn("Failed to query vault object via Tatum RPC:", err);
      return null;
    }
  }

  /**
   * Queries recent transaction blocks from an address to monitor spending activity.
   */
  public async getRecentTransactions(address: string, limit: number = 10): Promise<unknown[]> {
    if (!address || !address.startsWith("0x")) return [];

    try {
      const query = `
        query GetRecentTx($address: SuiAddress!, $first: Int) {
          address(address: $address) {
            transactions(first: $first) {
              nodes {
                digest
                effects {
                  status
                  timestamp
                }
              }
            }
          }
        }
      `;

      const result = await this.gqlClient.query<{
        address?: {
          transactions?: {
            nodes?: unknown[];
          };
        };
      }>({
        query,
        variables: { address, first: limit },
      });

      const nodes = result?.data?.address?.transactions?.nodes;
      if (nodes && Array.isArray(nodes)) {
        return nodes;
      }
    } catch {
      // Fallback to JSON-RPC if GraphQL encounters an error
    }

    try {
      const response = await this.rpcCall<{ data: unknown[] }>("suix_queryTransactionBlocks", [
        { filter: { FromAddress: address } },
        null,
        limit,
        true,
      ]);
      return response?.data || [];
    } catch (err) {
      console.warn("Failed to query transaction blocks via Tatum RPC:", err);
      return [];
    }
  }
}

export const tatumService = new TatumSuiService();
