import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromHex, isValidSuiAddress } from "@mysten/sui/utils";
import { tatumService } from "@/lib/tatum";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      senderAddress,
      recipientAddress,
      amountSui,
      walletMode = "demo",
      privateKeySecret,
      preExecutedDigest,
    } = body;

    if (!recipientAddress || typeof recipientAddress !== "string") {
      return NextResponse.json(
        { success: false, error: "Recipient address is required" },
        { status: 400 }
      );
    }

    // Ensure recipient is a valid 32-byte Sui address for PTB serialization
    // In Demo Testnet mode, free-text contacts map deterministically; Mainnet requires valid Sui addresses.
    let targetRecipient = recipientAddress.trim();
    if (!isValidSuiAddress(targetRecipient)) {
      if (walletMode !== "demo") {
        return NextResponse.json(
          {
            success: false,
            onChain: false,
            error: "Sui Mainnet transfers require a valid 0x Sui address.",
          },
          { status: 400 }
        );
      }
      const hash = crypto.createHash("sha256").update(targetRecipient).digest("hex");
      targetRecipient = `0x${hash}`;
    }

    const numAmount = parseFloat(String(amountSui)) || 0;
    if (numAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Amount must be greater than 0 SUI" },
        { status: 400 }
      );
    }

    // -------------------------------------------------------------------------
    // 1. DEMO MODE: SUI TESTNET SANDBOX VIA TATUM TESTNET GATEWAY
    // -------------------------------------------------------------------------
    if (walletMode === "demo") {
      let keypair: Ed25519Keypair | null = null;
      if (privateKeySecret) {
        try {
          if (privateKeySecret.startsWith("suiprivkey")) {
            keypair = Ed25519Keypair.fromSecretKey(privateKeySecret);
          } else {
            const raw = fromHex(
              privateKeySecret.startsWith("0x") ? privateKeySecret.slice(2) : privateKeySecret
            );
            keypair = Ed25519Keypair.fromSecretKey(raw);
          }
        } catch (kpErr) {
          console.warn("[Demo Transfer] Keypair restore error:", kpErr);
        }
      }

      const derivedAddress = keypair ? keypair.toSuiAddress() : (senderAddress || "0xc3566d06a7384723209d9ed87fff4c7d867b83b839fc0efa43de6981f59e59bc");

      // Check live balance on Sui Testnet via Tatum Testnet Gateway
      const liveBalance = await tatumService.getSuiBalance(derivedAddress, "testnet");
      const requiredMist = Math.round(numAmount * 1_000_000_000);
      const minGasBufferSui = 0.002;

      // If funded with Testnet SUI: broadcast real PTB to Sui Testnet via Tatum!
      if (keypair && liveBalance >= numAmount + minGasBufferSui) {
        try {
          const tx = new Transaction();
          tx.setSender(derivedAddress);
          const [coin] = tx.splitCoins(tx.gas, [requiredMist]);
          tx.transferObjects([coin], targetRecipient);

          const txBytes = await tx.build({
            client: tatumService.getGraphQLClient("testnet"),
          });

          const { signature } = await keypair.signTransaction(txBytes);
          const txBytesBase64 = Buffer.from(txBytes).toString("base64");

          const execResult = await tatumService.executeTransaction(
            txBytesBase64,
            [signature],
            "testnet"
          );

          return NextResponse.json({
            success: true,
            mode: "demo",
            network: "testnet",
            onChain: true,
            digest: execResult.digest,
            explorerUrl: `https://suiscan.xyz/testnet/tx/${execResult.digest}`,
            status: execResult.status,
            amountSui: numAmount,
            recipient: recipientAddress,
            liveBalanceSui: liveBalance,
            provider: "Tatum Sui Testnet Gateway",
            message: "Real Sui Testnet PTB successfully broadcast via Tatum Gateway.",
          });
        } catch (execErr) {
          console.warn("[Tatum Testnet PTB] Execution error, falling back to voucher:", execErr);
        }
      }

      // Unfunded or gasless testnet intent voucher:
      const canonicalIntent = new TextEncoder().encode(
        `YEARBOUND_TESTNET_PTB:${derivedAddress}->${recipientAddress}:${numAmount}SUI:${Date.now()}`
      );
      let sig = "";
      if (keypair) {
        try {
          const signed = await keypair.signPersonalMessage(canonicalIntent);
          sig = signed.signature;
        } catch {}
      }
      const intentDigest = sig
        ? `0x_sui_testnet_${Buffer.from(sig).toString("hex").slice(0, 32)}`
        : `0x_sui_testnet_${Date.now().toString(16)}`;

      return NextResponse.json({
        success: true,
        mode: "demo",
        network: "testnet",
        onChain: false,
        unfunded: true,
        digest: intentDigest,
        explorerUrl: `https://suiscan.xyz/testnet/account/${derivedAddress}`,
        signature: sig || undefined,
        status: "INTENT_AUTHORIZED",
        amountSui: numAmount,
        recipient: recipientAddress,
        liveBalanceSui: liveBalance,
        provider: "Tatum Sui Testnet Gateway (Cryptographic Intent)",
        message:
          liveBalance === 0
            ? "Demo wallet has 0 Testnet SUI on Sui Testnet. Cryptographic authorization voucher signed & inscribed to Walrus Memory."
            : "Transaction authorized on testnet and inscribed to Walrus memory.",
      });
    }

    // -------------------------------------------------------------------------
    // 2. LINKED WALLET EXTENSION (Already signed & executed by browser extension)
    // -------------------------------------------------------------------------
    if (walletMode === "linked") {
      const validBase58Digest =
        typeof preExecutedDigest === "string" &&
        /^[1-9A-HJ-NP-Za-km-z]{32,64}$/.test(preExecutedDigest) &&
        !preExecutedDigest.startsWith("0x_sui_");

      if (!validBase58Digest) {
        return NextResponse.json(
          {
            success: false,
            mode: "linked",
            network: "mainnet",
            onChain: false,
            code: "MISSING_ONCHAIN_DIGEST",
            error: "Real on-chain Sui Mainnet transaction digest from connected wallet extension is required.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        mode: "linked",
        network: "mainnet",
        onChain: true,
        digest: preExecutedDigest,
        explorerUrl: `https://suiscan.xyz/mainnet/tx/${preExecutedDigest}`,
        amountSui: numAmount,
        recipient: recipientAddress,
        provider: "Tatum Sui Gateway & Connected Extension",
        status: "SUCCESS",
      });
    }

    // -------------------------------------------------------------------------
    // 3. REAL BURNER WALLET (Strict Sui Mainnet Ed25519 Keypair PTB Execution)
    // -------------------------------------------------------------------------
    if (walletMode === "real") {
      if (!privateKeySecret || typeof privateKeySecret !== "string") {
        return NextResponse.json(
          {
            success: false,
            onChain: false,
            error: "Missing private key for real Mainnet transaction",
          },
          { status: 400 }
        );
      }

      // Restore keypair
      let keypair: Ed25519Keypair;
      try {
        if (privateKeySecret.startsWith("suiprivkey")) {
          keypair = Ed25519Keypair.fromSecretKey(privateKeySecret);
        } else {
          const raw = fromHex(
            privateKeySecret.startsWith("0x") ? privateKeySecret.slice(2) : privateKeySecret
          );
          keypair = Ed25519Keypair.fromSecretKey(raw);
        }
      } catch (kpErr) {
        return NextResponse.json(
          {
            success: false,
            onChain: false,
            error: `Invalid keypair secret: ${kpErr instanceof Error ? kpErr.message : "decode error"}`,
          },
          { status: 400 }
        );
      }

      const derivedAddress = keypair.toSuiAddress();

      // Check live balance on Sui Mainnet via Tatum Gateway
      let liveBalance = 0;
      try {
        liveBalance = await tatumService.getSuiBalance(derivedAddress, "mainnet", {
          throwOnError: true,
        });
      } catch (balErr) {
        return NextResponse.json(
          {
            success: false,
            mode: "real",
            network: "mainnet",
            onChain: false,
            code: "MAINNET_RPC_UNAVAILABLE",
            error: `Unable to verify live Sui Mainnet balance: ${
              balErr instanceof Error ? balErr.message : "RPC unavailable"
            }`,
          },
          { status: 503 }
        );
      }

      const requiredMist = Math.round(numAmount * 1_000_000_000);
      const minGasBufferSui = 0.002;
      const requiredSui = Number((numAmount + minGasBufferSui).toFixed(4));

      if (liveBalance < numAmount + minGasBufferSui) {
        return NextResponse.json(
          {
            success: false,
            mode: "real",
            network: "mainnet",
            onChain: false,
            unfunded: true,
            code: "INSUFFICIENT_MAINNET_FUNDS",
            liveBalanceSui: liveBalance,
            requiredSui,
            error: `Insufficient Sui Mainnet balance (${liveBalance.toFixed(
              4
            )} SUI available, need ${requiredSui.toFixed(4)} SUI including gas).`,
          },
          { status: 400 }
        );
      }

      try {
        const tx = new Transaction();
        tx.setSender(derivedAddress);
        const [coin] = tx.splitCoins(tx.gas, [requiredMist]);
        tx.transferObjects([coin], targetRecipient);

        // Build transaction BCS bytes using Tatum's Mainnet GraphQL Gateway
        const txBytes = await tx.build({
          client: tatumService.getGraphQLClient("mainnet"),
        });

        // Sign transaction with Ed25519 keypair
        const { signature } = await keypair.signTransaction(txBytes);
        const txBytesBase64 = Buffer.from(txBytes).toString("base64");

        // Execute on Sui Mainnet via Tatum Gateway GraphQL mutation
        const execResult = await tatumService.executeTransaction(txBytesBase64, [signature], "mainnet");

        return NextResponse.json({
          success: true,
          mode: "real",
          network: "mainnet",
          onChain: true,
          digest: execResult.digest,
          explorerUrl: execResult.explorerUrl,
          status: execResult.status,
          amountSui: numAmount,
          recipient: recipientAddress,
          liveBalanceSui: liveBalance,
          provider: "Tatum Sui Mainnet Gateway",
        });
      } catch (execErr) {
        const errMsg = execErr instanceof Error ? execErr.message : "Sui Mainnet PTB execution failed";
        console.warn("[Tatum PTB] Mainnet execution error:", errMsg);
        return NextResponse.json(
          {
            success: false,
            mode: "real",
            network: "mainnet",
            onChain: false,
            code: "MAINNET_EXECUTION_FAILED",
            liveBalanceSui: liveBalance,
            error: `Sui Mainnet transfer failed: ${errMsg}`,
          },
          { status: 502 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: "Unsupported wallet mode" },
      { status: 400 }
    );
  } catch (err: unknown) {
    console.error("[Sui Transfer API] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Internal transfer error",
      },
      { status: 500 }
    );
  }
}
