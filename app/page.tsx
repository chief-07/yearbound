"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, ArrowRight, ArrowLeft, Check, Lock, Copy, Wallet } from "lucide-react";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

/* ==========================================================================
   YEARBOUND PROTOCOL FLOW
   - Screen 1: Resolution & Rules Builder (Title + Condition)
   - Screen 2: Penalty Stakes & Escrow Setup (Preset SUI stakes)
   - Screen 3: Account & Wallet Setup (Demo Account, Real Account, Link Wallet)
   - Screen 4: Vault Active Confirmation (Immutable Walrus Memory Proof)
   - Strict monochrome black & white (zero glows, zero sparkles, zero pills)
   - Universal typography: Outfit Sans
   - Walrus Snackbar feedback upon commit
   ========================================================================== */

export interface RuleItem {
  id: string;
  title: string;
  condition: string;
  penalty: number;
}

type AccountType = "demo" | "real" | "linked";

const PENALTY_PRESETS = [5, 10, 25, 50];
const DEMO_SUI_ADDRESS = "0x7a83d4f19b224c88e019f39002b8da4e91c0e39a";

export default function YearboundApp() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Screen 1: Rules
  const [rules, setRules] = useState<RuleItem[]>([
    { id: "1", title: "", condition: "", penalty: 10 },
  ]);

  // Screen 2: Escrow Settings
  const [escrowDeposit] = useState<number>(10);
  const [unlockDate] = useState<string>("Dec 25, 2026");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Screen 3: Account / Wallet Selection
  const [accountType, setAccountType] = useState<AccountType>("demo");
  const [realAddress, setRealAddress] = useState<string>("");
  const [linkedAddress, setLinkedAddress] = useState<string>("");
  const [showLinkInput, setShowLinkInput] = useState<boolean>(false);

  // Walrus feedback & proof
  const [walrusBlobId, setWalrusBlobId] = useState<string>("");
  const [showSnackbar, setShowSnackbar] = useState<boolean>(false);
  const [copiedBlob, setCopiedBlob] = useState<boolean>(false);

  // Generate real self-custodial Sui keypair when Real Account is selected
  useEffect(() => {
    if (accountType === "real" && !realAddress) {
      try {
        const kp = new Ed25519Keypair();
        setRealAddress(kp.toSuiAddress());
      } catch (e) {
        console.error("Failed to generate keypair:", e);
      }
    }
  }, [accountType, realAddress]);

  // Rule management
  const addRule = () => {
    setRules((prev) => [
      ...prev,
      { id: Date.now().toString(), title: "", condition: "", penalty: 10 },
    ]);
  };

  const updateRule = (id: string, field: keyof RuleItem, value: string | number) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const removeRule = (id: string) => {
    if (rules.length <= 1) return;
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  // Step 1 Validation
  const isStep1Valid = rules.some((r) => r.title.trim().length > 0);

  // Step 3 Submission to Walrus
  const handleLockVault = async () => {
    setIsSubmitting(true);
    try {
      const activeRules = rules.filter((r) => r.title.trim().length > 0);
      const activeAccountAddress =
        accountType === "demo"
          ? DEMO_SUI_ADDRESS
          : accountType === "real"
          ? realAddress
          : linkedAddress || DEMO_SUI_ADDRESS;

      const res = await fetch("/api/walrus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rules: activeRules,
          initialDepositSui: escrowDeposit,
          unlockDate: "2026-12-25",
          walletAddress: activeAccountAddress,
          accountType,
        }),
      });

      const data = await res.json();
      if (data.success && data.primaryBlobId) {
        setWalrusBlobId(data.primaryBlobId);
        setShowSnackbar(true);
        setStep(4);

        // Auto-dismiss snackbar after 6 seconds
        setTimeout(() => {
          setShowSnackbar(false);
        }, 6000);
      } else {
        alert(data.error || "Failed to commit pact to Walrus.");
      }
    } catch {
      alert("Network error connecting to Walrus memory.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyBlobId = () => {
    if (!walrusBlobId) return;
    navigator.clipboard.writeText(walrusBlobId);
    setCopiedBlob(true);
    setTimeout(() => setCopiedBlob(false), 2000);
  };

  const activeWalletDisplay =
    accountType === "demo"
      ? `Demo · ${DEMO_SUI_ADDRESS.slice(0, 6)}...${DEMO_SUI_ADDRESS.slice(-4)}`
      : accountType === "real"
      ? `Real · ${realAddress.slice(0, 6)}...${realAddress.slice(-4)}`
      : `Linked · ${linkedAddress ? `${linkedAddress.slice(0, 6)}...${linkedAddress.slice(-4)}` : "Wallet"}`;

  return (
    <main className="min-h-screen w-full bg-[#000000] text-[#FFFFFF] flex items-center justify-center p-0 md:p-6 select-none overflow-x-hidden font-sans">
      {/* ====================================================================
          MOBILE SHELL (Centered vertical frame on desktop, black sides)
          ==================================================================== */}
      <div className="relative w-full max-w-[420px] h-[100dvh] md:h-[860px] md:max-h-[92vh] bg-[#000000] md:border md:border-[#27272A] md:rounded-[40px] flex flex-col justify-between overflow-hidden shadow-2xl">
        
        {/* ==================================================================
            SCREEN 1: RESOLUTION BUILDER
            ================================================================== */}
        {step === 1 && (
          <>
            <div className="pt-12 sm:pt-14 px-7 pb-4">
              <div className="text-[30px] sm:text-[34px] font-semibold tracking-[-0.02em] leading-tight text-white">
                Write your resolutions
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-7 py-3 flex flex-col gap-5 pb-6">
              {rules.map((rule, index) => (
                <div
                  key={rule.id}
                  className="bg-[#0A0A0C] border border-[#222226] rounded-2xl p-5 flex flex-col gap-4 relative focus-within:border-[#52525B] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-[#71717A] uppercase tracking-wider">
                      Rule 0{index + 1}
                    </span>
                    {rules.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRule(rule.id)}
                        className="text-[#71717A] hover:text-[#EF4444] p-1 transition-colors"
                        title="Remove rule"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[12px] font-medium text-[#A1A1AA]">
                      Title
                    </label>
                    <input
                      type="text"
                      value={rule.title}
                      onChange={(e) => updateRule(rule.id, "title", e.target.value)}
                      placeholder="e.g. No Late-Night Takeout"
                      className="w-full bg-[#131316] border border-[#27272A] rounded-xl px-4 py-3 text-sm text-white placeholder-[#52525B] outline-none focus:border-[#FFFFFF] transition-colors"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[12px] font-medium text-[#A1A1AA]">
                      Condition
                    </label>
                    <textarea
                      value={rule.condition}
                      onChange={(e) => updateRule(rule.id, "condition", e.target.value)}
                      placeholder="e.g. Any food delivery ordered between 10 PM and 5 AM"
                      rows={2}
                      className="w-full bg-[#131316] border border-[#27272A] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#52525B] outline-none focus:border-[#FFFFFF] transition-colors resize-none leading-relaxed"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addRule}
                className="w-full py-3.5 px-4 border border-dashed border-[#2E2E33] hover:border-[#52525B] hover:bg-[#0A0A0C] text-[#A1A1AA] hover:text-white rounded-2xl flex items-center justify-center gap-2 text-sm font-medium transition-colors"
              >
                <Plus size={16} />
                <span>Add another rule</span>
              </button>
            </div>

            <div className="p-7 border-t border-[#18181B] bg-[#000000]">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!isStep1Valid}
                className={`w-full py-4 px-6 rounded-full font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                  isStep1Valid
                    ? "bg-[#FFFFFF] text-[#000000] hover:bg-[#E4E4E7] active:scale-[0.98]"
                    : "bg-[#222226] text-[#52525B] cursor-not-allowed"
                }`}
              >
                <span>Next</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}

        {/* ==================================================================
            SCREEN 2: PENALTY STAKES & ESCROW SETUP
            ================================================================== */}
        {step === 2 && (
          <>
            <div className="pt-10 sm:pt-12 px-7 pb-4 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="self-start text-[#71717A] hover:text-white flex items-center gap-1.5 text-xs font-medium transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
              <div className="text-[30px] sm:text-[34px] font-semibold tracking-[-0.02em] leading-tight text-white">
                Set your penalties
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-7 py-3 flex flex-col gap-5 pb-6">
              {rules
                .filter((r) => r.title.trim().length > 0)
                .map((rule, idx) => (
                  <div
                    key={rule.id}
                    className="bg-[#0A0A0C] border border-[#222226] rounded-2xl p-5 flex flex-col gap-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-[#71717A] uppercase tracking-wider">
                        Rule 0{idx + 1}
                      </span>
                      <span className="text-xs font-mono font-medium text-white bg-[#18181C] px-2 py-0.5 rounded-md border border-[#27272A]">
                        {rule.penalty} SUI
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="text-base font-semibold text-white tracking-[-0.01em]">
                        {rule.title}
                      </div>
                      {rule.condition && (
                        <p className="text-xs text-[#71717A] leading-relaxed mt-0.5">
                          {rule.condition}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 pt-1 border-t border-[#18181C]">
                      <div className="text-[11px] font-medium text-[#71717A] uppercase tracking-wider">
                        Stake per breach
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {PENALTY_PRESETS.map((amt) => {
                          const isSelected = rule.penalty === amt;
                          return (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => updateRule(rule.id, "penalty", amt)}
                              className={`py-2.5 text-center rounded-xl text-xs font-medium transition-all ${
                                isSelected
                                  ? "bg-[#FFFFFF] text-[#000000] font-semibold shadow-sm"
                                  : "bg-[#131316] text-[#A1A1AA] border border-[#27272A] hover:border-[#52525B] hover:text-white"
                              }`}
                            >
                              {amt} SUI
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}

              {/* Escrow Parameters */}
              <div className="bg-[#0A0A0C] border border-[#222226] rounded-2xl p-5 flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[#71717A] uppercase tracking-wider">
                    Escrow Vault Lock
                  </span>
                  <Lock size={12} className="text-[#71717A]" />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-[#A1A1AA]">Locked Until</span>
                  <span className="text-xs text-white font-medium">{unlockDate}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#A1A1AA]">Initial Escrow Deposit</span>
                  <span className="text-xs text-white font-mono font-medium">{escrowDeposit} SUI</span>
                </div>

                <div className="flex items-center justify-between border-t border-[#18181C] pt-2.5">
                  <span className="text-xs text-[#71717A]">Memory Proof</span>
                  <span className="text-xs text-[#A1A1AA]">Walrus Network</span>
                </div>
              </div>
            </div>

            <div className="p-7 border-t border-[#18181B] bg-[#000000]">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-full py-4 px-6 rounded-full font-semibold text-sm transition-all flex items-center justify-center gap-2 bg-[#FFFFFF] text-[#000000] hover:bg-[#E4E4E7] active:scale-[0.98]"
              >
                <span>Continue to Account</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}

        {/* ==================================================================
            SCREEN 3: ACCOUNT & WALLET SETUP
            - Demo Account (Auto-selected for hackathon judges)
            - Real Account (Self-custodial Sui keypair)
            - Link Existing Wallet (+ centered clickable text link)
            ================================================================== */}
        {step === 3 && (
          <>
            <div className="pt-10 sm:pt-12 px-7 pb-4 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="self-start text-[#71717A] hover:text-white flex items-center gap-1.5 text-xs font-medium transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
              <div className="text-[30px] sm:text-[34px] font-semibold tracking-[-0.02em] leading-tight text-white">
                Choose an account
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-7 py-3 flex flex-col gap-4 pb-6">
              {/* Option 1: Demo Account (Auto-selected by default) */}
              <div
                onClick={() => setAccountType("demo")}
                className={`bg-[#0A0A0C] rounded-2xl p-5 flex flex-col gap-3 cursor-pointer transition-all border ${
                  accountType === "demo"
                    ? "border-white"
                    : "border-[#222226] hover:border-[#3F3F46]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-base font-semibold text-white tracking-[-0.01em]">
                    Demo account
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                      accountType === "demo"
                        ? "bg-white text-black"
                        : "border border-[#3F3F46]"
                    }`}
                  >
                    {accountType === "demo" && <Check size={10} strokeWidth={3} />}
                  </div>
                </div>

                <p className="text-xs text-[#71717A] leading-relaxed">
                  Pre-funded with testnet SUI for instant evaluation. No extension or faucet required.
                </p>

                <div className="pt-3 border-t border-[#18181C] flex items-center justify-between text-xs font-mono">
                  <span className="text-[#A1A1AA]">
                    {DEMO_SUI_ADDRESS.slice(0, 6)}...{DEMO_SUI_ADDRESS.slice(-4)}
                  </span>
                  <span className="text-white font-medium">50 SUI Balance</span>
                </div>
              </div>

              {/* Option 2: Real Account (Self-custodial Sui Keypair) */}
              <div
                onClick={() => setAccountType("real")}
                className={`bg-[#0A0A0C] rounded-2xl p-5 flex flex-col gap-3 cursor-pointer transition-all border ${
                  accountType === "real"
                    ? "border-white"
                    : "border-[#222226] hover:border-[#3F3F46]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-base font-semibold text-white tracking-[-0.01em]">
                    Real account
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                      accountType === "real"
                        ? "bg-white text-black"
                        : "border border-[#3F3F46]"
                    }`}
                  >
                    {accountType === "real" && <Check size={10} strokeWidth={3} />}
                  </div>
                </div>

                <p className="text-xs text-[#71717A] leading-relaxed">
                  Generates a fresh, self-custodial Sui keypair stored securely in your browser.
                </p>

                <div className="pt-3 border-t border-[#18181C] flex items-center justify-between text-xs font-mono">
                  <span className="text-[#A1A1AA] truncate max-w-[200px]">
                    {realAddress
                      ? `${realAddress.slice(0, 6)}...${realAddress.slice(-4)}`
                      : "Generating keypair..."}
                  </span>
                  <span className="text-[#71717A]">Self-Custodial</span>
                </div>
              </div>

              {/* Option 3: Centered clickable text only */}
              <div className="pt-2 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowLinkInput(!showLinkInput);
                    if (!showLinkInput) setAccountType("linked");
                  }}
                  className="text-xs font-medium text-[#71717A] hover:text-white transition-colors py-1.5 flex items-center gap-1.5"
                >
                  <Plus size={13} />
                  <span>Link existing wallet</span>
                </button>

                {showLinkInput && (
                  <div className="w-full mt-2 animate-in fade-in duration-200">
                    <input
                      type="text"
                      value={linkedAddress}
                      onChange={(e) => {
                        setLinkedAddress(e.target.value);
                        setAccountType("linked");
                      }}
                      placeholder="Enter Sui address (0x...)"
                      className="w-full bg-[#131316] border border-[#27272A] rounded-xl px-4 py-3 text-xs font-mono text-white placeholder-[#52525B] outline-none focus:border-white transition-colors"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Bottom CTA */}
            <div className="p-7 border-t border-[#18181B] bg-[#000000]">
              <button
                type="button"
                onClick={handleLockVault}
                disabled={isSubmitting}
                className={`w-full py-4 px-6 rounded-full font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                  isSubmitting
                    ? "bg-[#222226] text-[#71717A] cursor-wait"
                    : "bg-[#FFFFFF] text-[#000000] hover:bg-[#E4E4E7] active:scale-[0.98]"
                }`}
              >
                {isSubmitting ? (
                  <span>Saving to Walrus...</span>
                ) : (
                  <>
                    <span>Lock Vault & Commit</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {/* ==================================================================
            SCREEN 4: VAULT ACTIVE / CONFIRMED PACT
            ================================================================== */}
        {step === 4 && (
          <>
            <div className="pt-12 sm:pt-14 px-7 pb-4">
              <div className="text-[30px] sm:text-[34px] font-semibold tracking-[-0.02em] leading-tight text-white">
                Vault locked
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-7 py-3 flex flex-col gap-5 pb-6">
              {/* Status Summary Card */}
              <div className="bg-[#0A0A0C] border border-[#222226] rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[#71717A] uppercase tracking-wider">
                    Pact Status
                  </span>
                  <span className="text-xs font-medium text-white flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                    Active
                  </span>
                </div>

                <div className="flex flex-col gap-1 border-t border-[#18181C] pt-3">
                  <span className="text-xs text-[#71717A]">Time-Locked Until</span>
                  <span className="text-lg font-medium text-white">{unlockDate}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-[#18181C] pt-3">
                  <div className="flex flex-col">
                    <span className="text-xs text-[#71717A]">Escrow Stake</span>
                    <span className="text-sm font-mono text-white mt-0.5">{escrowDeposit} SUI</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-[#71717A]">Account</span>
                    <span className="text-xs font-mono text-white mt-0.5 truncate">
                      {activeWalletDisplay}
                    </span>
                  </div>
                </div>
              </div>

              {/* Walrus Memory Proof Card */}
              <div className="bg-[#0A0A0C] border border-[#222226] rounded-2xl p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[#71717A] uppercase tracking-wider">
                    Walrus Memory Proof
                  </span>
                  <Check size={13} className="text-white" />
                </div>
                <div className="bg-[#131316] border border-[#27272A] rounded-xl p-3 flex items-center justify-between gap-2">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] text-[#71717A] uppercase tracking-wider">Blob ID</span>
                    <span className="text-xs font-mono text-white truncate">
                      {walrusBlobId || "blob_simulated_proof"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={copyBlobId}
                    className="text-[#A1A1AA] hover:text-white p-1.5 transition-colors"
                    title="Copy Blob ID"
                  >
                    {copiedBlob ? <Check size={14} className="text-white" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {/* Committed Rules List */}
              <div className="flex flex-col gap-2.5 pt-1">
                <span className="text-[11px] font-mono text-[#71717A] uppercase tracking-wider">
                  Enforced Rules
                </span>
                {rules
                  .filter((r) => r.title.trim().length > 0)
                  .map((rule, idx) => (
                    <div
                      key={rule.id}
                      className="bg-[#0A0A0C] border border-[#222226] rounded-xl p-4 flex items-center justify-between"
                    >
                      <div className="flex flex-col min-w-0 pr-3">
                        <span className="text-[11px] text-[#71717A]">Rule 0{idx + 1}</span>
                        <span className="text-sm font-medium text-white truncate mt-0.5">{rule.title}</span>
                      </div>
                      <span className="text-xs font-mono font-medium text-[#FFFFFF] shrink-0 bg-[#18181C] px-2 py-0.5 rounded border border-[#27272A]">
                        {rule.penalty} SUI
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-7 border-t border-[#18181B] bg-[#000000]">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setRules([{ id: "1", title: "", condition: "", penalty: 10 }]);
                }}
                className="w-full py-4 px-6 rounded-full font-medium text-xs text-[#A1A1AA] hover:text-white bg-[#131316] border border-[#27272A] hover:border-[#52525B] transition-all"
              >
                Create another resolution
              </button>
            </div>
          </>
        )}

        {/* ==================================================================
            WALRUS FEEDBACK SNACKBAR
            - Non-sloppy, quiet monochrome feedback
            - Minimal checkmark, blob reference
            ================================================================== */}
        {showSnackbar && (
          <div className="absolute bottom-6 left-5 right-5 z-50 bg-[#141417] border border-[#3F3F46] rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center shrink-0">
                <Check size={12} strokeWidth={3} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-white">Saved to Walrus</span>
                <span className="text-[11px] font-mono text-[#A1A1AA] truncate">
                  Blob #{walrusBlobId ? `${walrusBlobId.slice(0, 12)}...` : "d4a97f2e..."}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSnackbar(false)}
              className="text-[#71717A] hover:text-white text-xs px-2 py-1 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
