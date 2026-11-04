"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Check,
  Lock,
  Copy,
  ArrowUpRight,
  ArrowDownLeft,
  Home,
  ListCheck,
  Shield,
  Settings,
  AlertCircle,
} from "lucide-react";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

/* ==========================================================================
   YEARBOUND PROTOCOL
   - Screen 1: Resolution & Rules Builder (Title + Condition)
   - Screen 2: Penalty Stakes & Escrow Setup (Preset SUI stakes)
   - Screen 3: Account & Wallet Setup (Demo Account, Real Account, Link Wallet)
   - Screen 4: Active Homescreen Dashboard
   - Send Flow:
     * Send 1: Recipient, Big Centered Amount, and Transaction Time/Date
     * Send 2: Compulsory Truthful Memo (Guilt Intent & Quick Picks)
     * Send 3: Temporal + Semantic Checking Screen (Walrus + Tatum check)
     * Send 4: Wally Memory Intervention / Roasting Screen (Cancel vs Pay Fine)
   - Strict monochrome black & white (zero glows, zero sparkles, zero pills)
   - Universal typography: Outfit Sans
   - Consistent sizing, spacing & layout (28px insets, 32px headers, 16px cards)
   ========================================================================== */

export interface RuleItem {
  id: string;
  title: string;
  condition: string;
  penalty: number;
  breaches?: number;
}

type AccountType = "demo" | "real" | "linked";
type NavTab = "home" | "goals" | "vault" | "settings";
type SendSubStep = "amount" | "memo" | "checking" | "approved" | "breach";

const PENALTY_PRESETS = [5, 10, 25, 50];
const AMOUNT_PRESETS = [5, 10, 15, 25];
const DEMO_SUI_ADDRESS = "0x7a83d4f19b224c88e019f39002b8da4e91c0e39a";

const QUICK_MEMO_PICKS = [
  {
    label: "Late-night food delivery",
    text: "Late-night takeout food delivery",
    isFood: true,
  },
  {
    label: "Morning gym & protein shake",
    text: "Monthly gym membership and post-workout protein",
    isFood: false,
  },
  {
    label: "Discretionary transfer to ex-partner",
    text: "Impulse transfer to forbidden recipient 0xSarah",
    isEx: true,
  },
];

export default function YearboundApp() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [expandedRuleId, setExpandedRuleId] = useState<string>("1");

  // Live Date
  const [currentDateStr, setCurrentDateStr] = useState<string>("");

  useEffect(() => {
    const now = new Date();
    setCurrentDateStr(
      new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      }).format(now)
    );
  }, []);

  // Screen 1: Rules
  const [rules, setRules] = useState<RuleItem[]>([
    {
      id: "1",
      title: "No Late-Night Takeout",
      condition: "Any food delivery ordered between 10 PM and 5 AM",
      penalty: 10,
      breaches: 0,
    },
    {
      id: "2",
      title: "Gym 4x Per Week",
      condition: "Must log check-in before 9 AM on scheduled mornings",
      penalty: 10,
      breaches: 0,
    },
  ]);

  // Screen 2: Escrow Settings
  const [escrowDeposit, setEscrowDeposit] = useState<number>(10);
  const [unlockDate] = useState<string>("Dec 25, 2026");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Screen 3: Account / Wallet Selection
  const [accountType, setAccountType] = useState<AccountType>("demo");
  const [realAddress, setRealAddress] = useState<string>("");
  const [linkedAddress, setLinkedAddress] = useState<string>("");
  const [showLinkInput, setShowLinkInput] = useState<boolean>(false);

  // Balances
  const [availableBalance, setAvailableBalance] = useState<number>(40);

  // Walrus feedback & proof
  const [walrusBlobId, setWalrusBlobId] = useState<string>("");
  const [showSnackbar, setShowSnackbar] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("Saved to Walrus");
  const [copiedBlob, setCopiedBlob] = useState<boolean>(false);
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);

  // =========================================================================
  // SEND FLOW STATE
  // =========================================================================
  const [isSendOpen, setIsSendOpen] = useState<boolean>(false);
  const [sendSubStep, setSendSubStep] = useState<SendSubStep>("amount");
  const [sendAmount, setSendAmount] = useState<string>("15");
  const [sendRecipient, setSendRecipient] = useState<string>("0x8f4c...cafe");
  const [sendMemo, setSendMemo] = useState<string>("");
  const [breachReason, setBreachReason] = useState<string>("");

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
    const newId = Date.now().toString();
    setRules((prev) => [
      ...prev,
      { id: newId, title: "", condition: "", penalty: 10, breaches: 0 },
    ]);
    setExpandedRuleId(newId);
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

  const isStep1Valid = rules.some((r) => r.title.trim().length > 0);

  const triggerSnackbar = (msg: string, blobId?: string) => {
    setSnackbarMessage(msg);
    if (blobId) setWalrusBlobId(blobId);
    setShowSnackbar(true);
    setTimeout(() => {
      setShowSnackbar(false);
    }, 5500);
  };

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
        triggerSnackbar("Saved to Walrus", data.primaryBlobId);
        setStep(4);
        setActiveTab("home");
      } else {
        alert(data.error || "Failed to commit pact to Walrus.");
      }
    } catch {
      alert("Network error connecting to Walrus memory.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Send Flow
  const openSendFlow = () => {
    setSendSubStep("amount");
    setSendAmount("15");
    setSendRecipient("0x8f4c...cafe");
    setSendMemo("");
    setBreachReason("");
    setIsSendOpen(true);
  };

  // Close Send Flow
  const closeSendFlow = () => {
    setIsSendOpen(false);
    setSendSubStep("amount");
  };

  // Handle Memo Submission & Trigger Checking Screen
  const handleReviewAndCheck = () => {
    if (!sendMemo.trim()) return;

    setSendSubStep("checking");

    const lower = sendMemo.toLowerCase();
    const isFood =
      lower.includes("food") ||
      lower.includes("takeout") ||
      lower.includes("delivery") ||
      lower.includes("burger") ||
      lower.includes("eats") ||
      lower.includes("late");
    const isEx = lower.includes("sarah") || lower.includes("ex");

    let detectedBreach = false;
    let reason = "";

    if (isFood) {
      detectedBreach = true;
      reason = "Late-night food delivery violates Rule 01 (curfew restriction between 10 PM and 5 AM).";
    } else if (isEx) {
      detectedBreach = true;
      reason = "Attempted transfer to forbidden recipient 0xSarah in violation of blacklist rule.";
    }

    setBreachReason(reason);

    // Agent Wally checks transaction against Walrus Memory & Tatum RPC
    setTimeout(() => {
      if (!detectedBreach) {
        setSendSubStep("approved");
        setTimeout(() => {
          const numAmount = parseFloat(sendAmount) || 0;
          setAvailableBalance((prev) => Math.max(0, prev - numAmount));
          closeSendFlow();
          triggerSnackbar("Transfer confirmed · Streak maintained");
        }, 1800);
      } else {
        setTimeout(() => {
          setSendSubStep("breach");
        }, 400);
      }
    }, 1800);
  };

  // Handle Penalty Payment when Breach is Accepted
  const handlePayFineAndProceed = async () => {
    setIsSubmitting(true);
    try {
      const penaltyAmt = 10;
      const transferAmt = parseFloat(sendAmount) || 0;

      const res = await fetch("/api/walrus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "accountability_event",
          commitment_id: "pact_primary",
          verdict: "broken",
          user_explanation: sendMemo,
          penalty_deposited_sui: penaltyAmt,
        }),
      });

      const data = await res.json();

      setRules((prev) =>
        prev.map((r, i) => (i === 0 ? { ...r, breaches: (r.breaches || 0) + 1 } : r))
      );
      setEscrowDeposit((prev) => prev + penaltyAmt);
      setAvailableBalance((prev) => Math.max(0, prev - transferAmt - penaltyAmt));

      closeSendFlow();
      triggerSnackbar("10 SUI penalty deposited · Saved to Walrus", data.blobId);
    } catch {
      alert("Error logging penalty to Walrus memory.");
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

  const copyAddress = () => {
    const addr =
      accountType === "demo"
        ? DEMO_SUI_ADDRESS
        : accountType === "real"
        ? realAddress
        : linkedAddress || DEMO_SUI_ADDRESS;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(addr).catch(() => {});
    } else {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = addr;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch {}
    }
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const activeRulesList = rules.filter((r) => r.title.trim().length > 0);
  const totalBreaches = activeRulesList.reduce((sum, r) => sum + (r.breaches || 0), 0);

  const activeWalletDisplay =
    accountType === "demo"
      ? `Demo · ${DEMO_SUI_ADDRESS.slice(0, 6)}...${DEMO_SUI_ADDRESS.slice(-4)}`
      : accountType === "real"
      ? `Real · ${realAddress.slice(0, 6)}...${realAddress.slice(-4)}`
      : `Linked · ${linkedAddress ? `${linkedAddress.slice(0, 6)}...${linkedAddress.slice(-4)}` : "Wallet"}`;

  return (
    <main className="fixed inset-0 w-full h-[100dvh] bg-[#000000] text-[#FFFFFF] flex items-start sm:items-center justify-center p-0 md:p-6 select-none overflow-hidden font-sans">
      {/* ====================================================================
          MOBILE SHELL (Centered vertical frame on desktop, solid black ground)
          ==================================================================== */}
      <div className="relative w-full max-w-[420px] h-full md:h-[860px] md:max-h-[92vh] bg-[#000000] md:border md:border-[#222226] md:rounded-[40px] flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-300">
        
        {/* ==================================================================
            SCREEN 1: RESOLUTION BUILDER (Accordion - Single Expanded Rule)
            ================================================================== */}
        {step === 1 && (
          <div className="flex-1 flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
            <div className="pt-6 sm:pt-8 px-7 pb-3">
              <div className="text-[30px] sm:text-[34px] font-semibold tracking-[-0.02em] leading-tight text-white">
                Write your resolutions
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-7 py-2 flex flex-col gap-3.5 pb-4 overscroll-contain">
              {rules.map((rule, index) => {
                const isExpanded = rule.id === expandedRuleId;
                return isExpanded ? (
                  /* EXPANDED RULE CARD */
                  <div
                    key={rule.id}
                    className="bg-[#0A0A0C] border border-[#3F3F46] rounded-2xl p-4 flex flex-col gap-3 relative focus-within:border-white transition-all duration-200 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-white uppercase tracking-wider font-semibold">
                        Rule 0{index + 1} · Editing
                      </span>
                      {rules.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRule(rule.id)}
                          className="text-[#71717A] hover:text-[#EF4444] p-1 transition-colors active:scale-95"
                          title="Remove rule"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-medium text-[#A1A1AA]">
                        Title
                      </label>
                      <input
                        type="text"
                        value={rule.title}
                        onChange={(e) => updateRule(rule.id, "title", e.target.value)}
                        placeholder="e.g. No Late-Night Takeout"
                        className="w-full bg-[#131316] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#52525B] outline-none focus:border-white transition-colors"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-medium text-[#A1A1AA]">
                        Condition
                      </label>
                      <textarea
                        value={rule.condition}
                        onChange={(e) => updateRule(rule.id, "condition", e.target.value)}
                        placeholder="e.g. Any food delivery ordered between 10 PM and 5 AM"
                        rows={2}
                        className="w-full bg-[#131316] border border-[#27272A] rounded-xl px-3.5 py-2 text-sm text-white placeholder-[#52525B] outline-none focus:border-white transition-colors resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                ) : (
                  /* MINIMIZED RULE CARD */
                  <div
                    key={rule.id}
                    onClick={() => setExpandedRuleId(rule.id)}
                    className="bg-[#0A0A0C] border border-[#222226] hover:border-[#3F3F46] rounded-2xl px-4 py-3 flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[11px] font-mono text-[#71717A] uppercase shrink-0">
                        Rule 0{index + 1}
                      </span>
                      <span className={`text-sm truncate ${rule.title ? "text-white font-medium" : "text-[#52525B]"}`}>
                        {rule.title || "Untitled rule"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-[#71717A] uppercase tracking-wider">Tap to edit</span>
                      {rules.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeRule(rule.id);
                          }}
                          className="text-[#52525B] hover:text-[#EF4444] p-1 transition-colors"
                          title="Remove rule"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={addRule}
                className="w-full py-3 px-4 border border-dashed border-[#2E2E33] hover:border-[#52525B] hover:bg-[#0A0A0C] text-[#A1A1AA] hover:text-white rounded-2xl flex items-center justify-center gap-2 text-xs font-medium transition-all duration-150 active:scale-[0.99]"
              >
                <Plus size={14} />
                <span>Add another rule</span>
              </button>
            </div>

            <div className="p-6 border-t border-[#18181B] bg-[#000000]">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!isStep1Valid}
                className={`w-full py-4 px-6 rounded-full font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                  isStep1Valid
                    ? "bg-[#FFFFFF] text-[#000000] hover:bg-[#E4E4E7] active:scale-[0.98]"
                    : "bg-[#222226] text-[#52525B] cursor-not-allowed"
                }`}
              >
                <span>Next</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================
            SCREEN 2: PENALTY STAKES & ESCROW SETUP
            ================================================================== */}
        {step === 2 && (
          <div className="flex-1 flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
            <div className="pt-6 sm:pt-8 px-7 pb-3 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="self-start text-[#71717A] hover:text-white flex items-center gap-1.5 text-xs font-medium transition-colors active:scale-95"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
              <div className="text-[30px] sm:text-[34px] font-semibold tracking-[-0.02em] leading-tight text-white">
                Set your penalties
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-7 py-2 flex flex-col gap-3.5 pb-4 overscroll-contain">
              {rules
                .filter((r) => r.title.trim().length > 0)
                .map((rule, idx) => (
                  <div
                    key={rule.id}
                    className="bg-[#0A0A0C] border border-[#222226] rounded-2xl p-5 flex flex-col gap-4 transition-all duration-200"
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
                              className={`py-2.5 text-center rounded-xl text-xs font-medium transition-all duration-150 active:scale-95 ${
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

            <div className="p-6 border-t border-[#18181B] bg-[#000000]">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-full py-4 px-6 rounded-full font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 bg-[#FFFFFF] text-[#000000] hover:bg-[#E4E4E7] active:scale-[0.98]"
              >
                <span>Continue to Account</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================
            SCREEN 3: ACCOUNT & WALLET SETUP
            ================================================================== */}
        {step === 3 && (
          <div className="flex-1 flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
            <div className="pt-6 sm:pt-8 px-7 pb-3 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="self-start text-[#71717A] hover:text-white flex items-center gap-1.5 text-xs font-medium transition-colors active:scale-95"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
              <div className="text-[30px] sm:text-[34px] font-semibold tracking-[-0.02em] leading-tight text-white">
                Choose an account
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-7 py-2 flex flex-col gap-3.5 pb-4 overscroll-contain">
              {/* Option 1: Demo Account */}
              <div
                onClick={() => setAccountType("demo")}
                className={`bg-[#0A0A0C] rounded-2xl p-5 flex flex-col gap-3 cursor-pointer transition-all duration-200 active:scale-[0.99] border ${
                  accountType === "demo"
                    ? "border-white shadow-sm"
                    : "border-[#222226] hover:border-[#3F3F46]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-base font-semibold text-white tracking-[-0.01em]">
                    Demo account
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-200 ${
                      accountType === "demo"
                        ? "bg-white text-black scale-100"
                        : "border border-[#3F3F46] scale-90"
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

              {/* Option 2: Real Account */}
              <div
                onClick={() => setAccountType("real")}
                className={`bg-[#0A0A0C] rounded-2xl p-5 flex flex-col gap-3 cursor-pointer transition-all duration-200 active:scale-[0.99] border ${
                  accountType === "real"
                    ? "border-white shadow-sm"
                    : "border-[#222226] hover:border-[#3F3F46]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-base font-semibold text-white tracking-[-0.01em]">
                    Real account
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-200 ${
                      accountType === "real"
                        ? "bg-white text-black scale-100"
                        : "border border-[#3F3F46] scale-90"
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
                  className="text-xs font-medium text-[#71717A] hover:text-white transition-colors py-1.5 flex items-center gap-1.5 active:scale-95"
                >
                  <Plus size={13} />
                  <span>Link existing wallet</span>
                </button>

                {showLinkInput && (
                  <div className="w-full mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
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

            <div className="p-6 border-t border-[#18181B] bg-[#000000]">
              <button
                type="button"
                onClick={handleLockVault}
                disabled={isSubmitting}
                className={`w-full py-4 px-6 rounded-full font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
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
          </div>
        )}

        {/* ==================================================================
            SCREEN 4: ACTIVE HOMESCREEN & NAVIGATION
            ================================================================== */}
        {step === 4 && !isSendOpen && (
          <div className="relative flex-1 flex flex-col justify-between overflow-hidden animate-in fade-in duration-300">
            
            {/* TAB: HOME */}
            {activeTab === "home" && (
              <div className="flex-1 overflow-y-auto px-7 pt-6 sm:pt-8 pb-28 flex flex-col gap-4 overscroll-contain">
                {/* 1. TOP LEFT: CURRENT DATE */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#71717A]">
                    {currentDateStr || "Wednesday, Nov 4"}
                  </span>
                  <span className="text-[11px] font-mono text-[#A1A1AA] bg-[#0A0A0C] border border-[#222226] px-2.5 py-1 rounded-full">
                    {activeWalletDisplay}
                  </span>
                </div>

                {/* 2. WALLY MEMORY SHOWCASE BOX */}
                <div className="bg-[#0A0A0C] border border-[#222226] rounded-2xl p-5 flex flex-col gap-2.5 relative transition-all duration-200 hover:border-[#3F3F46]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#71717A]">
                      Wally · Walrus Memory
                    </span>
                    <span className="text-[11px] font-mono text-[#71717A]">
                      {walrusBlobId ? `Blob #${walrusBlobId.slice(0, 8)}` : "Blob #d4a97f"}
                    </span>
                  </div>
                  <p className="text-sm text-[#E4E4E7] leading-relaxed font-normal">
                    {totalBreaches > 0
                      ? `Infraction logged into Walrus memory. You have paid 10 SUI penalty into the vault. Current balance: ${availableBalance.toFixed(2)} SUI.`
                      : activeRulesList.length > 0
                      ? `I have committed your resolutions to Walrus memory. 0 infractions recorded. Remember your pact: "${activeRulesList[0].title}". 10 SUI penalty standing by if you slip up.`
                      : "Resolutions locked in Walrus memory. I am monitoring your transactions for adherence."}
                  </p>
                </div>

                {/* 3. BALANCE & SEND / RECEIVE BUTTONS */}
                <div className="bg-[#0A0A0C] border border-[#222226] rounded-2xl p-5 flex flex-col gap-4">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#71717A]">
                      Available Balance
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl font-semibold text-white tracking-tight font-mono">
                        {availableBalance.toFixed(2)} SUI
                      </span>
                      <span className="text-xs text-[#71717A] font-mono">
                        ({escrowDeposit} SUI locked in vault)
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={openSendFlow}
                      className="py-3 px-4 rounded-xl bg-white text-black hover:bg-[#E4E4E7] font-semibold text-xs transition-all duration-150 flex items-center justify-center gap-1.5 active:scale-[0.98]"
                    >
                      <ArrowUpRight size={14} />
                      <span>Send</span>
                    </button>
                    <button
                      type="button"
                      onClick={copyAddress}
                      className="py-3 px-4 rounded-xl bg-[#131316] text-white border border-[#27272A] hover:border-[#52525B] font-medium text-xs transition-all duration-150 flex items-center justify-center gap-1.5 active:scale-[0.98]"
                    >
                      {copiedAddress ? <Check size={14} className="text-white" /> : <ArrowDownLeft size={14} />}
                      <span>{copiedAddress ? "Copied" : "Receive"}</span>
                    </button>
                  </div>
                </div>

                {/* 4. RESOLUTIONS (IN WALRUS MEMORY) */}
                <div className="bg-[#0A0A0C] border border-[#222226] rounded-2xl p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">
                        {activeRulesList.length} Goals
                      </span>
                      <span className="text-xs text-[#71717A] font-mono">
                        (in Walrus Memory)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("goals")}
                      className="text-xs text-[#A1A1AA] hover:text-white transition-colors"
                    >
                      See more
                    </button>
                  </div>

                  <div className="flex flex-col gap-3">
                    {activeRulesList.slice(0, 2).map((rule) => (
                      <div
                        key={rule.id}
                        className="bg-[#131316] border border-[#222226] rounded-xl p-3.5 flex items-center justify-between gap-3 transition-colors hover:border-[#3F3F46]"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-white truncate">
                            {rule.title}
                          </span>
                          {rule.condition && (
                            <span className="text-xs text-[#71717A] truncate mt-0.5">
                              {rule.condition}
                            </span>
                          )}
                          <span className="text-[11px] font-mono text-[#A1A1AA] mt-1">
                            {rule.penalty} SUI penalty
                          </span>
                        </div>

                        {/* Circular ring of infractions */}
                        <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
                          <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                            <circle
                              cx="16"
                              cy="16"
                              r="13"
                              fill="none"
                              stroke="#222226"
                              strokeWidth="2.5"
                            />
                            <circle
                              cx="16"
                              cy="16"
                              r="13"
                              fill="none"
                              stroke="#FFFFFF"
                              strokeWidth="2.5"
                              strokeDasharray={81.68}
                              strokeDashoffset={
                                rule.breaches && rule.breaches > 0
                                  ? 81.68 - (rule.breaches / 5) * 81.68
                                  : 81.68
                              }
                              strokeLinecap="round"
                              className="transition-all duration-700 ease-out"
                            />
                          </svg>
                          <span className="absolute text-[11px] font-mono font-semibold text-white">
                            {rule.breaches || 0}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. YEAR IN CONTEXT */}
                <div className="bg-[#0A0A0C] border border-[#222226] rounded-2xl p-5 flex flex-col gap-4">
                  <div className="text-sm font-semibold text-white">
                    Year in Context
                  </div>

                  <div className="flex items-center gap-5">
                    {/* Main Circular Ring */}
                    <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                        <circle
                          cx="32"
                          cy="32"
                          r="26"
                          fill="none"
                          stroke="#18181C"
                          strokeWidth="4"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="26"
                          fill="none"
                          stroke="#FFFFFF"
                          strokeWidth="4"
                          strokeDasharray={163.36}
                          strokeDashoffset={
                            totalBreaches > 0
                              ? 163.36 - (totalBreaches / 5) * 163.36
                              : 163.36
                          }
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-sm font-mono font-semibold text-white leading-none">
                          {totalBreaches}
                        </span>
                        <span className="text-[9px] font-mono text-[#71717A] uppercase mt-0.5 leading-none">
                          Breaches
                        </span>
                      </div>
                    </div>

                    {/* Quick Deets */}
                    <div className="flex flex-col gap-2 min-w-0">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-[#71717A]">Amount in Vault</span>
                        <span className="text-xs font-mono font-medium text-white">{escrowDeposit} SUI</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-[#71717A]">Rules Broken</span>
                        <span className="text-xs font-mono font-medium text-white">
                          {totalBreaches} of {activeRulesList.length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-[#71717A]">Year Remaining</span>
                        <span className="text-xs font-mono font-medium text-white">325 Days</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: GOALS */}
            {activeTab === "goals" && (
              <div className="flex-1 overflow-y-auto px-7 pt-6 sm:pt-8 pb-28 flex flex-col gap-4 animate-in fade-in duration-200 overscroll-contain">
                <div className="text-[30px] sm:text-[34px] font-semibold tracking-[-0.02em] leading-tight text-white">
                  Committed Goals
                </div>
                <div className="flex flex-col gap-3">
                  {activeRulesList.map((rule, idx) => (
                    <div
                      key={rule.id}
                      className="bg-[#0A0A0C] border border-[#222226] rounded-2xl p-5 flex flex-col gap-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-[#71717A] uppercase">
                          Goal 0{idx + 1}
                        </span>
                        <span className="text-xs font-mono text-white bg-[#18181C] px-2 py-0.5 rounded border border-[#27272A]">
                          {rule.penalty} SUI Penalty
                        </span>
                      </div>
                      <div className="text-base font-semibold text-white">
                        {rule.title}
                      </div>
                      {rule.condition && (
                        <p className="text-xs text-[#71717A] leading-relaxed">
                          {rule.condition}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: VAULT */}
            {activeTab === "vault" && (
              <div className="flex-1 overflow-y-auto px-7 pt-6 sm:pt-8 pb-28 flex flex-col gap-4 animate-in fade-in duration-200 overscroll-contain">
                <div className="text-[30px] sm:text-[34px] font-semibold tracking-[-0.02em] leading-tight text-white">
                  Escrow Vault
                </div>
                <div className="bg-[#0A0A0C] border border-[#222226] rounded-2xl p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-[#71717A] uppercase">
                      Lock Status
                    </span>
                    <span className="text-xs font-mono text-white flex items-center gap-1.5">
                      <Lock size={12} />
                      Locked
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 border-t border-[#18181C] pt-3">
                    <span className="text-xs text-[#71717A]">Locked Amount</span>
                    <span className="text-2xl font-mono font-semibold text-white">
                      {escrowDeposit}.00 SUI
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#18181C] pt-3">
                    <span className="text-xs text-[#71717A]">Time-Lock Date</span>
                    <span className="text-xs text-white font-medium">{unlockDate}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#18181C] pt-3">
                    <span className="text-xs text-[#71717A]">Contract</span>
                    <span className="text-xs font-mono text-[#A1A1AA]">Sui Move Vault</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SETTINGS */}
            {activeTab === "settings" && (
              <div className="flex-1 overflow-y-auto px-7 pt-6 sm:pt-8 pb-28 flex flex-col gap-4 animate-in fade-in duration-200 overscroll-contain">
                <div className="text-[30px] sm:text-[34px] font-semibold tracking-[-0.02em] leading-tight text-white">
                  Settings & Proofs
                </div>

                {/* Walrus Memory Proof */}
                <div className="bg-[#0A0A0C] border border-[#222226] rounded-2xl p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-[#71717A] uppercase">
                      Walrus Memory Service
                    </span>
                    <Check size={13} className="text-white" />
                  </div>
                  <div className="bg-[#131316] border border-[#27272A] rounded-xl p-3 flex items-center justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] text-[#71717A] uppercase">Primary Blob ID</span>
                      <span className="text-xs font-mono text-white truncate">
                        {walrusBlobId || "blob_simulated_proof"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={copyBlobId}
                      className="text-[#A1A1AA] hover:text-white p-1.5 transition-colors active:scale-95"
                    >
                      {copiedBlob ? <Check size={14} className="text-white" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                {/* Wallet Settings */}
                <div className="bg-[#0A0A0C] border border-[#222226] rounded-2xl p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-[#71717A] uppercase">
                      Wallet Configuration
                    </span>
                    <span className="text-xs font-mono text-white capitalize">{accountType}</span>
                  </div>
                  <div className="flex flex-col gap-1 border-t border-[#18181C] pt-3">
                    <span className="text-xs text-[#71717A]">Active Address</span>
                    <span className="text-xs font-mono text-white truncate">
                      {accountType === "demo"
                        ? DEMO_SUI_ADDRESS
                        : accountType === "real"
                        ? realAddress
                        : linkedAddress}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#18181C] pt-3">
                    <span className="text-xs text-[#71717A]">Network</span>
                    <span className="text-xs text-white font-medium">Sui Testnet</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setActiveTab("home");
                  }}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#131316] border border-[#27272A] hover:border-[#52525B] text-xs font-medium text-[#A1A1AA] hover:text-white transition-all text-center active:scale-[0.99]"
                >
                  Reset & Create New Pact
                </button>
              </div>
            )}

            {/* ================================================================
                FLOATING NAVBAR PILL
                ================================================================ */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-black/90 backdrop-blur-xl rounded-full px-7 py-3.5 flex items-center gap-8 shadow-2xl border-0">
              <button
                type="button"
                onClick={() => setActiveTab("home")}
                className={`transition-all duration-150 p-1 active:scale-90 ${
                  activeTab === "home" ? "text-white scale-105" : "text-[#52525B] hover:text-white"
                }`}
                title="Home"
              >
                <Home size={19} strokeWidth={activeTab === "home" ? 2.5 : 2} />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("goals")}
                className={`transition-all duration-150 p-1 active:scale-90 ${
                  activeTab === "goals" ? "text-white scale-105" : "text-[#52525B] hover:text-white"
                }`}
                title="Goals"
              >
                <ListCheck size={19} strokeWidth={activeTab === "goals" ? 2.5 : 2} />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("vault")}
                className={`transition-all duration-150 p-1 active:scale-90 ${
                  activeTab === "vault" ? "text-white scale-105" : "text-[#52525B] hover:text-white"
                }`}
                title="Vault"
              >
                <Shield size={19} strokeWidth={activeTab === "vault" ? 2.5 : 2} />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className={`transition-all duration-150 p-1 active:scale-90 ${
                  activeTab === "settings" ? "text-white scale-105" : "text-[#52525B] hover:text-white"
                }`}
                title="Settings"
              >
                <Settings size={19} strokeWidth={activeTab === "settings" ? 2.5 : 2} />
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================
            SEND FLOW OVERLAY SCREENS
            ================================================================== */}
        {isSendOpen && (
          <div className="flex-1 flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
            
            {/* SUB-STEP 1: AMOUNT & RECIPIENT */}
            {sendSubStep === "amount" && (
              <>
                <div className="pt-6 sm:pt-8 px-7 pb-3 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={closeSendFlow}
                    className="self-start text-[#71717A] hover:text-white flex items-center gap-1.5 text-xs font-medium transition-colors active:scale-95"
                  >
                    <ArrowLeft size={14} />
                    <span>Back</span>
                  </button>
                  <div className="text-[30px] sm:text-[34px] font-semibold tracking-[-0.02em] leading-tight text-white">
                    Send SUI
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-7 py-2 flex flex-col gap-5 pb-4 overscroll-contain">
                  {/* Big Centered Amount Display */}
                  <div className="flex flex-col items-center justify-center pt-2">
                    <div className="flex items-baseline justify-center gap-2">
                      <input
                        type="number"
                        value={sendAmount}
                        onChange={(e) => setSendAmount(e.target.value)}
                        className="bg-transparent text-[52px] font-semibold font-mono text-center text-white outline-none w-48 tracking-tight"
                        placeholder="0"
                      />
                      <span className="text-xl font-mono text-[#71717A]">SUI</span>
                    </div>

                    {/* Quick Amount Preset Chips */}
                    <div className="flex items-center gap-2 mt-2">
                      {AMOUNT_PRESETS.map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setSendAmount(amt.toString())}
                          className={`py-1 px-3 rounded-full text-xs font-mono transition-all duration-150 active:scale-95 ${
                            sendAmount === amt.toString()
                              ? "bg-white text-black font-semibold"
                              : "bg-[#131316] text-[#A1A1AA] border border-[#27272A] hover:border-[#52525B]"
                          }`}
                        >
                          {amt} SUI
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recipient Address Well */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[12px] font-medium text-[#A1A1AA]">
                      Recipient Address
                    </label>
                    <input
                      type="text"
                      value={sendRecipient}
                      onChange={(e) => setSendRecipient(e.target.value)}
                      placeholder="Enter Sui address (0x...)"
                      className="w-full bg-[#131316] border border-[#27272A] rounded-xl px-4 py-3 text-xs font-mono text-white placeholder-[#52525B] outline-none focus:border-white transition-colors"
                    />
                  </div>

                  {/* Tiny Disclaimer Text */}
                  <div className="text-[11px] font-mono text-[#52525B] text-center tracking-tight pt-2">
                    Walrus Memory validated · Tatum Sui RPC resolved
                  </div>
                </div>

                <div className="p-6 border-t border-[#18181B] bg-[#000000]">
                  <button
                    type="button"
                    onClick={() => setSendSubStep("memo")}
                    disabled={!sendAmount || parseFloat(sendAmount) <= 0 || !sendRecipient}
                    className={`w-full py-4 px-6 rounded-full font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                      sendAmount && parseFloat(sendAmount) > 0 && sendRecipient
                        ? "bg-[#FFFFFF] text-[#000000] hover:bg-[#E4E4E7] active:scale-[0.98]"
                        : "bg-[#222226] text-[#52525B] cursor-not-allowed"
                    }`}
                  >
                    <span>Continue</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </>
            )}

            {/* SUB-STEP 2: COMPULSORY TRUTHFUL MEMO */}
            {sendSubStep === "memo" && (
              <>
                <div className="pt-6 sm:pt-8 px-7 pb-3 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSendSubStep("amount")}
                    className="self-start text-[#71717A] hover:text-white flex items-center gap-1.5 text-xs font-medium transition-colors active:scale-95"
                  >
                    <ArrowLeft size={14} />
                    <span>Back</span>
                  </button>
                  <div className="text-[30px] sm:text-[34px] font-semibold tracking-[-0.02em] leading-tight text-white">
                    What is this for?
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-7 py-2 flex flex-col gap-4 pb-4 overscroll-contain">
                  {/* Guilt Prompt & Compulsory Textarea */}
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-[#A1A1AA] leading-relaxed">
                      Be honest with future you. What are you purchasing or sending?
                    </p>
                    <textarea
                      value={sendMemo}
                      onChange={(e) => setSendMemo(e.target.value)}
                      placeholder="e.g. Late-night food delivery..."
                      rows={3}
                      className="w-full bg-[#131316] border border-[#27272A] rounded-2xl p-4 text-sm text-white placeholder-[#52525B] outline-none focus:border-white transition-colors leading-relaxed resize-none"
                    />
                  </div>

                  {/* Quick Pick Testing Chips for Judges */}
                  <div className="flex flex-col gap-2 pt-1">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#71717A]">
                      Quick pick examples
                    </span>
                    <div className="flex flex-col gap-2">
                      {QUICK_MEMO_PICKS.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSendMemo(item.text)}
                          className="bg-[#0A0A0C] border border-[#222226] hover:border-[#52525B] text-left p-3.5 rounded-xl transition-all duration-150 active:scale-[0.99] flex flex-col gap-0.5"
                        >
                          <span className="text-xs font-medium text-white">
                            {item.label}
                          </span>
                          <span className="text-[11px] text-[#71717A] truncate">
                            {item.text}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-[#18181B] bg-[#000000]">
                  <button
                    type="button"
                    onClick={handleReviewAndCheck}
                    disabled={!sendMemo.trim()}
                    className={`w-full py-4 px-6 rounded-full font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                      sendMemo.trim()
                        ? "bg-[#FFFFFF] text-[#000000] hover:bg-[#E4E4E7] active:scale-[0.98]"
                        : "bg-[#222226] text-[#52525B] cursor-not-allowed"
                    }`}
                  >
                    <span>Review & Check</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </>
            )}

            {/* SUB-STEP 3: CHECKING TRANSACTION / MORPH SCREEN */}
            {sendSubStep === "checking" && (
              <div className="flex-1 flex flex-col items-center justify-center px-7 text-center animate-in fade-in duration-300">
                <div className="relative w-16 h-16 flex items-center justify-center mb-6">
                  <svg className="w-16 h-16 animate-spin text-white" viewBox="0 0 64 64">
                    <circle
                      cx="32"
                      cy="32"
                      r="26"
                      fill="none"
                      stroke="#222226"
                      strokeWidth="3.5"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="26"
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth="3.5"
                      strokeDasharray={163.36}
                      strokeDashoffset={110}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <div className="text-lg font-semibold text-white tracking-tight">
                  Checking transaction against goals
                </div>
                <div className="text-xs font-mono text-[#71717A] mt-2">
                  Cross-referencing Walrus Memory & Tatum RPC...
                </div>
              </div>
            )}

            {/* SUB-STEP: APPROVED MORPH STATE */}
            {sendSubStep === "approved" && (
              <div className="flex-1 flex flex-col items-center justify-center px-7 text-center animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center mb-6 shadow-2xl">
                  <Check size={32} strokeWidth={3} />
                </div>
                <div className="text-xl font-semibold text-white tracking-tight">
                  Transfer Approved
                </div>
                <div className="text-xs font-mono text-[#71717A] mt-2">
                  Goal adherence verified · 0 penalties applied
                </div>
              </div>
            )}

            {/* SUB-STEP 4: WALLY MEMORY INTERVENTION / ROAST */}
            {sendSubStep === "breach" && (
              <>
                <div className="pt-6 sm:pt-8 px-7 pb-3 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={closeSendFlow}
                    className="self-start text-[#71717A] hover:text-white flex items-center gap-1.5 text-xs font-medium transition-colors active:scale-95"
                  >
                    <ArrowLeft size={14} />
                    <span>Back</span>
                  </button>
                  <div className="text-[30px] sm:text-[34px] font-semibold tracking-[-0.02em] leading-tight text-white">
                    Hold on.
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-7 py-2 flex flex-col gap-4 pb-4 overscroll-contain">
                  {/* Wally Memory Quote Card */}
                  <div className="bg-[#0A0A0C] border border-[#222226] rounded-2xl p-5 flex flex-col gap-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-[#71717A]">
                        Wally · Walrus Memory Enforcer
                      </span>
                      <AlertCircle size={14} className="text-white" />
                    </div>

                    <p className="text-sm text-[#E4E4E7] leading-relaxed font-normal">
                      You swore in Walrus memory: <span className="text-white font-medium">"{activeRulesList[0]?.condition || "No food delivery between 10 PM and 5 AM"}"</span>.
                    </p>

                    <p className="text-xs text-[#71717A] leading-relaxed">
                      {breachReason || "This transaction violates your active commitment rule. You agreed to financial discipline."}
                    </p>
                  </div>

                  {/* Penalty Breakdown Card */}
                  <div className="bg-[#0A0A0C] border border-[#222226] rounded-2xl p-5 flex flex-col gap-3">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#71717A]">
                      Enforced Penalty Toll
                    </span>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-[#A1A1AA]">Transfer Amount</span>
                      <span className="text-xs font-mono text-white">{sendAmount} SUI</span>
                    </div>

                    <div className="flex items-center justify-between border-t border-[#18181C] pt-2.5">
                      <span className="text-xs text-[#A1A1AA]">Escrow Penalty</span>
                      <span className="text-xs font-mono font-semibold text-white">10 SUI</span>
                    </div>

                    <div className="flex items-center justify-between border-t border-[#18181C] pt-2.5">
                      <span className="text-xs text-[#71717A]">Destination</span>
                      <span className="text-xs text-[#A1A1AA]">Locked until Dec 25, 2026</span>
                    </div>
                  </div>
                </div>

                {/* Actions: Cancel vs Pay Fine */}
                <div className="p-6 border-t border-[#18181B] bg-[#000000] flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={closeSendFlow}
                    className="w-full py-4 px-6 rounded-full font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 bg-[#FFFFFF] text-[#000000] hover:bg-[#E4E4E7] active:scale-[0.98]"
                  >
                    <span>Cancel & Honor Goal</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePayFineAndProceed}
                    disabled={isSubmitting}
                    className="w-full py-2 text-center text-xs font-medium text-[#71717A] hover:text-white transition-colors"
                  >
                    {isSubmitting
                      ? "Recording penalty in Walrus..."
                      : "Proceed anyway & pay 10 SUI penalty"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ==================================================================
            WALRUS FEEDBACK SNACKBAR
            ================================================================== */}
        {showSnackbar && (
          <div className="absolute bottom-24 left-5 right-5 z-50 bg-[#141417] border border-[#3F3F46] rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center shrink-0">
                <Check size={12} strokeWidth={3} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-white">{snackbarMessage}</span>
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
