"use client";

import React, { useState } from "react";
import {
  Settings,
  Target,
  UtensilsCrossed,
  Shield,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Trophy,
  Home,
  Brain,
  Send,
  Lock,
  ArrowRight,
  Flame,
  X,
} from "lucide-react";
import { SolarCompass } from "./solar-compass";
import { ProgressRing } from "./progress-ring";

interface MobileWalletViewProps {
  onTriggerSurge?: () => void;
  className?: string;
}

export function MobileWalletView({
  onTriggerSurge,
  className = "",
}: MobileWalletViewProps) {
  const [activeTab, setActiveTab] = useState<"home" | "goals" | "memory" | "settings">("home");
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Live Wallet State
  const [balanceSui, setBalanceSui] = useState(247.5);
  const [vaultSui, setVaultSui] = useState(1800);
  const [penaltiesPaidSui, setPenaltiesPaidSui] = useState(50);
  const [violationsCount, setViolationsCount] = useState(2);
  const [decisionsCount, setDecisionsCount] = useState(312);

  // Transfer Form State
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [interceptionState, setInterceptionState] = useState<"idle" | "evaluating" | "violation" | "approved">("idle");
  const [interceptionMessage, setInterceptionMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Point-of-Payment Interception Logic
  const handleMemoChange = (val: string) => {
    setMemo(val);
    const lower = val.toLowerCase();

    if (
      lower.includes("cig") ||
      lower.includes("smoke") ||
      lower.includes("vape") ||
      lower.includes("dining") ||
      lower.includes("restaurant") ||
      lower.includes("takeout") ||
      lower.includes("fast food") ||
      lower.includes("bar") ||
      lower.includes("club") ||
      lower.includes("ex")
    ) {
      setInterceptionState("violation");
      setInterceptionMessage(
        "Rule #2 Violation: 'No Dining Out & No Tobacco (January 2026 Pact)'. Proceeding requires a $50 x402 penalty deposit to your Christmas Vault."
      );
    } else if (val.trim().length > 0) {
      setInterceptionState("approved");
      setInterceptionMessage("Clean transaction note. Verified against Walrus Memory.");
    } else {
      setInterceptionState("idle");
      setInterceptionMessage("");
    }
  };

  const handleExecutePayment = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;

    setIsSubmitting(true);

    try {
      if (interceptionState === "violation") {
        // Trigger x402 vault penalty deposit
        onTriggerSurge?.();
        const penaltyFee = 50;
        setVaultSui((prev) => prev + penaltyFee);
        setPenaltiesPaidSui((prev) => prev + penaltyFee);
        setViolationsCount((prev) => prev + 1);
        setBalanceSui((prev) => Math.max(0, prev - numAmount - penaltyFee));

        // Call backend x402 endpoint
        await fetch("/api/vault", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount_sui: penaltyFee,
            reason: `Violation on memo: '${memo}'`,
            commitment_id: "cmt_no_dining_2026",
          }),
        }).catch(() => {});
      } else {
        setBalanceSui((prev) => Math.max(0, prev - numAmount));
      }

      setDecisionsCount((prev) => prev + 1);
      setShowTransferModal(false);
      setRecipient("");
      setAmount("");
      setMemo("");
      setInterceptionState("idle");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`relative w-full max-w-[390px] h-[820px] rounded-[44px] border-[3px] border-[#381B12] bg-[#0A0605] text-[#F5F2EB] shadow-[0_25px_70px_rgba(0,0,0,0.85),0_0_50px_rgba(255,80,0,0.18)] overflow-hidden flex flex-col select-none ${className}`}
    >
      {/* Top Phone Speaker Notch & Status Bar */}
      <div className="pt-3 px-6 pb-2 flex items-center justify-between text-xs text-neutral-400 font-mono">
        <span>9:41</span>
        <div className="w-24 h-4 bg-neutral-900 rounded-full border border-neutral-800" />
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px]">5G</span>
        </div>
      </div>

      {/* Main Content Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3.5 scrollbar-none">
        {/* App Top Bar */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <SolarCompass size={24} />
            <span className="font-serif text-lg font-bold tracking-tight bg-gradient-to-r from-[#FFF0D4] to-[#FFAA44] bg-clip-text text-transparent">
              Yearbound
            </span>
          </div>
          <button
            onClick={() => setActiveTab("settings")}
            className="w-8 h-8 rounded-full bg-neutral-900/80 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
          >
            <Settings size={15} />
          </button>
        </div>

        {/* Greeting Banner */}
        <div className="pt-1">
          <h2 className="font-serif text-xl text-[#F5F2EB] leading-tight">
            Good morning,
          </h2>
          <p className="text-xs text-[#9E968F] mt-0.5">
            Keep going. You&apos;re doing great.
          </p>
        </div>

        {/* CARD 1: "Your 2026 Pact" */}
        <div className="solar-card solar-card-hover rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wide text-[#EADFCF]">
              Your 2026 Pact
            </span>
            <button
              onClick={() => setActiveTab("goals")}
              className="text-[11px] text-[#FF9E44] hover:text-[#FFAE60] font-medium flex items-center gap-0.5 transition-colors"
            >
              View Details <ArrowRight size={11} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            {/* Metric 1 */}
            <div className="flex flex-col items-center p-2 rounded-xl bg-neutral-950/60 border border-white/5">
              <Target size={16} className="text-[#FF7700] mb-1.5" />
              <span className="text-sm font-bold text-white font-mono">$3,000</span>
              <span className="text-[10px] text-neutral-400 mt-0.5">Income Goal</span>
            </div>

            {/* Metric 2 */}
            <div className="flex flex-col items-center p-2 rounded-xl bg-neutral-950/60 border border-white/5">
              <UtensilsCrossed size={16} className="text-[#FF9900] mb-1.5" />
              <span className="text-[11px] font-bold text-white truncate max-w-full">
                No Dining Out
              </span>
              <span className="text-[10px] text-neutral-400 mt-0.5">(This Month)</span>
            </div>

            {/* Metric 3 */}
            <div className="flex flex-col items-center p-2 rounded-xl bg-neutral-950/60 border border-white/5">
              <Shield size={16} className="text-[#FF5500] mb-1.5" />
              <span className="text-sm font-bold text-white font-mono">$50</span>
              <span className="text-[10px] text-neutral-400 mt-0.5">Penalty</span>
            </div>
          </div>
        </div>

        {/* CARD 2: "Your Balance" & "Christmas Vault" */}
        <div className="solar-card solar-card-hover rounded-2xl p-4 flex items-center justify-between relative overflow-hidden">
          {/* Left Side: Liquid Balance */}
          <div className="space-y-1 z-10">
            <div className="flex items-center gap-1.5 text-xs text-[#9E968F]">
              <span>Your Balance</span>
              <Eye size={12} className="text-neutral-500 cursor-pointer" />
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">
              ${balanceSui.toFixed(2)}
            </div>
            <div className="inline-flex items-center gap-1 bg-[#280F08] border border-[#FF5500]/30 rounded-full px-2 py-0.5 text-[10px] text-[#FFA877] font-mono">
              <Flame size={10} className="text-[#FF6600]" />
              <span>${penaltiesPaidSui} in Penalties</span>
            </div>
          </div>

          {/* Right Side: Christmas Vault */}
          <div className="flex flex-col items-end text-right z-10">
            <div className="relative mb-1">
              <SolarCompass size={34} glow={true} />
            </div>
            <div className="text-lg font-bold font-mono tracking-tight text-[#FFE6B3]">
              ${vaultSui.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-[#FFAA44] font-medium mt-0.5">
              <Lock size={10} />
              <span>Locked Until Dec 25</span>
            </div>
          </div>

          {/* Subtle Ambient Radial Glow */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-28 h-28 bg-[#FF6A00]/15 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* CARD 3: "Your Year So Far" */}
        <div className="solar-card solar-card-hover rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wide text-[#EADFCF]">
              Your Year So Far
            </span>
            <button className="text-[11px] text-[#FF9E44] hover:text-[#FFAE60] font-medium flex items-center gap-0.5 transition-colors">
              View All <ArrowRight size={11} />
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            {/* Left: Progress Ring */}
            <ProgressRing progress={72} size={100} strokeWidth={8} />

            {/* Right: Summary Metrics */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                <span className="text-[#D8D2C9] font-mono font-medium">
                  {decisionsCount} Decisions
                </span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-[#FF7700] shrink-0" />
                <span className="text-[#D8D2C9] font-mono font-medium">
                  {violationsCount} Violations
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy size={14} className="text-[#FFAA00] shrink-0" />
                <span className="text-[#D8D2C9] font-mono font-medium">
                  ${penaltiesPaidSui} in Penalties
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Enforcing Transfer Trigger Button */}
        <button
          onClick={() => setShowTransferModal(true)}
          className="w-full btn-flare-primary rounded-xl py-3 px-4 font-semibold text-xs tracking-wide flex items-center justify-center gap-2 shadow-lg"
        >
          <Send size={14} />
          <span>Pay / Send with Mandatory Memo</span>
        </button>
      </div>

      {/* Bottom Phone Navigation */}
      <div className="border-t border-[#2A150E] bg-[#0E0705]/95 backdrop-blur-md px-6 py-3 flex items-center justify-between text-xs text-[#9E968F]">
        <button
          onClick={() => setActiveTab("home")}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeTab === "home" ? "text-[#FF8800] font-semibold" : "hover:text-white"
          }`}
        >
          <Home size={18} />
          <span className="text-[10px]">Home</span>
        </button>

        <button
          onClick={() => setActiveTab("goals")}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeTab === "goals" ? "text-[#FF8800] font-semibold" : "hover:text-white"
          }`}
        >
          <Target size={18} />
          <span className="text-[10px]">Goals</span>
        </button>

        <button
          onClick={() => setActiveTab("memory")}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeTab === "memory" ? "text-[#FF8800] font-semibold" : "hover:text-white"
          }`}
        >
          <Brain size={18} />
          <span className="text-[10px]">Memory</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeTab === "settings" ? "text-[#FF8800] font-semibold" : "hover:text-white"
          }`}
        >
          <Settings size={18} />
          <span className="text-[10px]">Settings</span>
        </button>
      </div>

      {/* MODAL: Point-of-Payment Interception & Enforcing Transfer */}
      {showTransferModal && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col justify-end p-4 animate-in fade-in duration-200">
          <div className="solar-card rounded-3xl p-5 space-y-4 border border-[#FF6600]/40 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <SolarCompass size={20} />
                <span className="font-semibold text-sm text-white">
                  Accountable Transfer
                </span>
              </div>
              <button
                onClick={() => setShowTransferModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] text-neutral-400 mb-1 block">
                  Recipient Sui Address
                </label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="0x3b89...recipient"
                  className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#FF7700]"
                />
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 mb-1 block">
                  Amount in SUI
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="25.0"
                  className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#FF7700]"
                />
              </div>

              <div>
                <label className="text-[11px] text-[#FFAA55] font-semibold mb-1 block flex items-center justify-between">
                  <span>*Mandatory Purpose Note / Memo</span>
                  <span className="text-[10px] text-neutral-400 font-normal">
                    Checked by Walrus
                  </span>
                </label>
                <input
                  type="text"
                  value={memo}
                  onChange={(e) => handleMemoChange(e.target.value)}
                  placeholder="e.g. Dining out, cigarettes, rent, groceries..."
                  className="w-full bg-neutral-950/80 border border-[#FF6600]/30 rounded-xl px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-[#FF8800]"
                />
              </div>

              {/* Interception Warning Banner */}
              {interceptionState === "violation" && (
                <div className="p-3 rounded-xl bg-[#2D0B05] border border-[#FF4400]/60 space-y-1.5 animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-1.5 text-[#FF6633] font-bold text-[11px]">
                    <AlertTriangle size={13} />
                    <span>Mascot Interception: Broken Commitment</span>
                  </div>
                  <p className="text-[11px] text-[#F5C2B3] leading-relaxed">
                    {interceptionMessage}
                  </p>
                </div>
              )}

              {interceptionState === "approved" && (
                <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-[11px] flex items-center gap-1.5">
                  <CheckCircle2 size={13} />
                  <span>{interceptionMessage}</span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={handleExecutePayment}
                disabled={isSubmitting || !recipient || !amount || !memo}
                className={`w-full py-3 rounded-xl font-semibold text-xs tracking-wide flex items-center justify-center gap-1.5 transition-all ${
                  interceptionState === "violation"
                    ? "bg-gradient-to-r from-[#D82A00] to-[#FF5500] text-white shadow-[0_0_20px_rgba(255,60,0,0.5)]"
                    : "btn-flare-primary"
                } disabled:opacity-40`}
              >
                <Lock size={13} />
                <span>
                  {interceptionState === "violation"
                    ? "Accept $50 x402 Penalty & Lock to Vault"
                    : "Confirm & Broadcast Transfer"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
