import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import {
  DEFAULT_GENESIS_PLEDGE_SUI,
  MAINNET_DUAL_TX_GAS_BUFFER_SUI,
  MAINNET_MIN_GAS_BUFFER_SUI,
  checkMainnetPenaltySolvency,
  checkMainnetTransferReadiness,
  getVaultDisplayState,
} from "@/lib/real-account";
import {
  YEARBOUND_VAULT_ADDRESS,
  YEARBOUND_TESTNET_VAULT_ADDRESS,
  createX402Challenge,
  executeX402VaultDeposit,
  verifyAndSettleX402Payment,
} from "@/lib/vault-x402";
import {
  executeTransferWithExtension,
  getDemoWalletInfo,
  getRealWalletInfo,
  signPayloadWithWallet,
} from "@/lib/wallet";
import { TatumSuiService } from "@/lib/tatum";

const VALID_MAINNET_RECIPIENT =
  "0x7e8b61fb9706dc7d455823ca8745581290333333333333333333333333332026";

describe("Real Account State & Solvency Rules (lib/real-account.ts)", () => {
  it("reports 0.00 SUI vault for an unfunded fresh Mainnet Real Account", () => {
    const state = getVaultDisplayState({
      accountType: "real",
      escrowDeposit: 0,
      initialPledgeSui: 0,
      availableBalance: 0,
    });

    assert.equal(state.totalLockedSui, 0);
    assert.equal(state.initialPledgeSui, 0);
    assert.equal(state.infractionTollsSui, 0);
    assert.equal(state.explorerNetwork, "mainnet");
    assert.equal(state.vaultContractAddress, YEARBOUND_VAULT_ADDRESS);
    assert.equal(
      state.explorerAccountUrl,
      `https://suiscan.xyz/mainnet/account/${YEARBOUND_VAULT_ADDRESS}`
    );
    assert.equal(state.isUnfundedMainnetVault, true);
    assert.equal(state.canFundGenesisPledge, false);
    assert.match(state.settlementGatewayLabel, /Tatum Sui Mainnet Gateway/);
  });

  it("enables the optional 0.20 SUI Genesis Pledge action only once Mainnet balance covers pledge + dual-tx gas", () => {
    const underfunded = getVaultDisplayState({
      accountType: "real",
      escrowDeposit: 0,
      initialPledgeSui: 0,
      availableBalance: DEFAULT_GENESIS_PLEDGE_SUI, // lacks 0.005 SUI gas buffer
    });
    assert.equal(underfunded.canFundGenesisPledge, false);

    const funded = getVaultDisplayState({
      accountType: "real",
      escrowDeposit: 0,
      initialPledgeSui: 0,
      availableBalance:
        DEFAULT_GENESIS_PLEDGE_SUI + MAINNET_DUAL_TX_GAS_BUFFER_SUI,
    });
    assert.equal(funded.canFundGenesisPledge, true);

    const alreadyLocked = getVaultDisplayState({
      accountType: "real",
      escrowDeposit: DEFAULT_GENESIS_PLEDGE_SUI,
      initialPledgeSui: DEFAULT_GENESIS_PLEDGE_SUI,
      availableBalance: 1.5,
    });
    assert.equal(alreadyLocked.canFundGenesisPledge, false);
    assert.equal(alreadyLocked.isUnfundedMainnetVault, false);
  });

  it("computes Infraction Tolls relative to actual initialPledgeSui (not hardcoded 0.20)", () => {
    const state = getVaultDisplayState({
      accountType: "linked",
      escrowDeposit: 0.05,
      initialPledgeSui: 0,
      availableBalance: 1.0,
    });

    assert.equal(state.totalLockedSui, 0.05);
    assert.equal(state.initialPledgeSui, 0);
    assert.equal(state.infractionTollsSui, 0.05);
    assert.equal(state.explorerNetwork, "mainnet");
    assert.match(state.settlementGatewayLabel, /Sui Wallet Standard \(Mainnet\)/);
  });

  it("preserves Testnet labeling and blocks Mainnet pledge CTA in Demo mode", () => {
    const demoState = getVaultDisplayState({
      accountType: "demo",
      escrowDeposit: 0.2,
      initialPledgeSui: 0.2,
      availableBalance: 2.0,
    });

    assert.equal(demoState.explorerNetwork, "testnet");
    assert.equal(demoState.vaultContractAddress, YEARBOUND_TESTNET_VAULT_ADDRESS);
    assert.equal(demoState.canFundGenesisPledge, false);
    assert.equal(demoState.isUnfundedMainnetVault, false);
  });

  it("rejects free-text recipients and enforces Mainnet gas buffer for real/linked transfers", () => {
    const invalidText = checkMainnetTransferReadiness({
      accountType: "real",
      amountSui: 0.05,
      availableBalance: 1.0,
      recipient: "Sarah",
    });
    assert.equal(invalidText.ready, false);

    const shortHex = checkMainnetTransferReadiness({
      accountType: "linked",
      amountSui: 0.05,
      availableBalance: 1.0,
      recipient: "0x1234",
    });
    assert.equal(shortHex.ready, false);

    // Demo mode keeps convenient free-text contact mapping
    const demoText = checkMainnetTransferReadiness({
      accountType: "demo",
      amountSui: 0.05,
      availableBalance: 1.0,
      recipient: "Sarah",
    });
    assert.equal(demoText.ready, true);

    const insufficientGas = checkMainnetTransferReadiness({
      accountType: "real",
      amountSui: 0.1,
      availableBalance: 0.1 + MAINNET_MIN_GAS_BUFFER_SUI - 0.0005,
      recipient: VALID_MAINNET_RECIPIENT,
    });
    assert.equal(insufficientGas.ready, false);

    const validMainnet = checkMainnetTransferReadiness({
      accountType: "real",
      amountSui: 0.1,
      availableBalance: 0.1 + MAINNET_MIN_GAS_BUFFER_SUI + 0.001,
      recipient: VALID_MAINNET_RECIPIENT,
    });
    assert.equal(validMainnet.ready, true);
  });

  it("enforces combined transfer + penalty + dual-tx gas solvency on Mainnet", () => {
    const shortFunds = checkMainnetPenaltySolvency({
      accountType: "real",
      transferAmountSui: 0.1,
      penaltyAmountSui: 0.05,
      availableBalance: 0.151,
    });
    assert.equal(shortFunds.ok, false);
    assert.equal(shortFunds.requiredSui, 0.155);

    const sufficientFunds = checkMainnetPenaltySolvency({
      accountType: "linked",
      transferAmountSui: 0.1,
      penaltyAmountSui: 0.05,
      availableBalance: 0.16,
    });
    assert.equal(sufficientFunds.ok, true);

    const demoBypass = checkMainnetPenaltySolvency({
      accountType: "demo",
      transferAmountSui: 0.1,
      penaltyAmountSui: 0.05,
      availableBalance: 0,
    });
    assert.equal(demoBypass.ok, true);
  });
});

describe("Wallet Mainnet Metadata & Extension Validation (lib/wallet.ts)", () => {
  it("reports mainnet network on Real wallet and testnet on Demo wallet", () => {
    const realInfo = getRealWalletInfo();
    const demoInfo = getDemoWalletInfo();

    assert.equal(realInfo.mode, "real");
    assert.equal(realInfo.network, "mainnet");
    assert.equal(realInfo.hasSigner, true);
    assert.match(realInfo.address, /^0x[0-9a-f]{64}$/);

    assert.equal(demoInfo.mode, "demo");
    assert.equal(demoInfo.network, "testnet");
    assert.match(demoInfo.address, /^0x[0-9a-f]{64}$/);
  });

  it("requires valid extension signature & digest in linked mode", async (t) => {
    const origWindow = (globalThis as Record<string, unknown>).window;
    t.after(() => {
      if (origWindow === undefined) {
        delete (globalThis as Record<string, unknown>).window;
      } else {
        (globalThis as Record<string, unknown>).window = origWindow;
      }
    });

    (globalThis as Record<string, unknown>).window = {
      suiWallet: {
        signPersonalMessage: async () => ({}), // missing signature
        signAndExecuteTransaction: async () => ({
          digest: "",
          effects: { status: { status: "failure", error: "InsufficientGas" } },
        }),
      },
    };

    await assert.rejects(
      () => signPayloadWithWallet("linked", new TextEncoder().encode("test")),
      /did not return a signature/i
    );

    await assert.rejects(
      () =>
        executeTransferWithExtension({
          recipient: VALID_MAINNET_RECIPIENT,
          amountSui: 0.05,
        }),
      /did not return a transaction digest/i
    );

    (globalThis as Record<string, unknown>).window = {
      suiWallet: {
        signPersonalMessage: async () => ({
          signature: "valid_ext_sig_abc",
          publicKey: "ext_pk",
          address: VALID_MAINNET_RECIPIENT,
        }),
        signAndExecuteTransaction: async () => ({
          digest: "5xP3wQv9R8kLmN2pT6uX1yZ4aB7cD9eF3gH5jK8mN2p",
          effects: { status: { status: "failure", error: "MoveAbort(0)" } },
        }),
      },
    };

    const sigRes = await signPayloadWithWallet(
      "linked",
      new TextEncoder().encode("test")
    );
    assert.equal(sigRes.signature, "valid_ext_sig_abc");

    await assert.rejects(
      () =>
        executeTransferWithExtension({
          recipient: VALID_MAINNET_RECIPIENT,
          amountSui: 0.05,
        }),
      /MoveAbort\(0\)/
    );

    (globalThis as Record<string, unknown>).window = {
      suiWallet: {
        signAndExecuteTransaction: async () => ({
          digest: "5xP3wQv9R8kLmN2pT6uX1yZ4aB7cD9eF3gH5jK8mN2p",
          effects: { status: { status: "success" } },
        }),
      },
    };

    const txRes = await executeTransferWithExtension({
      recipient: VALID_MAINNET_RECIPIENT,
      amountSui: 0.05,
    });
    assert.equal(txRes.digest, "5xP3wQv9R8kLmN2pT6uX1yZ4aB7cD9eF3gH5jK8mN2p");
  });
});

describe("Tatum Sui Gateway Resilience & Execution Checks (lib/tatum.ts)", () => {
  it("parses exact Mainnet balances and throws on outage when throwOnError=true", async () => {
    const emptySvc = new TatumSuiService({
      fetchFn: async () =>
        new Response(
          JSON.stringify({
            data: { address: { balances: { nodes: [] } } },
          }),
          { status: 200 }
        ),
    });
    const zeroBal = await emptySvc.getSuiBalance(
      VALID_MAINNET_RECIPIENT,
      "mainnet",
      { throwOnError: true }
    );
    assert.equal(zeroBal, 0);

    const fundedSvc = new TatumSuiService({
      fetchFn: async () =>
        new Response(
          JSON.stringify({
            data: {
              address: {
                balances: {
                  nodes: [
                    { coinType: { repr: "0x2::sui::SUI" }, totalBalance: "1500000000" },
                  ],
                },
              },
            },
          }),
          { status: 200 }
        ),
    });
    const bal = await fundedSvc.getSuiBalance(
      VALID_MAINNET_RECIPIENT,
      "mainnet",
      { throwOnError: true }
    );
    assert.equal(bal, 1.5);

    const brokenSvc = new TatumSuiService({
      fetchFn: async () =>
        new Response(
          JSON.stringify({ errors: [{ message: "Gateway rate limit" }] }),
          { status: 200 }
        ),
    });
    await assert.rejects(
      () =>
        brokenSvc.getSuiBalance(VALID_MAINNET_RECIPIENT, "mainnet", {
          throwOnError: true,
        }),
      /Gateway rate limit/
    );
  });

  it("retries on HTTP 429 and falls back to official Sui GraphQL with x-api-key stripped", async () => {
    const calls: Array<{ url: string; hasApiKey: boolean }> = [];
    const resilientSvc = new TatumSuiService({
      apiKey: "secret-tatum-key",
      mainnetGqlUrl: "https://sui-mainnet.gateway.tatum.io/graphql",
      fetchFn: async (input, init) => {
        const url = String(input);
        const headers = new Headers(init?.headers);
        calls.push({ url, hasApiKey: headers.has("x-api-key") });
        if (url.includes("tatum.io")) {
          return new Response("Too Many Requests", { status: 429 });
        }
        return new Response(
          JSON.stringify({
            data: {
              address: {
                balances: {
                  nodes: [
                    { coinType: { repr: "0x2::sui::SUI" }, totalBalance: "2500000000" },
                  ],
                },
              },
            },
          }),
          { status: 200 }
        );
      },
    });

    const bal = await resilientSvc.getSuiBalance(
      VALID_MAINNET_RECIPIENT,
      "mainnet",
      { throwOnError: true }
    );

    assert.equal(bal, 2.5);
    assert.equal(calls.length, 3);
    assert.equal(calls[0].url, "https://sui-mainnet.gateway.tatum.io/graphql");
    assert.equal(calls[0].hasApiKey, true);
    assert.equal(calls[1].url, "https://sui-mainnet.gateway.tatum.io/graphql");
    assert.equal(calls[2].url, "https://graphql.mainnet.sui.io/graphql");
    assert.equal(calls[2].hasApiKey, false);
  });

  it("falls back cleanly to official Sui GraphQL when primary Tatum attempt throws TimeoutError", async () => {
    const urlsCalled: string[] = [];
    const svc = new TatumSuiService({
      apiKey: "secret-tatum-key",
      mainnetGqlUrl: "https://sui-mainnet.gateway.tatum.io/graphql",
      fetchFn: async (input, init) => {
        const url = String(input);
        urlsCalled.push(url);
        if (url.includes("tatum.io")) {
          assert.equal(init?.signal?.aborted, false);
          throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
        }
        // Fallback receives a fresh, un-aborted signal
        assert.equal(init?.signal?.aborted, false);
        return new Response(
          JSON.stringify({
            data: {
              address: {
                balances: {
                  nodes: [
                    { coinType: { repr: "0x2::sui::SUI" }, totalBalance: "750000000" },
                  ],
                },
              },
            },
          }),
          { status: 200 }
        );
      },
    });

    const bal = await svc.getSuiBalance(VALID_MAINNET_RECIPIENT, "mainnet", {
      throwOnError: true,
    });
    assert.equal(bal, 0.75);
    assert.deepEqual(urlsCalled, [
      "https://sui-mainnet.gateway.tatum.io/graphql",
      "https://graphql.mainnet.sui.io/graphql",
    ]);
  });

  it("throws on failed Mainnet execution status or missing digest and returns SuiScan URL on success", async () => {
    const failedExec = new TatumSuiService({
      fetchFn: async () =>
        new Response(
          JSON.stringify({
            data: {
              executeTransaction: {
                effects: {
                  digest: "5xP3wQv9R8kLmN2pT6uX1yZ4aB7cD9eF3gH5jK8mN2p",
                  status: "FAILURE",
                  executionError: { message: "InsufficientCoinBalance" },
                },
              },
            },
          }),
          { status: 200 }
        ),
    });

    await assert.rejects(
      () => failedExec.executeTransaction("AA==", ["BB=="], "mainnet"),
      /InsufficientCoinBalance/
    );

    const missingDigestExec = new TatumSuiService({
      fetchFn: async () =>
        new Response(JSON.stringify({ data: { executeTransaction: {} } }), {
          status: 200,
        }),
    });

    await assert.rejects(
      () => missingDigestExec.executeTransaction("AA==", ["BB=="], "mainnet"),
      /did not return a valid transaction digest/
    );

    const okDigest = "7nB8cD2eF4gH6jK9mN1pQ3rS5tU7vW9xY2zA4bC6dE8fG";
    const okExec = new TatumSuiService({
      fetchFn: async () =>
        new Response(
          JSON.stringify({
            data: {
              executeTransaction: {
                effects: {
                  digest: okDigest,
                  status: "SUCCESS",
                  timestamp: "2026-11-09T10:00:00Z",
                },
              },
            },
          }),
          { status: 200 }
        ),
    });

    const res = await okExec.executeTransaction("AA==", ["BB=="], "mainnet");
    assert.equal(res.digest, okDigest);
    assert.equal(res.status, "SUCCESS");
    assert.equal(res.explorerUrl, `https://suiscan.xyz/mainnet/tx/${okDigest}`);
  });
});

describe("x402 Protocol Verification & Client Strictness (lib/vault-x402.ts)", () => {
  it("verifies real Ed25519 challenge signatures and rejects spoofed or mock payloads", async () => {
    const keypair = new Ed25519Keypair();
    const challenge = createX402Challenge(0.05, YEARBOUND_VAULT_ADDRESS, "Test breach");
    const canonical = `x402:${challenge.payment.destination}:${challenge.payment.amount_sui}:${challenge.payment.nonce}`;
    const signed = await keypair.signPersonalMessage(new TextEncoder().encode(canonical));

    const validHeader = Buffer.from(
      JSON.stringify({
        version: "1.0",
        nonce: challenge.payment.nonce,
        network: "sui",
        currency: "SUI",
        amount_sui: 0.05,
        destination: YEARBOUND_VAULT_ADDRESS,
        sender_address: keypair.toSuiAddress(),
        signature: signed.signature,
        timestamp: new Date().toISOString(),
      })
    ).toString("base64");

    const ok = await verifyAndSettleX402Payment(
      validHeader,
      0.05,
      YEARBOUND_VAULT_ADDRESS
    );
    assert.equal(ok.valid, true);

    // Reject wrong sender claim
    const wrongSenderHeader = Buffer.from(
      JSON.stringify({
        version: "1.0",
        nonce: challenge.payment.nonce,
        network: "sui",
        currency: "SUI",
        amount_sui: 0.05,
        destination: YEARBOUND_VAULT_ADDRESS,
        sender_address: VALID_MAINNET_RECIPIENT,
        signature: signed.signature,
        timestamp: new Date().toISOString(),
      })
    ).toString("base64");
    const badSender = await verifyAndSettleX402Payment(
      wrongSenderHeader,
      0.05,
      YEARBOUND_VAULT_ADDRESS
    );
    assert.equal(badSender.valid, false);

    // Reject mock signature
    const mockHeader = Buffer.from(
      JSON.stringify({
        version: "1.0",
        nonce: challenge.payment.nonce,
        network: "sui",
        currency: "SUI",
        amount_sui: 0.05,
        destination: YEARBOUND_VAULT_ADDRESS,
        sender_address: keypair.toSuiAddress(),
        signature: "mock_sig_123",
        timestamp: new Date().toISOString(),
      })
    ).toString("base64");
    const badMock = await verifyAndSettleX402Payment(
      mockHeader,
      0.05,
      YEARBOUND_VAULT_ADDRESS
    );
    assert.equal(badMock.valid, false);

    // Reject ext_signed without preExecutedDigest
    const extNoDigestHeader = Buffer.from(
      JSON.stringify({
        version: "1.0",
        nonce: challenge.payment.nonce,
        network: "sui",
        currency: "SUI",
        amount_sui: 0.05,
        destination: YEARBOUND_VAULT_ADDRESS,
        sender_address: keypair.toSuiAddress(),
        signature: "ext_signed",
        timestamp: new Date().toISOString(),
      })
    ).toString("base64");
    const badExt = await verifyAndSettleX402Payment(
      extNoDigestHeader,
      0.05,
      YEARBOUND_VAULT_ADDRESS
    );
    assert.equal(badExt.valid, false);
  });

  it("throws in real mode instead of falling back to debt vouchers on HTTP error or un-chained response", async (t) => {
    const origFetch = globalThis.fetch;
    t.after(() => {
      globalThis.fetch = origFetch;
      mock.restoreAll();
    });

    const challenge = createX402Challenge(0.2, YEARBOUND_VAULT_ADDRESS, "Genesis");

    // 1. Server returns 400 INSUFFICIENT_MAINNET_FUNDS on settlement step
    let step = 0;
    globalThis.fetch = async () => {
      step++;
      if (step === 1) {
        return new Response(JSON.stringify(challenge), { status: 402 });
      }
      return new Response(
        JSON.stringify({
          error: "Insufficient Sui Mainnet balance (0.0000 SUI available)",
          code: "INSUFFICIENT_MAINNET_FUNDS",
          is_real_on_chain: false,
        }),
        { status: 400 }
      );
    };

    await assert.rejects(
      () =>
        executeX402VaultDeposit({
          amountSui: 0.2,
          reason: "Genesis",
          walletMode: "real",
        }),
      /Insufficient Sui Mainnet balance/
    );

    // 2. Demo mode still gracefully provides cryptographic fallback voucher if offline
    step = 0;
    globalThis.fetch = async () => {
      step++;
      if (step === 1) {
        return new Response(JSON.stringify(challenge), { status: 402 });
      }
      return new Response(JSON.stringify({ error: "offline" }), { status: 500 });
    };

    const demoFallback = await executeX402VaultDeposit({
      amountSui: 0.2,
      reason: "Genesis",
      walletMode: "demo",
    });
    assert.equal(demoFallback.success, true);
    assert.equal(demoFallback.settlementType, "cryptographic_voucher");
    assert.equal(demoFallback.isRealOnChain, false);

    // 3. Real mode succeeds strictly when is_real_on_chain=true and tx_hash is returned
    step = 0;
    const realDigest = "8yQ4xRs2T5uV7wX9yZ1aB3cD5eF7gH9jK2mN4pQ6rS8tU";
    globalThis.fetch = async () => {
      step++;
      if (step === 1) {
        return new Response(JSON.stringify(challenge), { status: 402 });
      }
      return new Response(
        JSON.stringify({
          status: "deposited",
          settlement_type: "on_chain_ptb",
          is_real_on_chain: true,
          network: "mainnet",
          tx_hash: realDigest,
          explorer_url: `https://suiscan.xyz/mainnet/tx/${realDigest}`,
          vault_destination: YEARBOUND_VAULT_ADDRESS,
          deposited_amount_sui: 0.2,
          provider: "Tatum Sui Mainnet Gateway (x402 Protocol)",
        }),
        { status: 200 }
      );
    };

    const realSuccess = await executeX402VaultDeposit({
      amountSui: 0.2,
      reason: "Genesis",
      walletMode: "real",
    });
    assert.equal(realSuccess.isRealOnChain, true);
    assert.equal(realSuccess.txHash, realDigest);
    assert.equal(realSuccess.settlementType, "on_chain_ptb");
  });
});
