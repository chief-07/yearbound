import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { SuiGraphQLClient } from "@mysten/sui/graphql";
import { Transaction } from "@mysten/sui/transactions";
import { toBase58 } from "@mysten/sui/utils";
import { POST as vaultPost } from "@/app/api/vault/route";
import { POST as transferPost } from "@/app/api/sui-transfer/route";
import { GET as balanceGet } from "@/app/api/sui/balance/route";
import { POST as walrusPost } from "@/app/api/walrus/route";
import { POST as briefingPost } from "@/app/api/wally-briefing/route";
import { tatumService } from "@/lib/tatum";
import { walrusService } from "@/lib/walrus";
import { YEARBOUND_VAULT_ADDRESS, createX402Challenge } from "@/lib/vault-x402";

const VALID_MAINNET_RECIPIENT =
  "0x7e8b61fb9706dc7d455823ca8745581290333333333333333333333333332026";
const VALID_BASE58_DIGEST = "8yQ4xRs2T5uV7wX9yZ1aB3cD5eF7gH9jK2mN4pQ6rS8tU";

async function buildSignedXPaymentHeader(
  keypair: Ed25519Keypair,
  amountSui: number,
  destination = YEARBOUND_VAULT_ADDRESS,
  preExecutedDigest?: string
): Promise<string> {
  const challenge = createX402Challenge(amountSui, destination, "Test penalty");
  const canonical = `x402:${challenge.payment.destination}:${challenge.payment.amount_sui}:${challenge.payment.nonce}${
    preExecutedDigest ? `:${preExecutedDigest}` : ""
  }`;
  const signed = await keypair.signPersonalMessage(new TextEncoder().encode(canonical));
  return Buffer.from(
    JSON.stringify({
      version: "1.0",
      nonce: challenge.payment.nonce,
      network: "sui",
      currency: "SUI",
      amount_sui: amountSui,
      destination,
      sender_address: keypair.toSuiAddress(),
      signature: signed.signature,
      timestamp: new Date().toISOString(),
      preExecutedDigest,
    })
  ).toString("base64");
}

function createMockResolveGraphQLClient(
  sender: string,
  recipient: string,
  amountMist: number
): SuiGraphQLClient {
  const objectDigest = toBase58(new Uint8Array(32).fill(7));
  return new SuiGraphQLClient({
    url: "https://mock.mainnet.sui.test/graphql",
    network: "mainnet",
    fetch: async () => {
      const offlineTx = new Transaction();
      offlineTx.setSender(sender);
      const [coin] = offlineTx.splitCoins(offlineTx.gas, [amountMist]);
      offlineTx.transferObjects([coin], recipient);
      offlineTx.setGasOwner(sender);
      offlineTx.setGasPrice(1000);
      offlineTx.setGasBudget(5_000_000);
      offlineTx.setGasPayment([
        { objectId: "0x" + "11".repeat(32), version: "1", digest: objectDigest },
      ]);
      const bytes = await offlineTx.build();
      return new Response(
        JSON.stringify({
          data: {
            simulateTransaction: {
              effects: {
                transaction: {
                  transactionBcs: Buffer.from(bytes).toString("base64"),
                  effects: { status: "SUCCESS", epoch: { epochId: 500 } },
                },
              },
            },
          },
        }),
        { status: 200 }
      );
    },
  });
}

describe("POST /api/vault (Strict Mainnet x402 Enforcement)", () => {
  it("returns HTTP 402 x402 challenge when x-payment header is absent", async () => {
    const req = new Request("http://localhost:3000/api/vault", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount_sui: 0.2,
        reason: "Genesis pledge",
        wallet_mode: "real",
      }),
    });

    const res = await vaultPost(req);
    assert.equal(res.status, 402);
    const data = await res.json();
    assert.equal(data.status, "payment_required");
    assert.equal(data.payment.amount_sui, 0.2);
    assert.equal(data.payment.destination, YEARBOUND_VAULT_ADDRESS);
  });

  it("rejects Real Mainnet vault deposit when live Mainnet balance is 0.00 SUI (no voucher fallback)", async (t) => {
    const origGetBal = tatumService.getSuiBalance.bind(tatumService);
    t.after(() => {
      tatumService.getSuiBalance = origGetBal;
    });

    tatumService.getSuiBalance = async (_addr, network, opts) => {
      assert.equal(network, "mainnet");
      assert.equal(opts?.throwOnError, true);
      return 0;
    };

    const kp = new Ed25519Keypair();
    const xPayment = await buildSignedXPaymentHeader(kp, 0.2);

    const req = new Request("http://localhost:3000/api/vault", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-payment": xPayment,
      },
      body: JSON.stringify({
        amount_sui: 0.2,
        reason: "Genesis pledge",
        wallet_mode: "real",
        private_key_secret: kp.getSecretKey(),
        sender_address: kp.toSuiAddress(),
      }),
    });

    const res = await vaultPost(req);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.code, "INSUFFICIENT_MAINNET_FUNDS");
    assert.equal(data.is_real_on_chain, false);
    assert.equal(data.live_balance_sui, 0);
  });

  it("returns 503 MAINNET_RPC_UNAVAILABLE when Tatum Gateway cannot verify Mainnet balance", async (t) => {
    const origGetBal = tatumService.getSuiBalance.bind(tatumService);
    t.after(() => {
      tatumService.getSuiBalance = origGetBal;
    });

    tatumService.getSuiBalance = async () => {
      throw new Error("Upstream GraphQL timeout");
    };

    const kp = new Ed25519Keypair();
    const xPayment = await buildSignedXPaymentHeader(kp, 0.05);

    const req = new Request("http://localhost:3000/api/vault", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-payment": xPayment,
      },
      body: JSON.stringify({
        amount_sui: 0.05,
        wallet_mode: "real",
        private_key_secret: kp.getSecretKey(),
      }),
    });

    const res = await vaultPost(req);
    assert.equal(res.status, 503);
    const data = await res.json();
    assert.equal(data.code, "MAINNET_RPC_UNAVAILABLE");
    assert.equal(data.is_real_on_chain, false);
  });

  it("rejects linked mode without a real Base58 Mainnet transaction digest and accepts valid Base58 digest", async () => {
    const kp = new Ed25519Keypair();

    // Fake legacy prefix must fail verification/settlement
    const badHeader = Buffer.from(
      JSON.stringify({
        version: "1.0",
        nonce: "yb_test",
        network: "sui",
        currency: "SUI",
        amount_sui: 0.05,
        destination: YEARBOUND_VAULT_ADDRESS,
        sender_address: kp.toSuiAddress(),
        signature: "ext_signed",
        preExecutedDigest: "0x_sui_ptb_fake_digest",
        timestamp: new Date().toISOString(),
      })
    ).toString("base64");

    const badRes = await vaultPost(
      new Request("http://localhost:3000/api/vault", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-payment": badHeader,
        },
        body: JSON.stringify({
          amount_sui: 0.05,
          wallet_mode: "linked",
          pre_executed_digest: "0x_sui_ptb_fake_digest",
        }),
      })
    );
    assert.equal(badRes.status, 400);
    const badData = await badRes.json();
    assert.equal(badData.code, "MISSING_ONCHAIN_DIGEST");
    assert.equal(badData.is_real_on_chain, false);

    // Valid extension preExecutedDigest passes
    const goodHeader = Buffer.from(
      JSON.stringify({
        version: "1.0",
        nonce: "yb_test_ok",
        network: "sui",
        currency: "SUI",
        amount_sui: 0.05,
        destination: YEARBOUND_VAULT_ADDRESS,
        sender_address: kp.toSuiAddress(),
        signature: "ext_signed",
        preExecutedDigest: VALID_BASE58_DIGEST,
        timestamp: new Date().toISOString(),
      })
    ).toString("base64");

    const okRes = await vaultPost(
      new Request("http://localhost:3000/api/vault", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-payment": goodHeader,
        },
        body: JSON.stringify({
          amount_sui: 0.05,
          wallet_mode: "linked",
          pre_executed_digest: VALID_BASE58_DIGEST,
        }),
      })
    );
    assert.equal(okRes.status, 200);
    const okData = await okRes.json();
    assert.equal(okData.is_real_on_chain, true);
    assert.equal(okData.network, "mainnet");
    assert.equal(okData.tx_hash, VALID_BASE58_DIGEST);
  });

  it("builds, signs, and executes a real Mainnet PTB for funded real account and fails cleanly on execution error", async (t) => {
    const origGetBal = tatumService.getSuiBalance.bind(tatumService);
    const origGetGql = tatumService.getGraphQLClient.bind(tatumService);
    const origExec = tatumService.executeTransaction.bind(tatumService);
    t.after(() => {
      tatumService.getSuiBalance = origGetBal;
      tatumService.getGraphQLClient = origGetGql;
      tatumService.executeTransaction = origExec;
    });

    const kp = new Ed25519Keypair();
    const sender = kp.toSuiAddress();

    tatumService.getSuiBalance = async () => 1.5;
    tatumService.getGraphQLClient = () =>
      createMockResolveGraphQLClient(sender, YEARBOUND_VAULT_ADDRESS, 50_000_000);

    // 1. Execution failure returns 502 MAINNET_EXECUTION_FAILED (never fake success)
    tatumService.executeTransaction = async () => {
      throw new Error("MoveAbort on Mainnet");
    };

    const headerFail = await buildSignedXPaymentHeader(kp, 0.05);
    const failRes = await vaultPost(
      new Request("http://localhost:3000/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-payment": headerFail },
        body: JSON.stringify({
          amount_sui: 0.05,
          wallet_mode: "real",
          private_key_secret: kp.getSecretKey(),
        }),
      })
    );
    assert.equal(failRes.status, 502);
    const failData = await failRes.json();
    assert.equal(failData.code, "MAINNET_EXECUTION_FAILED");
    assert.equal(failData.is_real_on_chain, false);

    // 2. Execution success verifies txBytes + Ed25519 sig and returns Mainnet digest
    let capturedBcs = "";
    let capturedSigs: string[] = [];
    tatumService.executeTransaction = async (txBcs, sigs, network) => {
      assert.equal(network, "mainnet");
      capturedBcs = txBcs;
      capturedSigs = sigs;
      return {
        digest: VALID_BASE58_DIGEST,
        status: "SUCCESS",
        explorerUrl: `https://suiscan.xyz/mainnet/tx/${VALID_BASE58_DIGEST}`,
      };
    };

    const headerOk = await buildSignedXPaymentHeader(kp, 0.05);
    const okRes = await vaultPost(
      new Request("http://localhost:3000/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-payment": headerOk },
        body: JSON.stringify({
          amount_sui: 0.05,
          wallet_mode: "real",
          private_key_secret: kp.getSecretKey(),
        }),
      })
    );

    assert.equal(okRes.status, 200);
    const okData = await okRes.json();
    assert.equal(okData.is_real_on_chain, true);
    assert.equal(okData.settlement_type, "on_chain_ptb");
    assert.equal(okData.network, "mainnet");
    assert.equal(okData.tx_hash, VALID_BASE58_DIGEST);
    assert.ok(capturedBcs.length > 50);
    assert.equal(capturedSigs.length, 1);
  });

  it("keeps demo mode Testnet sandbox voucher behavior working at 0 SUI", async (t) => {
    const origGetBal = tatumService.getSuiBalance.bind(tatumService);
    t.after(() => {
      tatumService.getSuiBalance = origGetBal;
    });
    tatumService.getSuiBalance = async () => 0;

    const kp = new Ed25519Keypair();
    const header = await buildSignedXPaymentHeader(kp, 0.2);

    const res = await vaultPost(
      new Request("http://localhost:3000/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-payment": header },
        body: JSON.stringify({
          amount_sui: 0.2,
          wallet_mode: "demo",
          private_key_secret: kp.getSecretKey(),
        }),
      })
    );
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.network, "testnet");
    assert.equal(data.settlement_type, "cryptographic_voucher");
    assert.equal(data.is_real_on_chain, false);
  });
});

describe("POST /api/sui-transfer (Strict Mainnet PTB Transfers)", () => {
  it("rejects free-text/non-Sui recipients on real & linked Mainnet accounts while allowing them in demo", async (t) => {
    const origGetBal = tatumService.getSuiBalance.bind(tatumService);
    t.after(() => {
      tatumService.getSuiBalance = origGetBal;
    });
    tatumService.getSuiBalance = async () => 0;

    const kp = new Ed25519Keypair();

    const realInvalidRes = await transferPost(
      new NextRequest("http://localhost:3000/api/sui-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderAddress: kp.toSuiAddress(),
          recipientAddress: "Sarah",
          amountSui: 0.05,
          walletMode: "real",
          privateKeySecret: kp.getSecretKey(),
        }),
      })
    );
    assert.equal(realInvalidRes.status, 400);
    const realInvalidData = await realInvalidRes.json();
    assert.equal(realInvalidData.onChain, false);

    const demoValidRes = await transferPost(
      new NextRequest("http://localhost:3000/api/sui-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderAddress: kp.toSuiAddress(),
          recipientAddress: "Sarah",
          amountSui: 0.05,
          walletMode: "demo",
          privateKeySecret: kp.getSecretKey(),
        }),
      })
    );
    assert.equal(demoValidRes.status, 200);
    const demoValidData = await demoValidRes.json();
    assert.equal(demoValidData.mode, "demo");
    assert.equal(demoValidData.network, "testnet");
  });

  it("rejects unfunded or gas-insufficient real Mainnet transfers with 400 INSUFFICIENT_MAINNET_FUNDS", async (t) => {
    const origGetBal = tatumService.getSuiBalance.bind(tatumService);
    t.after(() => {
      tatumService.getSuiBalance = origGetBal;
    });
    tatumService.getSuiBalance = async () => 0.051; // lacks 0.002 gas buffer on 0.05 SUI transfer

    const kp = new Ed25519Keypair();
    const res = await transferPost(
      new NextRequest("http://localhost:3000/api/sui-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderAddress: kp.toSuiAddress(),
          recipientAddress: VALID_MAINNET_RECIPIENT,
          amountSui: 0.05,
          walletMode: "real",
          privateKeySecret: kp.getSecretKey(),
        }),
      })
    );

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.code, "INSUFFICIENT_MAINNET_FUNDS");
    assert.equal(data.onChain, false);
    assert.equal(data.unfunded, true);
  });

  it("executes real Mainnet PTB on funded real account and returns 502 if Mainnet execution throws", async (t) => {
    const origGetBal = tatumService.getSuiBalance.bind(tatumService);
    const origGetGql = tatumService.getGraphQLClient.bind(tatumService);
    const origExec = tatumService.executeTransaction.bind(tatumService);
    t.after(() => {
      tatumService.getSuiBalance = origGetBal;
      tatumService.getGraphQLClient = origGetGql;
      tatumService.executeTransaction = origExec;
    });

    const kp = new Ed25519Keypair();
    const sender = kp.toSuiAddress();

    tatumService.getSuiBalance = async () => 1.0;
    tatumService.getGraphQLClient = () =>
      createMockResolveGraphQLClient(sender, VALID_MAINNET_RECIPIENT, 100_000_000);
    tatumService.executeTransaction = async () => ({
      digest: VALID_BASE58_DIGEST,
      status: "SUCCESS",
      explorerUrl: `https://suiscan.xyz/mainnet/tx/${VALID_BASE58_DIGEST}`,
    });

    const okRes = await transferPost(
      new NextRequest("http://localhost:3000/api/sui-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderAddress: sender,
          recipientAddress: VALID_MAINNET_RECIPIENT,
          amountSui: 0.1,
          walletMode: "real",
          privateKeySecret: kp.getSecretKey(),
        }),
      })
    );

    assert.equal(okRes.status, 200);
    const okData = await okRes.json();
    assert.equal(okData.success, true);
    assert.equal(okData.onChain, true);
    assert.equal(okData.network, "mainnet");
    assert.equal(okData.digest, VALID_BASE58_DIGEST);

    // Failed execution returns 502, never fake digest
    tatumService.executeTransaction = async () => {
      throw new Error("GasBudgetTooHigh");
    };
    const failRes = await transferPost(
      new NextRequest("http://localhost:3000/api/sui-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderAddress: sender,
          recipientAddress: VALID_MAINNET_RECIPIENT,
          amountSui: 0.1,
          walletMode: "real",
          privateKeySecret: kp.getSecretKey(),
        }),
      })
    );
    assert.equal(failRes.status, 502);
    const failData = await failRes.json();
    assert.equal(failData.code, "MAINNET_EXECUTION_FAILED");
    assert.equal(failData.onChain, false);
  });

  it("enforces Base58 Mainnet digest on linked transfer route", async () => {
    const missingRes = await transferPost(
      new NextRequest("http://localhost:3000/api/sui-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientAddress: VALID_MAINNET_RECIPIENT,
          amountSui: 0.05,
          walletMode: "linked",
          preExecutedDigest: "",
        }),
      })
    );
    assert.equal(missingRes.status, 400);
    assert.equal((await missingRes.json()).code, "MISSING_ONCHAIN_DIGEST");

    const okRes = await transferPost(
      new NextRequest("http://localhost:3000/api/sui-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientAddress: VALID_MAINNET_RECIPIENT,
          amountSui: 0.05,
          walletMode: "linked",
          preExecutedDigest: VALID_BASE58_DIGEST,
        }),
      })
    );
    assert.equal(okRes.status, 200);
    const okData = await okRes.json();
    assert.equal(okData.onChain, true);
    assert.equal(okData.network, "mainnet");
    assert.equal(okData.digest, VALID_BASE58_DIGEST);
  });
});

describe("GET /api/sui/balance & Auxiliary Mainnet Routes", () => {
  it("reports isLive: false when Mainnet balance RPC throws instead of faking 0.00 live state", async (t) => {
    const origGetBal = tatumService.getSuiBalance.bind(tatumService);
    t.after(() => {
      tatumService.getSuiBalance = origGetBal;
    });

    tatumService.getSuiBalance = async () => {
      throw new Error("Tatum RPC unreachable");
    };

    const res = await balanceGet(
      new Request(
        `http://localhost:3000/api/sui/balance?address=${VALID_MAINNET_RECIPIENT}&network=mainnet`
      )
    );
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.isLive, false);
    assert.match(data.notice, /Tatum RPC unreachable/);
  });

  it("preserves exact 0 penalty_deposited_sui on honored /api/walrus events", async (t) => {
    const origRemember = walrusService.remember.bind(walrusService);
    t.after(() => {
      walrusService.remember = origRemember;
    });

    let recordedPenalty: number | undefined;
    walrusService.remember = async (payload: unknown) => {
      recordedPenalty = (payload as { penalty_deposited_sui?: number })
        .penalty_deposited_sui;
      return { blobId: "blob_honored_zero", jobId: "job_1" };
    };

    const res = await walrusPost(
      new Request("http://localhost:3000/api/walrus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "accountability_event",
          verdict: "honored",
          user_explanation: "Groceries",
          penalty_deposited_sui: 0,
        }),
      })
    );
    assert.equal(res.status, 200);
    assert.equal(recordedPenalty, 0);
  });

  it("reports 0.00 SUI awaiting Mainnet funding in /api/wally-briefing fallback when escrowDeposit is 0", async (t) => {
    const origRecall = walrusService.recall.bind(walrusService);
    const origGeminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    t.after(() => {
      walrusService.recall = origRecall;
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = origGeminiKey;
    });

    walrusService.recall = async () => [];
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "";

    const res = await briefingPost(
      new Request("http://localhost:3000/api/wally-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: new Ed25519Keypair().toSuiAddress(),
          rules: [{ title: "Stop gambling on sports", penalty: 0.05 }],
          infractions: [],
          availableBalance: 0,
          escrowDeposit: 0,
        }),
      })
    );

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.match(data.message, /0\.00 SUI/i);
  });

  it("queries live Sui Mainnet GraphQL for a fresh keypair and confirms 0 SUI with zero errors", async () => {
    const freshAddress = new Ed25519Keypair().toSuiAddress();
    const balance = await tatumService.getSuiBalance(freshAddress, "mainnet", {
      throwOnError: true,
    });
    assert.equal(balance, 0);
  });
});
