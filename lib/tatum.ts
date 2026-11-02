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

export class TatumSuiService {
  private rpcUrl: string;
  private apiKey: string | null;

  constructor() {
    this.apiKey = process.env.TATUM_API_KEY && !process.env.TATUM_API_KEY.includes("your_")
      ? process.env.TATUM_API_KEY
      : null;

    // Use Tatum Sui RPC if API key present, otherwise public Sui RPC fallback for testing
    this.rpcUrl = this.apiKey
      ? (process.env.TATUM_SUI_RPC_URL || "https://api.tatum.io/v3/blockchain/node/sui-mainnet")
      : "https://fullnode.mainnet.sui.io:443";
  }

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
   * Retrieves all token balances for a given Sui wallet address.
   */
  public async getWalletBalances(address: string): Promise<SuiCoinBalance[]> {
    if (!address || !address.startsWith("0x")) {
      return [];
    }
    return await this.rpcCall<SuiCoinBalance[]>("suix_getAllBalances", [address]);
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
