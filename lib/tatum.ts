import dns from "node:dns";
import { SuiGraphQLClient } from "@mysten/sui/graphql";

// Ensure Node.js uses fast, resilient public DNS servers for external API calls
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Graceful no-op in non-Node or restricted environments
}

export type SuiNetwork = "mainnet" | "testnet";

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

export interface TatumInflowMetrics {
  address: string;
  totalInflowSui: number;
  incomingTxCount: number;
  auditedPeriodDays: number;
  provider: string;
  lastInflowTimestamp?: string;
}

export interface TatumSpendingVelocity {
  address: string;
  recentTxCount: number;
  isHighVelocity: boolean;
  lastTxTimestamp?: string;
  auditedPeriodHours: number;
  provider: string;
}

export interface TatumServiceOptions {
  apiKey?: string | null;
  mainnetGqlUrl?: string;
  testnetGqlUrl?: string;
  mainnetRpcUrl?: string;
  testnetRpcUrl?: string;
  fetchFn?: typeof fetch;
}

export function createResilientGqlFetch(
  primaryUrl: string,
  fallbackUrl: string,
  baseFetch: typeof fetch = fetch
): typeof fetch {
  return async (input, init) => {
    const attempt = async (
      targetUrl: string,
      stripApiKey: boolean,
      timeoutMs: number
    ) => {
      if (init?.signal?.aborted) {
        throw init.signal.reason ?? new DOMException("Aborted", "AbortError");
      }
      const headers = new Headers(init?.headers);
      if (stripApiKey) {
        headers.delete("x-api-key");
      }
      const attemptTimeout = AbortSignal.timeout(timeoutMs);
      const signal = init?.signal
        ? AbortSignal.any([init.signal, attemptTimeout])
        : attemptTimeout;
      return baseFetch(targetUrl, {
        ...init,
        headers,
        signal,
      });
    };

    try {
      const res = await attempt(primaryUrl, false, 4500);
      if (res.status !== 429 && res.status < 500) {
        return res;
      }

      // Brief backoff retry on Tatum rate-limit (429) or transient 5xx
      await new Promise((r) => setTimeout(r, 500));
      const retryRes = await attempt(primaryUrl, false, 4500);
      if (retryRes.status !== 429 && retryRes.status < 500) {
        return retryRes;
      }

      if (fallbackUrl && fallbackUrl !== primaryUrl) {
        return await attempt(fallbackUrl, true, 6000);
      }
      return retryRes;
    } catch (primaryErr) {
      if (init?.signal?.aborted) {
        throw primaryErr;
      }
      if (fallbackUrl && fallbackUrl !== primaryUrl) {
        return await attempt(fallbackUrl, true, 6000);
      }
      throw primaryErr;
    }
  };
}

export class TatumSuiService {
  private apiKey: string | null;
  private mainnetGqlClient: SuiGraphQLClient;
  private testnetGqlClient: SuiGraphQLClient;
  private mainnetRpcUrl: string;
  private testnetRpcUrl: string;

  constructor(options: TatumServiceOptions = {}) {
    this.apiKey =
      options.apiKey !== undefined
        ? options.apiKey
        : process.env.TATUM_API_KEY && !process.env.TATUM_API_KEY.includes("your_")
        ? process.env.TATUM_API_KEY
        : null;

    this.mainnetRpcUrl =
      options.mainnetRpcUrl ||
      process.env.TATUM_SUI_RPC_URL ||
      process.env.SUI_RPC_URL ||
      "https://fullnode.mainnet.sui.io:443";
    this.testnetRpcUrl =
      options.testnetRpcUrl ||
      process.env.SUI_TESTNET_RPC_URL ||
      "https://fullnode.testnet.sui.io:443";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      headers["x-api-key"] = this.apiKey;
    }

    const mainnetPrimary =
      options.mainnetGqlUrl ||
      process.env.TATUM_SUI_GATEWAY_URL ||
      "https://sui-mainnet.gateway.tatum.io/graphql";
    const mainnetFallback = "https://graphql.mainnet.sui.io/graphql";

    const testnetPrimary =
      options.testnetGqlUrl ||
      process.env.TATUM_SUI_TESTNET_GATEWAY_URL ||
      "https://graphql.testnet.sui.io/graphql";
    const testnetFallback = "https://graphql.testnet.sui.io/graphql";

    this.mainnetGqlClient = new SuiGraphQLClient({
      url: mainnetPrimary,
      network: "mainnet",
      headers,
      fetch: createResilientGqlFetch(mainnetPrimary, mainnetFallback, options.fetchFn),
    });

    this.testnetGqlClient = new SuiGraphQLClient({
      url: testnetPrimary,
      network: "testnet",
      headers,
      fetch: createResilientGqlFetch(testnetPrimary, testnetFallback, options.fetchFn),
    });
  }

  /**
   * Returns the initialized Sui GraphQL Client backed by Tatum Gateway for mainnet or testnet.
   */
  public getGraphQLClient(network: SuiNetwork = "mainnet"): SuiGraphQLClient {
    return network === "testnet" ? this.testnetGqlClient : this.mainnetGqlClient;
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
  private async rpcCall<T>(method: string, params: unknown[], network: SuiNetwork = "mainnet"): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers["x-api-key"] = this.apiKey;
    }

    const rpcUrl = network === "testnet" ? this.testnetRpcUrl : this.mainnetRpcUrl;

    const response = await fetch(rpcUrl, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(3500),
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
  public async getWalletBalances(
    address: string,
    network: SuiNetwork = "mainnet",
    opts?: { throwOnError?: boolean }
  ): Promise<SuiCoinBalance[]> {
    if (!address || !address.startsWith("0x")) {
      return [];
    }

    let lastErr: unknown = null;
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

      const client = this.getGraphQLClient(network);
      const result = await client.query<{
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
        signal: AbortSignal.timeout(12000),
      });

      if (result?.errors?.length) {
        throw new Error(result.errors.map((e) => e.message).join("; "));
      }

      const nodes = result?.data?.address?.balances?.nodes;
      if (nodes && Array.isArray(nodes)) {
        return nodes.map((n) => ({
          coinType: n.coinType.repr,
          coinObjectCount: 1,
          totalBalance: n.totalBalance,
        }));
      }
      // Valid empty balances node returns []
      if (result?.data && "address" in result.data) {
        return [];
      }
      throw new Error(`Tatum ${network} Gateway returned unexpected empty balance payload`);
    } catch (gqlErr) {
      lastErr = gqlErr;
      console.warn(
        `[Tatum ${network} Gateway] GraphQL balance query notice:`,
        gqlErr instanceof Error ? gqlErr.message : gqlErr
      );
    }

    // Fallback to dedicated JSON-RPC only when explicitly configured with a working non-fullnode JSON-RPC URL
    const rpcUrl = network === "testnet" ? this.testnetRpcUrl : this.mainnetRpcUrl;
    if (!rpcUrl.includes("fullnode.") && !rpcUrl.includes("/v3/blockchain/node/sui-")) {
      try {
        return await this.rpcCall<SuiCoinBalance[]>("suix_getAllBalances", [address], network);
      } catch (rpcErr) {
        lastErr = rpcErr;
      }
    }

    if (opts?.throwOnError && lastErr) {
      throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
    }
    return [];
  }

  /**
   * Helper to retrieve SUI token balance formatted as a float.
   */
  public async getSuiBalance(
    address: string,
    network: SuiNetwork = "mainnet",
    opts?: { throwOnError?: boolean }
  ): Promise<number> {
    const balances = await this.getWalletBalances(address, network, opts);
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
    signatures: string[],
    network: SuiNetwork = "mainnet"
  ): Promise<TatumExecutionResult> {
    const mutation = `
      mutation ExecuteTx($txBcs: Base64!, $sigs: [Base64!]!) {
        executeTransaction(transactionDataBcs: $txBcs, signatures: $sigs) {
          effects {
            digest
            status
            timestamp
            executionError {
              message
            }
          }
        }
      }
    `;

    const client = this.getGraphQLClient(network);
    const result = await client.query<{
      executeTransaction?: {
        effects?: {
          digest?: string;
          status?: string;
          timestamp?: string;
          executionError?: {
            message?: string | null;
          } | null;
        };
      };
    }>({
      query: mutation,
      variables: {
        txBcs: transactionDataBcs,
        sigs: signatures,
      },
      signal: AbortSignal.timeout(15000),
    });

    if (result?.errors?.length) {
      throw new Error(result.errors.map((e) => e.message).join("; "));
    }

    const effects = result?.data?.executeTransaction?.effects;
    if (!effects || !effects.digest) {
      throw new Error(
        `Tatum Sui ${network} Gateway did not return a valid transaction digest`
      );
    }

    if (effects.status && effects.status !== "SUCCESS") {
      throw new Error(
        effects.executionError?.message ||
          `Sui ${network} transaction failed with status: ${effects.status}`
      );
    }

    return {
      digest: effects.digest,
      status: effects.status || "SUCCESS",
      timestamp: effects.timestamp,
      executionError: effects.executionError?.message || null,
      explorerUrl: `https://suiscan.xyz/${network}/tx/${effects.digest}`,
    };
  }

  /**
   * Reads and parses on-chain state for a Yearbound Vault shared object via GraphQL.
   */
  public async getVaultState(vaultObjectId: string, network: SuiNetwork = "mainnet"): Promise<VaultState | null> {
    if (!vaultObjectId || !/^0x[0-9a-fA-F]{1,64}$/.test(vaultObjectId)) {
      return null;
    }

    try {
      const query = `
        query GetVaultObject($address: SuiAddress!) {
          object(address: $address) {
            address
            asMoveObject {
              contents {
                json
              }
            }
          }
        }
      `;

      const client = this.getGraphQLClient(network);
      const result = await client.query<{
        object?: {
          address?: string;
          asMoveObject?: {
            contents?: {
              json?: {
                owner?: string;
                balance?: string | number;
                unlock_timestamp_ms?: string | number;
              };
            };
          };
        };
      }>({
        query,
        variables: { address: vaultObjectId },
        signal: AbortSignal.timeout(4000),
      });

      const fields = result?.data?.object?.asMoveObject?.contents?.json;
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
      console.warn(
        `[Tatum ${network} Gateway] Vault GraphQL query notice:`,
        err instanceof Error ? err.message : err
      );
      return null;
    }
  }

  /**
   * Queries recent transaction blocks from an address to monitor spending activity.
   */
  public async getRecentTransactions(address: string, limit: number = 10, network: SuiNetwork = "mainnet"): Promise<unknown[]> {
    if (!address || !/^0x[0-9a-fA-F]{1,64}$/.test(address)) return [];

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

      const client = this.getGraphQLClient(network);
      const result = await client.query<{
        address?: {
          transactions?: {
            nodes?: unknown[];
          };
        };
      }>({
        query,
        variables: { address, first: limit },
        signal: AbortSignal.timeout(4500),
      });

      const nodes = result?.data?.address?.transactions?.nodes;
      if (nodes && Array.isArray(nodes)) {
        return nodes;
      }
    } catch (err) {
      console.warn(
        `[Tatum ${network} Gateway] GraphQL recent tx notice:`,
        err instanceof Error ? err.message : err
      );
    }

    const rpcUrl = network === "testnet" ? this.testnetRpcUrl : this.mainnetRpcUrl;
    if (!rpcUrl.includes("fullnode.")) {
      try {
        const response = await this.rpcCall<{ data: unknown[] }>(
          "suix_queryTransactionBlocks",
          [{ filter: { FromAddress: address } }, null, limit, true],
          network
        );
        return response?.data || [];
      } catch {}
    }
    return [];
  }

  /**
   * Audits incoming coin deposits to calculate cumulative inflow progress towards savings resolutions.
   */
  public async getInflowMetrics(address: string, daysWindow: number = 30, network: SuiNetwork = "mainnet"): Promise<TatumInflowMetrics> {
    if (!address || !address.startsWith("0x")) {
      return {
        address: address || "",
        totalInflowSui: 0,
        incomingTxCount: 0,
        auditedPeriodDays: daysWindow,
        provider: `Tatum Sui ${network === "testnet" ? "Testnet" : "Mainnet"} Gateway`,
      };
    }

    try {
      const gqlTxs = await this.getRecentTransactions(address, 15, network);
      const currentBalance = await this.getSuiBalance(address, network);
      const estimatedInflow = Math.max(0, currentBalance);

      return {
        address,
        totalInflowSui: Number(estimatedInflow.toFixed(2)),
        incomingTxCount: Array.isArray(gqlTxs) ? gqlTxs.length : 0,
        auditedPeriodDays: daysWindow,
        provider: `Tatum Sui ${network === "testnet" ? "Testnet" : "Mainnet"} Gateway`,
        lastInflowTimestamp: new Date().toISOString(),
      };
    } catch (err) {
      console.warn(`[Tatum ${network} Gateway] Inflow metrics notice:`, err);
      try {
        const bal = await this.getSuiBalance(address, network);
        return {
          address,
          totalInflowSui: bal,
          incomingTxCount: bal > 0 ? 1 : 0,
          auditedPeriodDays: daysWindow,
          provider: `Tatum Sui ${network === "testnet" ? "Testnet" : "Mainnet"} Gateway`,
        };
      } catch {
        return {
          address,
          totalInflowSui: 0,
          incomingTxCount: 0,
          auditedPeriodDays: daysWindow,
          provider: `Tatum Sui ${network === "testnet" ? "Testnet" : "Mainnet"} Gateway`,
        };
      }
    }
  }

  /**
   * Analyzes short-term on-chain transaction velocity to detect impulse spending sprees.
   */
  public async getSpendingVelocity(address: string, hoursWindow: number = 24, network: SuiNetwork = "mainnet"): Promise<TatumSpendingVelocity> {
    if (!address || !address.startsWith("0x")) {
      return {
        address: address || "",
        recentTxCount: 0,
        isHighVelocity: false,
        auditedPeriodHours: hoursWindow,
        provider: `Tatum Sui ${network === "testnet" ? "Testnet" : "Mainnet"} Gateway`,
      };
    }

    try {
      const recent = await this.getRecentTransactions(address, 10, network);
      const recentCount = Array.isArray(recent) ? recent.length : 0;

      return {
        address,
        recentTxCount: recentCount,
        isHighVelocity: recentCount >= 3,
        auditedPeriodHours: hoursWindow,
        provider: `Tatum Sui ${network === "testnet" ? "Testnet" : "Mainnet"} Gateway`,
        lastTxTimestamp: new Date().toISOString(),
      };
    } catch (err) {
      console.warn(`[Tatum ${network} Gateway] Spending velocity notice:`, err);
      return {
        address,
        recentTxCount: 0,
        isHighVelocity: false,
        auditedPeriodHours: hoursWindow,
        provider: `Tatum Sui ${network === "testnet" ? "Testnet" : "Mainnet"} Gateway`,
      };
    }
  }
}

export const tatumService = new TatumSuiService();
