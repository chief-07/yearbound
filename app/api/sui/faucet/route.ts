import dns from "node:dns";
import crypto from "node:crypto";

if (typeof dns?.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {}

import { NextResponse } from "next/server";
import { requestSuiFromFaucetV3, getFaucetHost } from "@mysten/sui/faucet";
import { normalizeSuiAddress } from "@mysten/sui/utils";

export const maxDuration = 60;

interface FaucetChallengePayload {
  domain: string;
  algorithm: string;
  salt: string;
  memorySize: number;
  iterations: number;
  parallelism: number;
  hashLength: number;
  chainId: string;
  checkpointSeq: string;
  checkpointDigest: string;
  randomBytes: string;
  faucetAddress: string;
  recipient: string;
  difficulty: string;
  threshold: string;
  windowSeconds: number;
  amountMist: string;
}

function hashArgon2Native(
  preimage: string,
  salt: string,
  memory: number,
  passes: number,
  parallelism: number,
  tagLength: number
): Promise<Buffer> | null {
  const argon2Fn = (crypto as unknown as { argon2?: (...args: unknown[]) => void }).argon2;
  if (typeof argon2Fn !== "function") return null;
  return new Promise((resolve, reject) => {
    argon2Fn(
      "argon2d",
      {
        message: preimage,
        nonce: salt,
        parallelism: parallelism || 1,
        tagLength: tagLength || 32,
        memory: memory || 8192,
        passes: passes || 1,
      },
      (err: Error | null, buf: Buffer) => {
        if (err) reject(err);
        else resolve(buf);
      }
    );
  });
}

async function solvePowChallengeParallel(
  challenge: FaucetChallengePayload,
  deadlineMs: number,
  signal: AbortSignal
): Promise<{ nonce: string; hashHex: string } | null> {
  const U64 = BigInt(1) << BigInt(64);
  const threshold = BigInt(challenge.threshold);
  const basePrefix =
    [
      challenge.domain,
      challenge.chainId,
      challenge.checkpointSeq,
      challenge.checkpointDigest,
      challenge.randomBytes,
      challenge.faucetAddress,
      challenge.recipient,
    ].join("\n") + "\n";

  let nonce = crypto.getRandomValues(new BigUint64Array(1))[0];
  const BATCH_SIZE = 8;

  while (Date.now() < deadlineMs && !signal.aborted) {
    const batch: Array<Promise<{ n: bigint; buf: Buffer }>> = [];
    for (let i = 0; i < BATCH_SIZE; i++) {
      const n = (nonce + BigInt(i)) % U64;
      const promise = hashArgon2Native(
        basePrefix + n.toString(),
        challenge.salt,
        challenge.memorySize,
        challenge.iterations,
        challenge.parallelism,
        challenge.hashLength
      );
      if (!promise) return null;
      batch.push(promise.then((buf) => ({ n, buf })));
    }
    nonce = (nonce + BigInt(BATCH_SIZE)) % U64;

    const results = await Promise.all(batch);
    for (const { n, buf } of results) {
      const val = new DataView(buf.buffer, buf.byteOffset, buf.byteLength).getBigUint64(0);
      if (val < threshold) {
        return { nonce: n.toString(), hashHex: buf.toString("hex") };
      }
    }
  }

  return null;
}

async function claimSingleDrop(host: string, recipient: string): Promise<{ digest: string; amountMist: string }> {
  const normalized = normalizeSuiAddress(recipient);
  const hasNativeArgon2 = typeof (crypto as unknown as { argon2?: unknown }).argon2 === "function";

  if (!hasNativeArgon2) {
    const res = await requestSuiFromFaucetV3({
      host,
      recipient: normalized,
      timeout: 90000,
    });
    return {
      digest: res.digest,
      amountMist: res.amountMist || "1000000000",
    };
  }

  const controller = new AbortController();
  const overallTimer = setTimeout(() => controller.abort(new Error("Faucet request timeout")), 110000);

  try {
    while (!controller.signal.aborted) {
      const challengeUrl = `${host.replace(/\/$/, "")}/v3/challenge?recipient=${encodeURIComponent(normalized)}`;
      const cRes = await fetch(challengeUrl, {
        cache: "no-store",
        signal: controller.signal,
      });

      if (cRes.status === 429) {
        throw new Error("Faucet rate-limited (429). Please wait a moment and try again.");
      }

      const challenge = (await cRes.json()) as FaucetChallengePayload & { error?: string };
      if (!cRes.ok || !challenge.threshold) {
        throw new Error(challenge?.error || `Faucet challenge failed (HTTP ${cRes.status})`);
      }

      const deadlineMs = Date.now() + (challenge.windowSeconds || 60) * 850;
      const proof = await solvePowChallengeParallel(challenge, deadlineMs, controller.signal);
      if (!proof) {
        continue;
      }

      const gasUrl = `${host.replace(/\/$/, "")}/v3/gas`;
      const gRes = await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: challenge.recipient,
          checkpointSeq: challenge.checkpointSeq,
          nonce: proof.nonce,
          hashHex: proof.hashHex,
        }),
        cache: "no-store",
        signal: controller.signal,
      });

      if (gRes.status === 429) {
        throw new Error("Faucet rate-limited (429). Please wait a moment and try again.");
      }

      const gasData = (await gRes.json()) as { digest?: string; amountMist?: string; error?: string };
      if (!gRes.ok || !gasData.digest) {
        throw new Error(gasData?.error || `Faucet claim rejected (HTTP ${gRes.status})`);
      }

      return {
        digest: gasData.digest,
        amountMist: gasData.amountMist || challenge.amountMist || "1000000000",
      };
    }

    throw new Error("Faucet PoW aborted due to timeout");
  } finally {
    clearTimeout(overallTimer);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { address, network = "testnet" } = body;

    if (!address || typeof address !== "string" || !address.startsWith("0x")) {
      return NextResponse.json(
        { success: false, error: "Valid Sui address (0x...) is required" },
        { status: 400 }
      );
    }

    if (network !== "testnet" && network !== "devnet") {
      return NextResponse.json(
        { success: false, error: "Faucet is only available on testnet or devnet" },
        { status: 400 }
      );
    }

    const host = getFaucetHost(network);
    const faucetResult = await claimSingleDrop(host, address);

    const amountMist = faucetResult.amountMist || "1000000000";
    const amountSui = Number(amountMist) / 1_000_000_000;

    return NextResponse.json({
      success: true,
      address,
      network,
      digest: faucetResult.digest,
      amountMist,
      amountSui,
      explorerUrl: `https://suiscan.xyz/${network}/tx/${faucetResult.digest}`,
      message: `Successfully received ${amountSui} SUI on ${network}.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Faucet request failed";
    console.warn("[Sui Faucet API] Notice:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
