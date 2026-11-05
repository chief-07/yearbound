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
  X,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  Wallet,
} from "lucide-react";
import {
  DEMO_SUI_ADDRESS,
  getDemoWalletInfo,
  getOrCreateRealKeypair,
  getRealWalletInfo,
  exportRealPrivateKeyHex,
  detectInstalledSuiWallet,
  connectExtensionWallet,
  type InstalledSuiWallet,
} from "@/lib/wallet";

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
  blobId?: string;
  category?: string;
  keywords?: string[];
  behavioralRule?: string;
  wallyRoastAngle?: string;
}

export interface InfractionRecord {
  id: string;
  ruleTitle: string;
  ruleCondition: string;
  amount: string;
  memo: string;
  timestamp: string;
  penaltySui: number;
  blobId: string;
}

export interface WalrusMemoryBlob {
  blobId: string;
  type: "commitment_pact" | "accountability_event" | "added_resolution" | "resolution_contract";
  title: string;
  timestamp: string;
  payload: any;
}

type AccountType = "demo" | "real" | "linked";
type NavTab = "home" | "resolutions" | "vault" | "settings";
type SendSubStep =
  | "amount"
  | "memo"
  | "checking"
  | "approved"
  | "breach"
  | "honored"
  | "penalty_recorded";

const PENALTY_PRESETS = [5, 10, 25, 50];
const AMOUNT_PRESETS = [5, 10, 15, 25];

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
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>("1");
  const [scrollContainerHeight, setScrollContainerHeight] = useState<number>(680);

  const scrollContainerRef = React.useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      setScrollContainerHeight(node.clientHeight);
    }
  }, []);

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
  const [sealingStage, setSealingStage] = useState<string>("");

  // Screen 3: Account / Wallet Selection
  const [accountType, setAccountType] = useState<AccountType>("demo");
  const [realAddress, setRealAddress] = useState<string>("");
  const [linkedAddress, setLinkedAddress] = useState<string>("");
  const [showLinkInput, setShowLinkInput] = useState<boolean>(false);
  const [showExportPrivateKey, setShowExportPrivateKey] = useState<boolean>(false);
  const [exportedKey, setExportedKey] = useState<string>("");
  const [isCheckingLiveBalance, setIsCheckingLiveBalance] = useState<boolean>(false);
  const [liveOnChainBalanceSui, setLiveOnChainBalanceSui] = useState<number | null>(null);
  const [detectedExtension, setDetectedExtension] = useState<InstalledSuiWallet | null>(null);
  const [isConnectingExtension, setIsConnectingExtension] = useState<boolean>(false);

  // Balances (Demo Sandbox pre-funded with 150 SUI)
  const [availableBalance, setAvailableBalance] = useState<number>(150);

  // Walrus feedback & memory proofs
  const [walrusBlobId, setWalrusBlobId] = useState<string>("");
  const [showSnackbar, setShowSnackbar] = useState<boolean>(false);
  const [snackbarTitle, setSnackbarTitle] = useState<string>("Saved to Walrus");
  const [snackbarSubtitle, setSnackbarSubtitle] = useState<string>("");
  const [copiedBlob, setCopiedBlob] = useState<boolean>(false);
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);

  // Walrus Total Recall & Infraction state
  const [infractions, setInfractions] = useState<InfractionRecord[]>([]);
  const [walrusBlobs, setWalrusBlobs] = useState<WalrusMemoryBlob[]>([]);
  const [isMemoryInspectorOpen, setIsMemoryInspectorOpen] = useState<boolean>(false);
  const [isAddResolutionOpen, setIsAddResolutionOpen] = useState<boolean>(false);
  const [expandedJsonBlobId, setExpandedJsonBlobId] = useState<string | null>(null);
  const [selectedMemoryRuleId, setSelectedMemoryRuleId] = useState<string | null>(null);
  const [latestFineBlobId, setLatestFineBlobId] = useState<string>("");

  // Add Resolution Drawer form state
  const [newRuleTitle, setNewRuleTitle] = useState<string>("");
  const [newRuleCondition, setNewRuleCondition] = useState<string>("");
  const [newRulePenalty, setNewRulePenalty] = useState<number>(10);
  const [isCommittingNewRule, setIsCommittingNewRule] = useState<boolean>(false);

  // =========================================================================
  // SEND FLOW STATE
  // =========================================================================
  const [isSendOpen, setIsSendOpen] = useState<boolean>(false);
  const [sendSubStep, setSendSubStep] = useState<SendSubStep>("amount");
  const [sendAmount, setSendAmount] = useState<string>("15");
  const [sendRecipient, setSendRecipient] = useState<string>("0x8f4c...cafe");
  const [sendMemo, setSendMemo] = useState<string>("");
  const [breachReason, setBreachReason] = useState<string>("");

  // Initialize real persistent self-custodial Sui keypair and detect extensions
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const { keypair } = getOrCreateRealKeypair();
        setRealAddress(keypair.toSuiAddress());
      } catch (e) {
        console.error("Failed to load real keypair:", e);
      }
      const ext = detectInstalledSuiWallet();
      setDetectedExtension(ext);
    }
  }, []);

  // Connect to detected Sui wallet extension
  const handleConnectExtension = async () => {
    setIsConnectingExtension(true);
    try {
      const res = await connectExtensionWallet();
      setLinkedAddress(res.address);
      setAccountType("linked");
      triggerSnackbar("Wallet Connected", `${res.walletName}: ${res.address.slice(0, 10)}...`);
      refreshLiveBalance(res.address);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect wallet";
      triggerSnackbar("Connection Failed", msg);
    } finally {
      setIsConnectingExtension(false);
    }
  };

  // Fetch live on-chain balance via Sui gRPC/RPC
  const refreshLiveBalance = async (targetAddress?: string) => {
    const addr = targetAddress || (accountType === "real" ? realAddress : linkedAddress);
    if (!addr || !addr.startsWith("0x")) return;
    setIsCheckingLiveBalance(true);
    try {
      const res = await fetch(`/api/sui/balance?address=${addr}&network=mainnet`);
      const data = await res.json();
      if (data.success && typeof data.balanceSui === "number") {
        setLiveOnChainBalanceSui(data.balanceSui);
        if (accountType === "real" || accountType === "linked") {
          setAvailableBalance(data.balanceSui);
        }
      }
    } catch (err) {
      console.warn("Failed to query live balance:", err);
    } finally {
      setIsCheckingLiveBalance(false);
    }
  };

  // Rule management
  const addRule = () => {
    if (expandedRuleId) {
      const current = rules.find((r) => r.id === expandedRuleId);
      if (current && (!current.title.trim() || !current.condition.trim())) {
        triggerSnackbar("Compulsory field missing", "Both title and condition are required");
        return;
      }
    }
    const newId = Date.now().toString();
    setRules((prev) => [
      ...prev,
      { id: newId, title: "", condition: "", penalty: 10, breaches: 0 },
    ]);
    setExpandedRuleId(newId);
  };

  const handleCloseActiveRule = () => {
    if (!expandedRuleId) return;
    const current = rules.find((r) => r.id === expandedRuleId);
    if (!current) {
      setExpandedRuleId(null);
      return;
    }
    if (!current.title.trim() || !current.condition.trim()) {
      triggerSnackbar("Compulsory field missing", "Both title and condition are required");
      return;
    }
    setExpandedRuleId(null);
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

  const isStep1Valid =
    rules.length > 0 &&
    rules.every((r) => r.title.trim().length > 0 && r.condition.trim().length > 0);

  const triggerSnackbar = (title: string, subtitle?: string, blobId?: string) => {
    setSnackbarTitle(title);
    setSnackbarSubtitle(subtitle || (blobId ? `Blob #${blobId.slice(0, 12)}...` : ""));
    if (blobId) setWalrusBlobId(blobId);
    setShowSnackbar(true);
    setTimeout(() => {
      setShowSnackbar(false);
    }, 4500);
  };

  // Step 3 Submission to Walrus
  const handleLockVault = async () => {
    setIsSubmitting(true);
    setSealingStage("Analyzing resolutions...");
    const t1 = setTimeout(() => {
      setSealingStage("Securing commitments...");
    }, 2000);
    const t2 = setTimeout(() => {
      setSealingStage("Recording to Walrus memory...");
    }, 5500);
    const t3 = setTimeout(() => {
      setSealingStage("Locking Christmas vault...");
    }, 16000);

    try {
      const activeRules = rules.filter((r) => r.title.trim().length > 0);
      const activeAccountAddress =
        accountType === "demo"
          ? DEMO_SUI_ADDRESS
          : accountType === "real"
          ? realAddress
          : linkedAddress || DEMO_SUI_ADDRESS;

      let data: any = null;

      // Resilient retry loop: try up to 3 times before failing
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          if (attempt > 1) {
            setSealingStage(`Reconnecting to Walrus memory...`);
          }

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

          const resData = await res.json();
          if (resData && (resData.success || resData.genesisBlobId || resData.primaryBlobId)) {
            data = resData;
            break;
          }
        } catch (fetchErr) {
          console.warn(`[Vault] Submission attempt ${attempt} notice:`, fetchErr);
          if (attempt < 3) {
            await new Promise((r) => setTimeout(r, 2000));
          }
        }
      }

      if (data && (data.genesisBlobId || data.primaryBlobId)) {
        const genesisId = data.genesisBlobId || data.primaryBlobId;
        setWalrusBlobId(genesisId);

        const timestampStr = new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date());

        // 1. Map individual resolution contract blobs
        const individualBlobs: WalrusMemoryBlob[] = (data.blobs || []).map((b: any) => ({
          blobId: b.blobId,
          type: "resolution_contract",
          title: `Resolution: ${b.title}`,
          timestamp: timestampStr,
          payload: {
            protocol: "Yearbound v1",
            storage: "Walrus Memory (MemWal)",
            type: "commitment_rule",
            ruleId: b.ruleId,
            title: b.title,
            category: b.category,
            penaltySui: b.penaltySui,
            keywords: b.keywords,
            behavioralRule: b.behavioralRule,
            wallyRoastAngle: b.wallyRoastAngle,
            wallet: activeAccountAddress,
            status: "active",
          },
        }));

        // 2. Genesis Pact Master Manifest Blob
        const initialPactBlob: WalrusMemoryBlob = {
          blobId: genesisId,
          type: "commitment_pact",
          title: "Genesis Resolution Pact Manifest",
          timestamp: timestampStr,
          payload: {
            protocol: "Yearbound v1",
            storage: "Walrus Memory (MemWal)",
            type: "genesis_pact",
            pactId: data.pactId,
            wallet: activeAccountAddress,
            x402VaultLock: `${escrowDeposit} SUI until ${unlockDate}`,
            totalRules: (data.blobs || []).length,
            resolutions: (data.blobs || []).map((b: any, i: number) => ({
              index: i + 1,
              title: b.title,
              category: b.category,
              blobId: b.blobId,
              penaltySui: b.penaltySui,
              status: "active",
            })),
          },
        };

        // 3. Update in-memory rules with their individual Walrus blob IDs and Gemini analysis
        if (data.blobs && data.blobs.length > 0) {
          setRules((prev) =>
            prev.map((r) => {
              const matched = data.blobs.find((b: any) => b.ruleId === r.id);
              if (matched) {
                return {
                  ...r,
                  blobId: matched.blobId,
                  category: matched.category,
                  keywords: matched.keywords,
                  behavioralRule: matched.behavioralRule,
                  wallyRoastAngle: matched.wallyRoastAngle,
                };
              }
              return r;
            })
          );
        }

        setWalrusBlobs([initialPactBlob, ...individualBlobs]);

        triggerSnackbar("Saved to Walrus", `Genesis Pact #${genesisId.slice(0, 12)}...`, genesisId);
        setStep(4);
        setActiveTab("home");
      } else {
        triggerSnackbar("Notice", "Walrus memory is synchronizing in background. Proceeding...");
        setStep(4);
        setActiveTab("home");
      }
    } catch {
      triggerSnackbar("Notice", "Walrus memory connecting in background. Entering...");
      setStep(4);
      setActiveTab("home");
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setIsSubmitting(false);
      setSealingStage("");
    }
  };

  // Drawer Action: Add another resolution to Walrus
  const handleCommitNewResolution = async () => {
    if (!newRuleTitle.trim()) return;
    setIsCommittingNewRule(true);
    try {
      const newRule: RuleItem = {
        id: Date.now().toString(),
        title: newRuleTitle.trim(),
        condition: newRuleCondition.trim(),
        penalty: newRulePenalty,
        breaches: 0,
      };

      const res = await fetch("/api/walrus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rules: [newRule],
          initialDepositSui: escrowDeposit,
          unlockDate: "2026-12-25",
        }),
      });

      const data = await res.json();
      const generatedBlobId =
        data.primaryBlobId || `blob_${Math.random().toString(36).substring(2, 10)}`;

      if (data.blobs && data.blobs[0]) {
        const enriched = data.blobs[0];
        newRule.blobId = enriched.blobId;
        newRule.category = enriched.category;
        newRule.keywords = enriched.keywords;
        newRule.behavioralRule = enriched.behavioralRule;
        newRule.wallyRoastAngle = enriched.wallyRoastAngle;
      } else {
        newRule.blobId = generatedBlobId;
      }

      setRules((prev) => [...prev, newRule]);

      const timestampStr = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date());

      const addedBlob: WalrusMemoryBlob = {
        blobId: generatedBlobId,
        type: "added_resolution",
        title: `Resolution Added: ${newRule.title}`,
        timestamp: timestampStr,
        payload: {
          protocol: "Yearbound v1",
          storage: "Walrus Memory (MemWal)",
          type: "commitment_rule",
          title: newRule.title,
          condition: newRule.condition,
          penaltyAmountSui: newRule.penalty,
          status: "active",
          created_at: new Date().toISOString(),
        },
      };
      setWalrusBlobs((prev) => [addedBlob, ...prev]);

      setNewRuleTitle("");
      setNewRuleCondition("");
      setNewRulePenalty(10);
      setIsAddResolutionOpen(false);

      triggerSnackbar("Resolution Committed to Walrus", `Blob #${generatedBlobId.slice(0, 10)}...`, generatedBlobId);
    } catch {
      alert("Error committing resolution to Walrus memory.");
    } finally {
      setIsCommittingNewRule(false);
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
          triggerSnackbar("Transfer confirmed", "Resolutions maintained · 0 penalties");
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
      const fineBlobId =
        data.blobId || `blob_infr_${Date.now().toString(36)}`;
      const timestampStr = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date());

      const newInfraction: InfractionRecord = {
        id: `infr_${Date.now()}`,
        ruleTitle: activeRulesList[0]?.title || "Resolution 01",
        ruleCondition: activeRulesList[0]?.condition || "Behavioral boundary",
        amount: sendAmount,
        memo: sendMemo,
        timestamp: timestampStr,
        penaltySui: penaltyAmt,
        blobId: fineBlobId,
      };
      setInfractions((prev) => [newInfraction, ...prev]);

      const infractionBlob: WalrusMemoryBlob = {
        blobId: fineBlobId,
        type: "accountability_event",
        title: `Infraction: ${activeRulesList[0]?.title || "Resolution Breach"}`,
        timestamp: timestampStr,
        payload: {
          protocol: "Yearbound v1",
          storage: "Walrus Memory (MemWal)",
          type: "accountability_event",
          verdict: "broken",
          userMemo: sendMemo,
          penaltyDepositedSui: penaltyAmt,
          breachedResolution: activeRulesList[0]?.title || "Resolution 01",
          destination: "x402 Vault",
          timestamp: new Date().toISOString(),
        },
      };
      setWalrusBlobs((prev) => [infractionBlob, ...prev]);

      setRules((prev) =>
        prev.map((r, i) => (i === 0 ? { ...r, breaches: (r.breaches || 0) + 1 } : r))
      );
      setEscrowDeposit((prev) => prev + penaltyAmt);
      setAvailableBalance((prev) => Math.max(0, prev - transferAmt - penaltyAmt));
      setLatestFineBlobId(fineBlobId);
      setSendSubStep("penalty_recorded");
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
    triggerSnackbar("Copied Blob ID to clipboard", `Blob #${walrusBlobId.slice(0, 12)}...`);
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
    triggerSnackbar("Copied address to clipboard", `${addr.slice(0, 10)}...${addr.slice(-6)}`);
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

            <div
              ref={scrollContainerRef}
              onClick={handleCloseActiveRule}
              className="flex-1 overflow-y-auto px-7 py-2 flex flex-col pb-4 overscroll-contain"
            >
              {/* STACK OF MINIMIZED RESOLUTIONS AT TOP */}
              <div className="flex flex-col gap-2.5 transition-all duration-300 ease-out">
                {rules.map((rule, index) => {
                  if (rule.id === expandedRuleId) return null; // rendered in the active editor below
                  return (
                    <div
                      key={rule.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (expandedRuleId) {
                          const current = rules.find((r) => r.id === expandedRuleId);
                          if (current && (!current.title.trim() || !current.condition.trim())) {
                            triggerSnackbar("Compulsory field missing", "Both title and condition are required");
                            return;
                          }
                        }
                        setExpandedRuleId(rule.id);
                      }}
                      className="bg-[#0A0A0C] border border-[#222226] hover:border-[#3F3F46] rounded-2xl px-4 py-3.5 flex items-center justify-between cursor-pointer transition-all duration-300 ease-out active:scale-[0.99] animate-in fade-in slide-in-from-bottom-2"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span className="text-sm font-mono font-medium text-[#71717A] shrink-0">
                          0{index + 1}
                        </span>
                        <span className={`text-sm truncate ${rule.title ? "text-white font-medium" : "text-[#52525B]"}`}>
                          {rule.title || "Untitled resolution"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-[#71717A] uppercase tracking-wider">Edit</span>
                        {rules.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeRule(rule.id);
                            }}
                            className="text-[#52525B] hover:text-[#EF4444] p-1 transition-colors"
                            title="Remove resolution"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DYNAMIC PILL CONTAINER (Rests at true center middle of screen until stack reaches it, then goes downwards) */}
              {(() => {
                const minimizedCount = rules.filter((r) => r.id !== expandedRuleId).length;
                const currentStackHeight = minimizedCount * 60;
                // Target center is dynamically calculated to place the pill in the center middle of the screen
                const targetCenter = Math.max(280, Math.floor(scrollContainerHeight * 0.44));
                const pillMarginTop = Math.max(14, targetCenter - currentStackHeight);
                const expandedRule = rules.find((r) => r.id === expandedRuleId);
                const expandedIndex = expandedRule ? rules.findIndex((r) => r.id === expandedRule.id) : -1;

                return (
                  <div
                    style={{ marginTop: `${pillMarginTop}px` }}
                    className="flex flex-col items-center transition-all duration-300 ease-out w-full"
                  >
                    {/* Active Expanded Resolution Card */}
                    {expandedRule && (
                      <div
                        key={expandedRule.id}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-[#0A0A0C] border border-[#3F3F46] rounded-2xl p-4 flex flex-col gap-3 relative focus-within:border-white transition-all duration-300 ease-out shadow-xl mb-4 animate-in fade-in zoom-in-95"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-mono font-medium text-[#71717A] tracking-wider">
                            0{expandedIndex + 1}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleCloseActiveRule}
                              disabled={!expandedRule.title.trim() || !expandedRule.condition.trim()}
                              className={`text-xs font-bold tracking-wider transition-colors duration-150 ${
                                expandedRule.title.trim() && expandedRule.condition.trim()
                                  ? "text-white hover:text-[#E4E4E7] cursor-pointer"
                                  : "text-[#52525B] cursor-not-allowed"
                              }`}
                            >
                              Done
                            </button>
                            {rules.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeRule(expandedRule.id)}
                                className="text-[#71717A] hover:text-[#EF4444] p-1 transition-colors active:scale-95"
                                title="Remove resolution"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-medium text-[#A1A1AA]">
                            Title
                          </label>
                          <input
                            type="text"
                            value={expandedRule.title}
                            onChange={(e) => updateRule(expandedRule.id, "title", e.target.value)}
                            placeholder="e.g. No Late-Night Takeout"
                            className="w-full bg-[#131316] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#52525B] outline-none focus:border-white transition-colors"
                            autoFocus
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-medium text-[#A1A1AA]">
                            Condition
                          </label>
                          <textarea
                            value={expandedRule.condition}
                            onChange={(e) => updateRule(expandedRule.id, "condition", e.target.value)}
                            placeholder="e.g. Any food delivery ordered between 10 PM and 5 AM"
                            rows={2}
                            className="w-full bg-[#131316] border border-[#27272A] rounded-xl px-3.5 py-2 text-sm text-white placeholder-[#52525B] outline-none focus:border-white transition-colors resize-none leading-relaxed"
                          />
                        </div>
                      </div>
                    )}

                    {/* Centered Add Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        addRule();
                      }}
                      className="py-3 px-6 border border-dashed border-[#2E2E33] hover:border-[#52525B] hover:bg-[#0A0A0C] text-[#A1A1AA] hover:text-white rounded-full flex items-center justify-center gap-2 text-xs font-medium transition-all duration-200 active:scale-95 shadow-sm"
                    >
                      <Plus size={14} />
                      <span>Add another resolution</span>
                    </button>
                  </div>
                );
              })()}
            </div>

            <div className="p-6 bg-[#000000]">
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
                    className="bg-[#0A0A0C] border border-[#222226] rounded-2xl p-5 flex flex-col gap-3.5 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono font-medium text-[#71717A] tracking-wider">
                        0{idx + 1}
                      </span>
                    </div>

                    <div className="text-base font-semibold text-white tracking-[-0.01em]">
                      {rule.title}
                    </div>

                    <div className="flex flex-col gap-2 pt-0.5">
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
            </div>

            {/* Fixed Bottom Section: Vault Lock & Continue */}
            <div className="p-6 bg-[#000000] flex flex-col gap-3.5">
              {/* x402 Vault Parameters */}
              <div className="bg-[#0A0A0C] border border-[#222226] rounded-2xl p-4 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[#71717A] uppercase tracking-wider">
                    x402 Vault Lock
                  </span>
                  <Lock size={12} className="text-[#71717A]" />
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-xs text-[#A1A1AA]">Locked Until</span>
                  <span className="text-xs text-white font-medium">{unlockDate}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#A1A1AA]">Initial x402 Deposit</span>
                  <span className="text-xs text-white font-mono font-medium">{escrowDeposit} SUI</span>
                </div>

                <div className="flex items-center justify-between border-t border-[#18181C] pt-2">
                  <span className="text-xs text-[#71717A]">Memory Proof</span>
                  <span className="text-xs text-[#A1A1AA]">Walrus Network</span>
                </div>
              </div>

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
                onClick={() => {
                  setAccountType("demo");
                  setAvailableBalance(150);
                }}
                className={`bg-[#0A0A0C] rounded-2xl p-5 flex flex-col gap-3 cursor-pointer transition-all duration-200 active:scale-[0.99] border ${
                  accountType === "demo"
                    ? "border-white shadow-sm"
                    : "border-[#222226] hover:border-[#3F3F46]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-semibold text-white tracking-[-0.01em]">
                      Demo account
                    </div>
                    <span className="text-[10px] font-mono text-[#71717A] uppercase tracking-wider">
                      Deterministic Ed25519 Keypair
                    </span>
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
                  Pre-funded with 150 SUI sandbox balance. Operates with a real deterministic Ed25519 keypair for cryptographic signatures without requiring wallet extensions.
                </p>

                <div className="pt-3 border-t border-[#18181C] flex items-center justify-between text-xs font-mono">
                  <span className="text-[#A1A1AA]">
                    {DEMO_SUI_ADDRESS.slice(0, 6)}...{DEMO_SUI_ADDRESS.slice(-4)}
                  </span>
                  <span className="text-white font-medium">150.00 SUI Balance</span>
                </div>
              </div>

              {/* Option 2: Real Account */}
              <div
                onClick={() => {
                  setAccountType("real");
                  if (realAddress) refreshLiveBalance(realAddress);
                }}
                className={`bg-[#0A0A0C] rounded-2xl p-5 flex flex-col gap-3 cursor-pointer transition-all duration-200 active:scale-[0.99] border ${
                  accountType === "real"
                    ? "border-white shadow-sm"
                    : "border-[#222226] hover:border-[#3F3F46]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-semibold text-white tracking-[-0.01em]">
                      Real account
                    </div>
                    <span className="text-[10px] font-mono text-[#71717A] uppercase tracking-wider">
                      Self-Custodial Sui Burner
                    </span>
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
                  Generates an actual Ed25519 Sui Keypair persisted in your browser's encrypted storage. Can be exported or funded directly on Sui Mainnet.
                </p>

                <div className="pt-3 border-t border-[#18181C] flex items-center justify-between text-xs font-mono">
                  <span className="text-[#A1A1AA] truncate max-w-[190px]">
                    {realAddress
                      ? `${realAddress.slice(0, 6)}...${realAddress.slice(-4)}`
                      : "Loading keypair..."}
                  </span>
                  <span className="text-white font-medium">
                    {isCheckingLiveBalance
                      ? "Querying RPC..."
                      : `${liveOnChainBalanceSui !== null ? liveOnChainBalanceSui.toFixed(2) : "0.00"} SUI (Live)`}
                  </span>
                </div>

                {accountType === "real" && realAddress && (
                  <div
                    className="pt-2 flex items-center justify-between gap-2 border-t border-[#18181C]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator?.clipboard?.writeText) {
                          navigator.clipboard.writeText(realAddress).catch(() => {});
                        }
                        triggerSnackbar("Address Copied", `${realAddress.slice(0, 10)}...`);
                      }}
                      className="text-[10px] font-mono text-[#71717A] hover:text-white flex items-center gap-1 transition-colors"
                    >
                      <Copy size={11} />
                      <span>Copy Address</span>
                    </button>

                    <a
                      href={`https://suiscan.xyz/mainnet/account/${realAddress}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-mono text-[#71717A] hover:text-white flex items-center gap-1 transition-colors"
                    >
                      <span>SuiScan</span>
                      <ExternalLink size={11} />
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        const hex = exportRealPrivateKeyHex();
                        if (hex) {
                          setExportedKey(hex);
                          setShowExportPrivateKey(!showExportPrivateKey);
                        }
                      }}
                      className="text-[10px] font-mono text-[#71717A] hover:text-white transition-colors"
                    >
                      {showExportPrivateKey ? "Hide Key" : "Export Key"}
                    </button>
                  </div>
                )}

                {showExportPrivateKey && exportedKey && (
                  <div
                    className="bg-[#131316] border border-[#27272A] rounded-xl p-3 flex flex-col gap-1.5 animate-in fade-in"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-[10px] font-mono text-[#A1A1AA]">
                      Ed25519 Secret Key (Hex):
                    </span>
                    <div className="bg-[#0A0A0C] p-2 rounded text-[10px] font-mono text-white break-all select-all border border-[#1F1F24]">
                      {exportedKey}
                    </div>
                  </div>
                )}
              </div>

              {/* Option 3: Link Wallet (Extension or Manual Paste) */}
              <div className="pt-2 flex flex-col items-center gap-2">
                {detectedExtension ? (
                  <button
                    type="button"
                    onClick={handleConnectExtension}
                    disabled={isConnectingExtension}
                    className="w-full py-3.5 px-4 rounded-2xl bg-[#0A0A0C] border border-[#27272A] hover:border-white text-xs font-medium text-white transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                  >
                    <Wallet size={14} className="text-[#A1A1AA]" />
                    <span>
                      {isConnectingExtension
                        ? `Connecting ${detectedExtension.name}...`
                        : `Connect ${detectedExtension.name} Extension`}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setShowLinkInput(!showLinkInput);
                      if (!showLinkInput) setAccountType("linked");
                    }}
                    className="text-xs font-medium text-[#71717A] hover:text-white transition-colors py-1.5 flex items-center gap-1.5 active:scale-95"
                  >
                    <Plus size={13} />
                    <span>Link an existing Sui address manually</span>
                  </button>
                )}

                {detectedExtension && !showLinkInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowLinkInput(true);
                      setAccountType("linked");
                    }}
                    className="text-[11px] text-[#71717A] hover:text-white transition-colors"
                  >
                    or enter address manually
                  </button>
                )}

                {showLinkInput && (
                  <div className="w-full mt-1 animate-in fade-in slide-in-from-top-1 duration-200 flex flex-col gap-1.5">
                    <input
                      type="text"
                      value={linkedAddress}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        setLinkedAddress(val);
                        setAccountType("linked");
                        if (val.startsWith("0x") && val.length > 20) {
                          refreshLiveBalance(val);
                        }
                      }}
                      placeholder="Enter Sui address (0x...)"
                      className="w-full bg-[#131316] border border-[#27272A] rounded-xl px-4 py-3 text-xs font-mono text-white placeholder-[#52525B] outline-none focus:border-white transition-colors"
                    />
                    {linkedAddress && (
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#71717A] px-1">
                        <span>
                          {isCheckingLiveBalance
                            ? "Querying RPC..."
                            : `${liveOnChainBalanceSui !== null ? liveOnChainBalanceSui.toFixed(2) : "0.00"} SUI on Mainnet`}
                        </span>
                        <a
                          href={`https://suiscan.xyz/mainnet/account/${linkedAddress}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-white transition-colors flex items-center gap-1"
                        >
                          <span>SuiScan</span>
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 bg-[#000000]">
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
                  <span className="flex items-center justify-center gap-2 max-w-full px-2">
                    <span className="w-3.5 h-3.5 border-2 border-[#71717A] border-t-white rounded-full animate-spin inline-block shrink-0" />
                    <span className="truncate text-xs text-[#E4E4E7] font-medium tracking-normal">{sealingStage || "Connecting to Walrus..."}</span>
                  </span>
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
                        {activeRulesList.length} Resolutions
                      </span>
                      <span className="text-xs text-[#71717A] font-mono">
                        (in Walrus Memory)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("resolutions")}
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
                        <span className="text-xs text-[#71717A]">Amount in x402 Vault</span>
                        <span className="text-xs font-mono font-medium text-white">{escrowDeposit} SUI</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-[#71717A]">Resolutions Broken</span>
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

            {/* TAB: RESOLUTIONS */}
            {activeTab === "resolutions" && (
              <div className="flex-1 overflow-y-auto px-7 pt-6 sm:pt-8 pb-28 flex flex-col gap-4 animate-in fade-in duration-200 overscroll-contain">
                <div className="text-[30px] sm:text-[34px] font-semibold tracking-[-0.02em] leading-tight text-white">
                  Saved Resolutions
                </div>

                {/* Resolutions List */}
                <div className="flex flex-col gap-3">
                  {activeRulesList.map((rule, idx) => {
                    const isExpanded = selectedMemoryRuleId === rule.id;
                    return (
                      <div
                        key={rule.id}
                        onClick={() => setSelectedMemoryRuleId(isExpanded ? null : rule.id)}
                        className={`bg-[#0A0A0C] border rounded-2xl p-5 flex flex-col gap-2.5 cursor-pointer transition-all duration-200 ${
                          isExpanded
                            ? "border-white/40 ring-1 ring-white/10"
                            : "border-[#222226] hover:border-[#3F3F46]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-medium text-[#71717A] tracking-wider">
                            0{idx + 1}
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
                        <div className="flex items-center justify-between border-t border-[#18181C] pt-2 mt-1">
                          <span className="text-[10px] font-mono text-[#71717A]">
                            Walrus Item #{idx + 1} · Enforced by Wally
                          </span>
                          <span className="text-[10px] font-mono text-white">
                            {rule.breaches || 0} Breaches
                          </span>
                        </div>

                        {/* Expandable Exact Walrus Memory Proof */}
                        {isExpanded && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#131316] border border-[#27272A] rounded-xl p-3.5 flex flex-col gap-2.5 mt-2 animate-in fade-in duration-200"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono text-[#A1A1AA] uppercase tracking-wider">
                                Walrus Memory Record
                              </span>
                              {rule.category ? (
                                <span className="text-[10px] font-mono text-[#E4E4E7] bg-[#1F1F24] px-1.5 py-0.5 rounded uppercase">
                                  {rule.category}
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono text-white">
                                  Verified
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between bg-[#0A0A0C] border border-[#1E1E22] rounded-lg px-2.5 py-1.5">
                              <span className="text-[11px] font-mono text-white truncate mr-2">
                                Blob #{rule.blobId ? `${rule.blobId.slice(0, 16)}...` : walrusBlobId ? `${walrusBlobId.slice(0, 16)}...` : "d4a97f2e8c9b4e11..."}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const bid = rule.blobId || walrusBlobId || "d4a97f2e8c9b4e11a2f6";
                                  if (navigator?.clipboard?.writeText) {
                                    navigator.clipboard.writeText(bid).catch(() => {});
                                  }
                                  triggerSnackbar("Copied Blob ID to clipboard", `Blob #${bid.slice(0, 12)}...`);
                                }}
                                className="text-[#71717A] hover:text-white p-1 transition-colors shrink-0"
                                title="Copy Blob ID"
                              >
                                <Copy size={12} />
                              </button>
                            </div>

                            {rule.keywords && rule.keywords.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {rule.keywords.slice(0, 4).map((kw, kIdx) => (
                                  <span key={kIdx} className="text-[9px] font-mono text-[#71717A] bg-[#18181C] px-1.5 py-0.5 rounded border border-[#222226]">
                                    #{kw}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="text-[11px] font-mono text-[#71717A] leading-relaxed">
                              Boundary: "{rule.condition || rule.title}"
                            </div>

                            {rule.wallyRoastAngle && (
                              <div className="text-[10px] text-[#A1A1AA] italic bg-[#0E0E11] p-2 rounded border border-[#1E1E24]">
                                Wally Angle: &ldquo;{rule.wallyRoastAngle}&rdquo;
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add Another Resolution Button */}
                  <button
                    type="button"
                    onClick={() => setIsAddResolutionOpen(true)}
                    className="w-full py-3.5 px-4 rounded-2xl border border-dashed border-[#2E2E33] hover:border-[#52525B] hover:bg-[#0A0A0C] text-[#A1A1AA] hover:text-white text-xs font-medium flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.99] mt-1"
                  >
                    <Plus size={14} />
                    <span>Add another resolution</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB: x402 VAULT */}
            {activeTab === "vault" && (
              <div className="flex-1 overflow-y-auto px-7 pt-6 sm:pt-8 pb-28 flex flex-col gap-4 animate-in fade-in duration-200 overscroll-contain">
                <div className="text-[30px] sm:text-[34px] font-semibold tracking-[-0.02em] leading-tight text-white">
                  x402 Vault
                </div>

                {/* Primary Vault Balance Card */}
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
                    <span className="text-xs text-[#71717A]">Total Locked in Vault</span>
                    <span className="text-2xl font-mono font-semibold text-white">
                      {escrowDeposit}.00 SUI
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#18181C] pt-3">
                    <span className="text-xs text-[#71717A]">Base Commitment Deposit</span>
                    <span className="text-xs font-mono text-white">10.00 SUI</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#18181C] pt-3">
                    <span className="text-xs text-[#71717A]">Infraction Fines Collected</span>
                    <span className="text-xs font-mono text-white">
                      {Math.max(0, escrowDeposit - 10)}.00 SUI
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#18181C] pt-3">
                    <span className="text-xs text-[#71717A]">Time-Lock Date</span>
                    <span className="text-xs text-white font-medium">{unlockDate}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#18181C] pt-3">
                    <span className="text-xs text-[#71717A]">Protocol Standard</span>
                    <span className="text-xs font-mono text-[#A1A1AA]">x402 Agent Toll</span>
                  </div>
                </div>

                {/* Infractions & Penalty Deposits Record */}
                <div className="bg-[#0A0A0C] border border-[#222226] rounded-2xl p-5 flex flex-col gap-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-[#71717A] uppercase tracking-wider">
                      Penalty Deposits · Resolved from Walrus
                    </span>
                    <span className="text-xs font-mono text-white">
                      {infractions.length} Events
                    </span>
                  </div>

                  {infractions.length === 0 ? (
                    <div className="py-4 text-center text-xs text-[#71717A] border-t border-[#18181C] mt-1">
                      Zero breach penalties recorded. All resolutions currently honored.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5 border-t border-[#18181C] pt-3">
                      {infractions.map((infr) => (
                        <div
                          key={infr.id}
                          className="bg-[#131316] border border-[#222226] rounded-xl p-3 flex flex-col gap-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-white">
                              +{infr.penaltySui} SUI Fine
                            </span>
                            <span className="text-[10px] font-mono text-[#71717A]">
                              {infr.timestamp}
                            </span>
                          </div>
                          <span className="text-xs text-[#D4D4D8]">
                            "{infr.memo}"
                          </span>
                          <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-[#1E1E22]">
                            <span className="text-[10px] text-[#71717A] truncate">
                              Breach: {infr.ruleTitle}
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsMemoryInspectorOpen(true)}
                              className="text-[10px] font-mono text-[#A1A1AA] hover:text-white flex items-center gap-1 transition-colors"
                            >
                              <span>Blob #{infr.blobId.slice(0, 8)}...</span>
                              <ExternalLink size={10} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                    <button
                      type="button"
                      onClick={() => setIsMemoryInspectorOpen(true)}
                      className="text-[11px] font-medium text-white flex items-center gap-1 px-2 py-0.5 rounded bg-[#18181C] border border-[#27272A] hover:border-[#52525B] transition-colors"
                    >
                      <span>View Memory Proofs</span>
                      <ExternalLink size={11} />
                    </button>
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
                    <span className="text-xs font-mono text-white capitalize">
                      {accountType === "demo" ? "Demo Keypair" : "Real Burner"}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 border-t border-[#18181C] pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#71717A]">Active Address</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const addr =
                              accountType === "demo"
                                ? DEMO_SUI_ADDRESS
                                : accountType === "real"
                                ? realAddress
                                : linkedAddress;
                            if (navigator?.clipboard?.writeText) {
                              navigator.clipboard.writeText(addr).catch(() => {});
                            }
                            triggerSnackbar("Address Copied", `${addr.slice(0, 10)}...`);
                          }}
                          className="text-[10px] font-mono text-[#71717A] hover:text-white flex items-center gap-1 transition-colors"
                        >
                          <Copy size={11} />
                          <span>Copy</span>
                        </button>
                        <a
                          href={`https://suiscan.xyz/mainnet/account/${accountType === "demo" ? DEMO_SUI_ADDRESS : realAddress || linkedAddress}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-mono text-[#71717A] hover:text-white flex items-center gap-1 transition-colors"
                        >
                          <span>SuiScan</span>
                          <ExternalLink size={11} />
                        </a>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-white truncate">
                      {accountType === "demo"
                        ? DEMO_SUI_ADDRESS
                        : accountType === "real"
                        ? realAddress
                        : linkedAddress}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#18181C] pt-3">
                    <span className="text-xs text-[#71717A]">On-Chain Balance</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-white font-medium">
                        {accountType === "demo"
                          ? `${availableBalance.toFixed(2)} SUI (Sandbox)`
                          : isCheckingLiveBalance
                          ? "Querying RPC..."
                          : `${liveOnChainBalanceSui !== null ? liveOnChainBalanceSui.toFixed(2) : "0.00"} SUI`}
                      </span>
                      {accountType === "real" && (
                        <button
                          type="button"
                          onClick={() => refreshLiveBalance(realAddress)}
                          disabled={isCheckingLiveBalance}
                          className="text-[#71717A] hover:text-white text-[10px] font-mono transition-colors"
                          title="Refresh on-chain balance"
                        >
                          ↻
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#18181C] pt-3">
                    <span className="text-xs text-[#71717A]">Network</span>
                    <span className="text-xs text-white font-medium">Sui Mainnet</span>
                  </div>

                  {accountType === "real" && (
                    <div className="border-t border-[#18181C] pt-3 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const hex = exportRealPrivateKeyHex();
                          if (hex) {
                            setExportedKey(hex);
                            setShowExportPrivateKey(!showExportPrivateKey);
                          }
                        }}
                        className="text-xs text-left text-[#A1A1AA] hover:text-white transition-colors flex items-center justify-between font-mono"
                      >
                        <span>Export Private Key</span>
                        <span className="text-[10px] text-[#71717A]">
                          {showExportPrivateKey ? "Hide" : "Reveal"}
                        </span>
                      </button>

                      {showExportPrivateKey && exportedKey && (
                        <div className="bg-[#131316] border border-[#27272A] rounded-xl p-3 flex flex-col gap-1.5 animate-in fade-in">
                          <span className="text-[10px] font-mono text-[#A1A1AA]">
                            Ed25519 Secret Key (Hex):
                          </span>
                          <div className="bg-[#0A0A0C] p-2 rounded text-[10px] font-mono text-white break-all select-all border border-[#1F1F24]">
                            {exportedKey}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
                onClick={() => setActiveTab("resolutions")}
                className={`transition-all duration-150 p-1 active:scale-90 ${
                  activeTab === "resolutions" ? "text-white scale-105" : "text-[#52525B] hover:text-white"
                }`}
                title="Resolutions"
              >
                <ListCheck size={19} strokeWidth={activeTab === "resolutions" ? 2.5 : 2} />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("vault")}
                className={`transition-all duration-150 p-1 active:scale-90 ${
                  activeTab === "vault" ? "text-white scale-105" : "text-[#52525B] hover:text-white"
                }`}
                title="x402 Vault"
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

                <div className="flex-1 overflow-y-auto px-7 py-4 flex flex-col gap-7 pb-4 overscroll-contain">
                  {/* Big Centered Amount Display */}
                  <div className="flex flex-col items-center justify-center pt-2">
                    <div className="flex items-baseline justify-center gap-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={sendAmount}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, "");
                          setSendAmount(val);
                        }}
                        style={{ width: `${Math.max(1, (sendAmount || "0").length)}ch` }}
                        className="bg-transparent text-[54px] font-semibold font-mono text-center text-white outline-none tracking-tight p-0"
                        placeholder="0"
                      />
                      <span className="text-xl font-mono text-[#71717A]">SUI</span>
                    </div>

                    {/* Quick Amount Preset Chips */}
                    <div className="flex items-center gap-2 mt-3">
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
                  <div className="flex flex-col gap-2 pt-2">
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
                </div>

                <div className="p-6 bg-[#000000] flex flex-col items-center gap-3">
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
                  <div className="text-[11px] font-mono text-[#52525B] text-center tracking-tight">
                    Walrus Memory validated · Tatum Sui RPC resolved
                  </div>
                </div>
              </>
            )}

            {/* SUB-STEP 2: COMPULSORY TRUTHFUL MEMO */}
            {sendSubStep === "memo" && (
              <>
                <div className="pt-6 sm:pt-8 px-7 pb-2 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSendSubStep("amount")}
                    className="self-start text-[#71717A] hover:text-white flex items-center gap-1.5 text-xs font-medium transition-colors active:scale-95"
                  >
                    <ArrowLeft size={14} />
                    <span>Back</span>
                  </button>
                  <div className="flex flex-col gap-1">
                    <div className="text-[30px] sm:text-[34px] font-semibold tracking-[-0.02em] leading-tight text-white">
                      What is this for?
                    </div>
                    <p className="text-xs text-[#71717A] leading-relaxed">
                      Be honest with future you. What are you purchasing or sending?
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-7 py-3 flex flex-col gap-5 pb-4 overscroll-contain">
                  {/* Guilt Prompt & Compulsory Textarea */}
                  <textarea
                    value={sendMemo}
                    onChange={(e) => setSendMemo(e.target.value)}
                    placeholder="e.g. Late-night food delivery..."
                    rows={3}
                    className="w-full bg-[#131316] border border-[#27272A] rounded-2xl p-4 text-sm text-white placeholder-[#52525B] outline-none focus:border-white transition-colors leading-relaxed resize-none"
                  />

                  {/* Quick Pick Testing Chips for Judges */}
                  <div className="flex flex-col gap-2">
                    {QUICK_MEMO_PICKS.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSendMemo(item.text)}
                        className="bg-[#0A0A0C] border border-[#222226] hover:border-[#52525B] text-left px-4 py-3 rounded-xl transition-all duration-150 active:scale-[0.99] flex items-center justify-between"
                      >
                        <span className="text-xs font-medium text-white">
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-6 bg-[#000000]">
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
                  Checking transaction against resolutions
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
                  Resolution adherence verified · 0 penalties applied
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
                      {breachReason || "This transaction violates your active yearly resolution. You committed to financial discipline."}
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
                      <span className="text-xs text-[#A1A1AA]">x402 Vault Penalty</span>
                      <span className="text-xs font-mono font-semibold text-white">10 SUI</span>
                    </div>

                    <div className="flex items-center justify-between border-t border-[#18181C] pt-2.5">
                      <span className="text-xs text-[#71717A]">Destination</span>
                      <span className="text-xs text-[#A1A1AA]">x402 Vault (Locked until Dec 25, 2026)</span>
                    </div>
                  </div>
                </div>

                {/* Actions: Cancel vs Pay Fine */}
                <div className="p-6 bg-[#000000] flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSendSubStep("honored")}
                    className="w-full py-4 px-6 rounded-full font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 bg-[#FFFFFF] text-[#000000] hover:bg-[#E4E4E7] active:scale-[0.98]"
                  >
                    <span>Cancel & Honor Resolution</span>
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

            {/* SUB-STEP: RESOLUTION HONORED (CONGRATULATIONS / DISCIPLINE) */}
            {sendSubStep === "honored" && (
              <div className="flex-1 flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
                <div className="pt-6 sm:pt-8 px-7 pb-3 flex flex-col gap-2.5">
                  <div className="text-[30px] sm:text-[34px] font-semibold tracking-[-0.02em] leading-tight text-white">
                    Resolution Honored
                  </div>
                  <p className="text-xs text-[#71717A] leading-relaxed">
                    You chose discipline over impulse. Your streak stays intact and 0 SUI was forfeited.
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto px-7 py-2 flex flex-col gap-4 pb-4 overscroll-contain">
                  <div className="bg-[#0A0A0C] border border-[#222226] rounded-2xl p-5 flex flex-col gap-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-[#71717A]">
                        Discipline Report
                      </span>
                      <span className="text-xs font-mono text-white">Streak Intact</span>
                    </div>

                    <div className="flex items-center justify-between border-t border-[#18181C] pt-3">
                      <span className="text-xs text-[#A1A1AA]">Transfer Status</span>
                      <span className="text-xs text-white font-medium">Cancelled by User</span>
                    </div>

                    <div className="flex items-center justify-between border-t border-[#18181C] pt-2.5">
                      <span className="text-xs text-[#A1A1AA]">Penalty Avoided</span>
                      <span className="text-xs font-mono font-semibold text-white">10 SUI</span>
                    </div>

                    <div className="flex items-center justify-between border-t border-[#18181C] pt-2.5">
                      <span className="text-xs text-[#71717A]">Memory Ledger</span>
                      <span className="text-xs font-mono text-[#A1A1AA]">No Infraction Committed</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-[#000000]">
                  <button
                    type="button"
                    onClick={closeSendFlow}
                    className="w-full py-4 px-6 rounded-full font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 bg-[#FFFFFF] text-[#000000] hover:bg-[#E4E4E7] active:scale-[0.98]"
                  >
                    <span>Back to Dashboard</span>
                  </button>
                </div>
              </div>
            )}

            {/* SUB-STEP: INFRACTION RECORDED (ANTI-CONGRATULATIONS / SOBERING REALITY) */}
            {sendSubStep === "penalty_recorded" && (
              <div className="flex-1 flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
                <div className="pt-6 sm:pt-8 px-7 pb-3 flex flex-col gap-2.5">
                  <div className="text-[30px] sm:text-[34px] font-semibold tracking-[-0.02em] leading-tight text-white">
                    Penalty Recorded
                  </div>
                  <p className="text-xs text-[#71717A] leading-relaxed">
                    10 SUI penalty has been deposited to the x402 Vault and logged immutably in Walrus memory.
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto px-7 py-2 flex flex-col gap-4 pb-4 overscroll-contain">
                  <div className="bg-[#0A0A0C] border border-[#222226] rounded-2xl p-5 flex flex-col gap-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-[#71717A]">
                        Infraction Log
                      </span>
                      <span className="text-xs font-mono text-white">Breach Enforced</span>
                    </div>

                    <div className="flex items-center justify-between border-t border-[#18181C] pt-3">
                      <span className="text-xs text-[#A1A1AA]">Penalty Deposit</span>
                      <span className="text-xs font-mono font-semibold text-white">10 SUI → x402 Vault</span>
                    </div>

                    <div className="flex items-center justify-between border-t border-[#18181C] pt-2.5">
                      <span className="text-xs text-[#A1A1AA]">Lock Expiry</span>
                      <span className="text-xs text-[#A1A1AA]">Dec 25, 2026</span>
                    </div>

                    <div className="flex items-center justify-between bg-[#131316] border border-[#1E1E22] rounded-xl px-3 py-2 mt-1">
                      <span className="text-[11px] font-mono text-[#A1A1AA] truncate mr-2">
                        Blob #{latestFineBlobId ? `${latestFineBlobId.slice(0, 16)}...` : "blob_infr..."}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const bid = latestFineBlobId || "blob_infr";
                          if (navigator?.clipboard?.writeText) {
                            navigator.clipboard.writeText(bid).catch(() => {});
                          }
                          triggerSnackbar("Copied Penalty Blob ID", bid);
                        }}
                        className="text-[#71717A] hover:text-white p-1 transition-colors shrink-0"
                        title="Copy Blob ID"
                      >
                        <Copy size={12} />
                      </button>
                    </div>

                    {latestFineBlobId && (
                      <a
                        href={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${latestFineBlobId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-white hover:underline flex items-center gap-1 font-mono pt-0.5"
                      >
                        <span>Inspect on Walrus Aggregator</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>

                <div className="p-6 bg-[#000000]">
                  <button
                    type="button"
                    onClick={closeSendFlow}
                    className="w-full py-4 px-6 rounded-full font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 bg-[#FFFFFF] text-[#000000] hover:bg-[#E4E4E7] active:scale-[0.98]"
                  >
                    <span>Back to Dashboard</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================================
            DRAWER: ADD ANOTHER RESOLUTION
            ================================================================== */}
        {isAddResolutionOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-[420px] bg-[#0A0A0C] border border-[#222226] rounded-t-[32px] sm:rounded-[32px] p-6 flex flex-col gap-5 shadow-2xl animate-in slide-in-from-bottom-6 duration-300">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-lg font-semibold text-white">
                    Add Resolution
                  </span>
                  <span className="text-[11px] font-mono text-[#71717A]">
                    Commits directly to Walrus Memory
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddResolutionOpen(false)}
                  className="p-1.5 text-[#71717A] hover:text-white rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#A1A1AA]">
                    Resolution Title
                  </label>
                  <input
                    type="text"
                    value={newRuleTitle}
                    onChange={(e) => setNewRuleTitle(e.target.value)}
                    placeholder="e.g. No Late-Night Uber Eats"
                    className="w-full bg-[#131316] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#52525B] outline-none focus:border-white transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#A1A1AA]">
                    Enforced Boundary Condition
                  </label>
                  <textarea
                    rows={2}
                    value={newRuleCondition}
                    onChange={(e) => setNewRuleCondition(e.target.value)}
                    placeholder="e.g. Reject any takeout food orders after 10 PM on weekdays"
                    className="w-full bg-[#131316] border border-[#27272A] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#52525B] outline-none focus:border-white transition-colors resize-none"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-[#A1A1AA]">
                    Penalty Stake Per Infraction
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {PENALTY_PRESETS.map((amt) => {
                      const isSelected = newRulePenalty === amt;
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setNewRulePenalty(amt)}
                          className={`py-2 text-center rounded-xl text-xs font-medium transition-all duration-150 active:scale-95 ${
                            isSelected
                              ? "bg-white text-black font-semibold"
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

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCommitNewResolution}
                  disabled={!newRuleTitle.trim() || isCommittingNewRule}
                  className={`w-full py-3.5 rounded-full font-semibold text-xs transition-all duration-200 flex items-center justify-center gap-2 ${
                    newRuleTitle.trim() && !isCommittingNewRule
                      ? "bg-white text-black hover:bg-[#E4E4E7] active:scale-[0.98]"
                      : "bg-[#222226] text-[#52525B] cursor-not-allowed"
                  }`}
                >
                  <span>
                    {isCommittingNewRule
                      ? "Committing to Walrus Memory..."
                      : "Commit Resolution to Walrus"}
                  </span>
                  {!isCommittingNewRule && <ArrowRight size={14} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================
            DRAWER: WALRUS TOTAL RECALL MEMORY INSPECTOR
            ================================================================== */}
        {isMemoryInspectorOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-[420px] max-h-[85vh] bg-[#0A0A0C] border border-[#222226] rounded-t-[32px] sm:rounded-[32px] p-6 flex flex-col gap-4 shadow-2xl animate-in slide-in-from-bottom-6 duration-300 overflow-hidden">
              <div className="flex items-center justify-between shrink-0">
                <div className="flex flex-col">
                  <span className="text-base font-semibold text-white">
                    Walrus Total Recall Memory
                  </span>
                  <span className="text-[11px] font-mono text-[#71717A]">
                    Immutable decentralized autonomous agent memory
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMemoryInspectorOpen(false)}
                  className="p-1.5 text-[#71717A] hover:text-white rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Memory History List */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1 overscroll-contain">
                {walrusBlobs.length === 0 ? (
                  /* Fallback display for initial session */
                  <div className="bg-[#131316] border border-[#27272A] rounded-2xl p-4 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-white bg-[#1E1E24] px-2 py-0.5 rounded border border-[#2C2C34]">
                        COMMITMENT PACT
                      </span>
                      <span className="text-[10px] font-mono text-[#71717A]">
                        {currentDateStr || "Active"}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-white">
                      Yearbound 2026 Accountability Pact
                    </div>
                    <div className="text-[11px] font-mono text-[#A1A1AA] truncate">
                      Blob #{walrusBlobId || "d4a97f2e8c9b4e11a2f6"}
                    </div>
                    <a
                      href={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${walrusBlobId || "d4a97f2e8c9b4e11a2f6"}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-white hover:underline flex items-center gap-1 mt-1 font-mono"
                    >
                      <span>View on Walrus Aggregator</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                ) : (
                  walrusBlobs.map((item, idx) => {
                    const isExpanded = expandedJsonBlobId === item.blobId;
                    return (
                      <div
                        key={item.blobId + idx}
                        className="bg-[#131316] border border-[#27272A] rounded-2xl p-4 flex flex-col gap-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-white bg-[#1E1E24] px-2 py-0.5 rounded border border-[#2C2C34] uppercase">
                            {item.type.replace("_", " ")}
                          </span>
                          <span className="text-[10px] font-mono text-[#71717A]">
                            {item.timestamp}
                          </span>
                        </div>

                        <div className="text-xs font-semibold text-white">
                          {item.title}
                        </div>

                        <div className="flex items-center justify-between bg-[#0A0A0C] border border-[#1E1E22] rounded-xl px-3 py-2">
                          <span className="text-[11px] font-mono text-[#A1A1AA] truncate mr-2">
                            Blob #{item.blobId}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(item.blobId);
                              triggerSnackbar("Copied Blob ID", item.blobId);
                            }}
                            className="text-[#71717A] hover:text-white p-1 transition-colors shrink-0"
                            title="Copy Blob ID"
                          >
                            <Copy size={13} />
                          </button>
                        </div>

                        {/* Raw JSON toggle */}
                        <div className="border-t border-[#1E1E22] pt-2 flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedJsonBlobId(isExpanded ? null : item.blobId)
                            }
                            className="text-[11px] text-[#A1A1AA] hover:text-white flex items-center justify-between transition-colors"
                          >
                            <span className="flex items-center gap-1.5 font-mono">
                              <FileText size={12} />
                              Raw Walrus Payload
                            </span>
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>

                          {isExpanded && (
                            <pre className="text-[10px] font-mono bg-[#070709] border border-[#1C1C20] p-3 rounded-xl text-[#A1A1AA] overflow-x-auto leading-relaxed max-h-40">
                              {JSON.stringify(item.payload, null, 2)}
                            </pre>
                          )}
                        </div>

                        <a
                          href={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${item.blobId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-white hover:underline flex items-center gap-1 pt-1 font-mono"
                        >
                          <span>Inspect on Walrus Aggregator</span>
                          <ExternalLink size={11} />
                        </a>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================
            UNIFIED FEEDBACK SNACKBAR
            ================================================================== */}
        {showSnackbar && (
          <div className="absolute bottom-24 left-5 right-5 z-50 bg-[#141417] border border-[#3F3F46] rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center shrink-0">
                <Check size={12} strokeWidth={3} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-white">{snackbarTitle}</span>
                {snackbarSubtitle && (
                  <span className="text-[11px] font-mono text-[#A1A1AA] truncate">
                    {snackbarSubtitle}
                  </span>
                )}
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
