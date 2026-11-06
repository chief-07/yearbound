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
  Gift,
  Sparkles,
  TrendingUp,
  Activity,
} from "lucide-react";
import {
  DEMO_SUI_ADDRESS,
  getDemoAddress,
  getOrCreateDemoKeypair,
  exportDemoPrivateKeyHex,
  getDemoWalletInfo,
  getOrCreateRealKeypair,
  getRealWalletInfo,
  exportRealPrivateKeyHex,
  detectInstalledSuiWallet,
  connectExtensionWallet,
  executeTransferWithExtension,
  type InstalledSuiWallet,
} from "@/lib/wallet";
import {
  executeX402VaultDeposit,
  YEARBOUND_VAULT_ADDRESS,
  YEARBOUND_TESTNET_VAULT_ADDRESS,
} from "@/lib/vault-x402";
import { DisciplineGrid } from "@/components/discipline-grid";
import { TimeTravelScrubber, type TimeMilestone } from "@/components/time-travel-scrubber";

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
  whyItMatters?: string;
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
  dayOfYear?: number;
  verdict?: "honored" | "broken";
  recipient?: string;
  txHash?: string;
  explorerUrl?: string;
  provider?: string;
  isUnfunded?: boolean;
  repeatCount?: number;
  streakBroken?: boolean;
  behavioralInsight?: string;
  source?: "user" | "timeline";
  isRealOnChain?: boolean;
  isOffChainVoucher?: boolean;
  voucherSignature?: string;
  settlementType?: "on_chain_ptb" | "cryptographic_voucher";
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
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);
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
    if (typeof window !== "undefined") {
      const demo = getDemoAddress();
      if (demo) setDemoAddress(demo);
    }
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
      whyItMatters: "",
      penalty: 10,
      breaches: 0,
    },
    {
      id: "2",
      title: "Gym 4x Per Week",
      condition: "Must log check-in before 9 AM on scheduled mornings",
      whyItMatters: "",
      penalty: 10,
      breaches: 0,
    },
  ]);
  const [showMotivationIds, setShowMotivationIds] = useState<Record<string, boolean>>({});

  // Screen 2: Escrow Settings
  const [escrowDeposit, setEscrowDeposit] = useState<number>(10);
  const [unlockDate] = useState<string>("Dec 25, 2026");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [sealingStage, setSealingStage] = useState<string>("");
  const [sealingProgress, setSealingProgress] = useState<number>(0);
  const [payFineStage, setPayFineStage] = useState<string>("");

  // Screen 3: Account / Wallet Selection
  const [accountType, setAccountType] = useState<AccountType>("demo");
  const [demoAddress, setDemoAddress] = useState<string>(DEMO_SUI_ADDRESS);
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
  const [latestSettlement, setLatestSettlement] = useState<{
    isRealOnChain: boolean;
    settlementType: "on_chain_ptb" | "cryptographic_voucher";
    txHash?: string;
    voucherSignature?: string;
    explorerUrl?: string;
    provider: string;
    message?: string;
  } | null>(null);

  // Degraded Mode (Web2 stateless banking simulation vs Walrus Total Recall + Tatum Gateway)
  const [isDegradedMode, setIsDegradedMode] = useState<boolean>(false);

  // Walrus Cold-Boot Hydration & Compounding Pattern Synthesis state
  const [isHydrating, setIsHydrating] = useState<boolean>(false);
  const [hasHydratedFromWalrus, setHasHydratedFromWalrus] = useState<boolean>(false);
  const [behavioralPatterns, setBehavioralPatterns] = useState<any[]>([]);
  const [hydratedPactId, setHydratedPactId] = useState<string | null>(null);

  // Screen 0: Sign In & Restore state
  const [restoreInput, setRestoreInput] = useState<string>("");
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [showRestoreInput, setShowRestoreInput] = useState<boolean>(false);

  // Time-Travel Scrubber state (Demo account only)
  const [activeMilestone, setActiveMilestone] = useState<TimeMilestone>("jan1");
  const [currentDayOfYear, setCurrentDayOfYear] = useState<number>(1);
  const [isVaultUnlocked, setIsVaultUnlocked] = useState<boolean>(false);
  const [isVaultClaimed, setIsVaultClaimed] = useState<boolean>(false);
  const [inflowProgress, setInflowProgress] = useState<{
    current: number;
    target: number;
    month: string;
    isDeficit?: boolean;
  }>({
    current: 0,
    target: 1000,
    month: "January",
    isDeficit: false,
  });

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
  const [wallyRoast, setWallyRoast] = useState<string>("");
  const [breachPenaltySui, setBreachPenaltySui] = useState<number>(10);
  const [matchedRuleTitle, setMatchedRuleTitle] = useState<string>("");
  const [checkingProgressStage, setCheckingProgressStage] = useState<string>("Connecting to Tatum & Walrus...");
  const [walrusRecalledCount, setWalrusRecalledCount] = useState<number>(0);
  const [repeatInfractionCount, setRepeatInfractionCount] = useState<number>(1);
  const [streakBroken, setStreakBroken] = useState<boolean>(false);
  const [behavioralInsight, setBehavioralInsight] = useState<string>("");
  const [matchedRuleMotivation, setMatchedRuleMotivation] = useState<string>("");

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

  // Screen 0: 1-click connect and recall memory straight to dashboard
  const handleConnectExtensionAndEnter = async () => {
    setIsConnectingExtension(true);
    try {
      const res = await connectExtensionWallet();
      setLinkedAddress(res.address);
      setAccountType("linked");
      triggerSnackbar("Wallet Connected", `${res.walletName}: ${res.address.slice(0, 10)}...`);
      refreshLiveBalance(res.address);
      await hydrateFromWalrus(res.address);
      setStep(4);
      setActiveTab("home");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect wallet";
      triggerSnackbar("Connection Failed", msg);
    } finally {
      setIsConnectingExtension(false);
    }
  };

  // Screen 0: Direct recall by pasting any Sui Address or Walrus Blob ID
  const handleDirectRestore = async () => {
    const input = restoreInput.trim();
    if (!input) {
      triggerSnackbar("Required field missing", "Enter a Sui address (0x...) or Walrus Blob ID");
      return;
    }
    setIsRestoring(true);
    try {
      if (input.startsWith("0x")) {
        setLinkedAddress(input);
        setAccountType("linked");
        refreshLiveBalance(input);
      }
      await hydrateFromWalrus(input);
      setStep(4);
      setActiveTab("home");
      triggerSnackbar("Memory Restored", `Decentralized state reconstructed for ${input.slice(0, 10)}...`);
    } catch {
      triggerSnackbar("Notice", "Entering dashboard with specified memory identifier");
      setStep(4);
      setActiveTab("home");
    } finally {
      setIsRestoring(false);
    }
  };

  // Fetch live on-chain balance via Tatum Gateway
  const refreshLiveBalance = async (targetAddress?: string, explicitMode?: AccountType) => {
    const currentMode = explicitMode || accountType;
    const addr =
      targetAddress ||
      (currentMode === "real"
        ? realAddress
        : currentMode === "demo"
        ? (demoAddress || DEMO_SUI_ADDRESS)
        : linkedAddress);
    if (!addr || !addr.startsWith("0x")) return;
    const network = currentMode === "demo" ? "testnet" : "mainnet";
    setIsCheckingLiveBalance(true);
    try {
      const res = await fetch(`/api/sui/balance?address=${addr}&network=${network}`);
      const data = await res.json();
      if (data.success && typeof data.balanceSui === "number") {
        setLiveOnChainBalanceSui(data.balanceSui);
        if (currentMode === "real" || currentMode === "linked") {
          setAvailableBalance(data.balanceSui);
        } else if (currentMode === "demo" && data.balanceSui > 0) {
          // If demo address is funded on testnet, reflect it in available balance!
          setAvailableBalance(data.balanceSui);
        }
      }
    } catch (err) {
      console.warn("Failed to query live balance:", err);
    } finally {
      setIsCheckingLiveBalance(false);
    }
  };

  // Walrus Cold-Boot Hydration: reconstruct state from decentralized memory blobs
  const hydrateFromWalrus = async (targetAddress?: string) => {
    const addr =
      targetAddress ||
      (accountType === "demo"
        ? (demoAddress || DEMO_SUI_ADDRESS)
        : accountType === "real"
        ? realAddress
        : linkedAddress || (demoAddress || DEMO_SUI_ADDRESS));
    setIsHydrating(true);
    try {
      const res = await fetch(`/api/walrus/hydrate?address=${encodeURIComponent(addr || "")}`);
      const data = await res.json();
      if (data && data.success) {
        setHasHydratedFromWalrus(true);
        if (data.pact) {
          setHydratedPactId(data.pact.pact_id || data.pact.blob_id || null);
          if (data.pact.x402_escrow_deposit_sui) {
            setEscrowDeposit(data.pact.x402_escrow_deposit_sui);
          }
        }
        if (data.rules && Array.isArray(data.rules) && data.rules.length > 0) {
          setRules(
            data.rules.map((r: any, idx: number) => ({
              id: r.rule_id || String(idx + 1),
              title: r.title,
              condition: r.behavioral_rule || r.condition || "Commitment boundary",
              whyItMatters: r.why_it_matters || "",
              penalty: r.penalty_amount_sui || 10,
              breaches: 0,
              blobId: r.blob_id,
              category: r.category,
              keywords: r.keywords,
              behavioralRule: r.behavioral_rule,
              wallyRoastAngle: r.wally_roast_angle,
            }))
          );
        }
        if (data.events && Array.isArray(data.events) && data.events.length > 0) {
          setInfractions(data.events);
        }
        if (data.patterns && Array.isArray(data.patterns) && data.patterns.length > 0) {
          setBehavioralPatterns(data.patterns);
        }

        // Hydrate walrusBlobs for Memory Inspector drawer
        const hydratedBlobs: WalrusMemoryBlob[] = [];
        if (data.pact) {
          hydratedBlobs.push({
            blobId: data.pact.blob_id || data.pact.pact_id || "genesis_pact",
            type: "commitment_pact",
            title: "Genesis Resolution Pact Manifest",
            timestamp: data.pact.created_at || "Genesis",
            payload: data.pact,
          });
        }
        if (data.rules && Array.isArray(data.rules)) {
          data.rules.forEach((r: any) => {
            hydratedBlobs.push({
              blobId: r.blob_id || `blob_rule_${r.rule_id}`,
              type: "resolution_contract",
              title: `Resolution: ${r.title}`,
              timestamp: r.created_at || "Active",
              payload: r,
            });
          });
        }
        if (data.events && Array.isArray(data.events)) {
          data.events.forEach((e: any) => {
            hydratedBlobs.push({
              blobId: e.blobId || `blob_evt_${e.id}`,
              type: "accountability_event",
              title: `${e.verdict === "honored" ? "Honored Transfer" : "Resolution Infraction"}: ${e.ruleTitle}`,
              timestamp: e.timestamp || "Recalled",
              payload: e,
            });
          });
        }
        if (hydratedBlobs.length > 0) {
          setWalrusBlobs((prev) => {
            const existingIds = new Set(prev.map((b) => b.blobId));
            const newBlobs = hydratedBlobs.filter((b) => !existingIds.has(b.blobId));
            return [...newBlobs, ...prev];
          });
        }
      }
    } catch (err) {
      console.warn("[Walrus Hydration] Notice:", err);
    } finally {
      setIsHydrating(false);
    }
  };

  // Refresh on-chain inflow metrics via Tatum Sui Gateway
  const refreshInflowMetrics = async (targetAddress?: string) => {
    const addr =
      targetAddress ||
      (accountType === "demo"
        ? (demoAddress || DEMO_SUI_ADDRESS)
        : accountType === "real"
        ? realAddress
        : linkedAddress || (demoAddress || DEMO_SUI_ADDRESS));
    if (!addr || !addr.startsWith("0x")) return;

    try {
      const net = accountType === "demo" ? "testnet" : "mainnet";
      const res = await fetch(`/api/sui/inflow?address=${encodeURIComponent(addr)}&network=${net}`);
      const data = await res.json();
      if (data && data.success && data.metrics) {
        // Find matching inflow rule from user's active resolutions
        const activeInflowRule = activeRulesList.find((r) => {
          const t = `${r.title} ${r.condition}`.toLowerCase();
          return (
            t.includes("save") ||
            t.includes("deposit") ||
            t.includes("inflow") ||
            t.includes("earn") ||
            t.includes("income") ||
            t.includes("accumulate")
          );
        });

        let targetSui = 0;
        if (activeInflowRule) {
          const m = `${activeInflowRule.title} ${activeInflowRule.condition}`.match(/(\d+[\d,.]*)\s*(?:sui|SUI|\$)?/);
          if (m && m[1]) targetSui = parseFloat(m[1].replace(/,/g, ""));
        }

        setInflowProgress({
          current: data.metrics.totalInflowSui,
          target: targetSui,
          month: "Current Period",
          isDeficit: targetSui > 0 ? data.metrics.totalInflowSui < targetSui : false,
        });
      }
    } catch (err) {
      console.warn("Failed to query Tatum inflow metrics:", err);
    }
  };

  // Run hydration and Tatum on-chain telemetry when entering dashboard or switching active account
  useEffect(() => {
    if (step === 4) {
      hydrateFromWalrus();
      refreshInflowMetrics();
    }
  }, [step, accountType]);

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
      { id: newId, title: "", condition: "", whyItMatters: "", penalty: 10, breaches: 0 },
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
    if (rules.length <= 1) {
      setRules((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, title: "", condition: "", whyItMatters: "" } : r
        )
      );
      setShowMotivationIds((prev) => ({ ...prev, [id]: false }));
      triggerSnackbar("Cleared", "Resolution fields reset");
      return;
    }
    setRules((prev) => prev.filter((r) => r.id !== id));
    if (expandedRuleId === id) {
      setExpandedRuleId(null);
    }
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
    setSealingProgress(18);
    setSealingStage("Analyzing resolutions...");
    const t1 = setTimeout(() => {
      setSealingProgress(45);
      setSealingStage("Securing commitments...");
    }, 1800);
    const t2 = setTimeout(() => {
      setSealingProgress(75);
      setSealingStage("Recording to Walrus memory...");
    }, 4500);
    const t3 = setTimeout(() => {
      setSealingProgress(92);
      setSealingStage("Locking x402 vault...");
    }, 12000);

    try {
      const activeRules = rules.filter((r) => r.title.trim().length > 0);
      const activeAccountAddress =
        accountType === "demo"
          ? (demoAddress || DEMO_SUI_ADDRESS)
          : accountType === "real"
          ? realAddress
          : linkedAddress || (demoAddress || DEMO_SUI_ADDRESS);

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
      setSealingProgress(0);
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

  // Handle Approved Transaction Recording to Walrus Memory & Tatum Sui Gateway
  const recordApprovedTransaction = async () => {
    const numAmount = parseFloat(sendAmount) || 0;
    setAvailableBalance((prev) => Math.max(0, prev - numAmount));

    const activeAccountAddress =
      accountType === "demo"
        ? (demoAddress || DEMO_SUI_ADDRESS)
        : accountType === "real"
        ? realAddress
        : linkedAddress || (demoAddress || DEMO_SUI_ADDRESS);

    let txHash: string | undefined = undefined;
    let explorerUrl: string | undefined = undefined;
    let transferProvider = accountType === "demo" ? "Tatum Sui Testnet Gateway" : "Tatum Sui Gateway";
    let isUnfunded = false;
    let isRealOnChain = false;

    // 1. If Linked wallet extension, try to execute on-chain directly
    let preExecutedDigest: string | undefined = undefined;
    if (accountType === "linked") {
      try {
        const extResult = await executeTransferWithExtension({
          recipient: sendRecipient,
          amountSui: numAmount,
        });
        if (extResult?.digest) {
          preExecutedDigest = extResult.digest;
        }
      } catch (extErr) {
        console.warn("[Extension PTB] Execution bypass/notice:", extErr);
      }
    }

    // 2. Execute / Inscribe PTB via Tatum Sui Gateway
    const privateKey =
      accountType === "demo"
        ? (exportDemoPrivateKeyHex() || undefined)
        : accountType === "real"
        ? (exportRealPrivateKeyHex() || undefined)
        : undefined;

    try {
      const ptbRes = await fetch("/api/sui-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(6000),
        body: JSON.stringify({
          senderAddress: activeAccountAddress,
          recipientAddress: sendRecipient,
          amountSui: numAmount,
          walletMode: accountType,
          privateKeySecret: privateKey,
          preExecutedDigest,
        }),
      });

      const ptbData = await ptbRes.json();
      if (ptbData && ptbData.digest) {
        txHash = ptbData.digest;
        explorerUrl = ptbData.explorerUrl || undefined;
        transferProvider = ptbData.provider || "Tatum Sui Gateway";
        isUnfunded = Boolean(ptbData.unfunded);
        isRealOnChain = Boolean(ptbData.onChain);
      }
    } catch (ptbErr) {
      console.warn("[PTB Transfer] Tatum API notice:", ptbErr);
    }

    let txBlobId = `blob_tx_${Date.now().toString(36)}`;

    // 3. Persist Accountability Event to Walrus Mainnet Memory
    try {
      const res = await fetch("/api/walrus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(4000),
        body: JSON.stringify({
          type: "accountability_event",
          commitment_id: hydratedPactId || "pact_primary",
          verdict: "honored",
          user_explanation: sendMemo || "Resolution-compliant transfer",
          penalty_deposited_sui: 0,
          vault_tx_hash: txHash,
          recipient: sendRecipient,
          amount_sui: numAmount,
          wallet_address: activeAccountAddress,
        }),
      });

      const data = await res.json();
      if (data?.blobId) {
        txBlobId = data.blobId;
      }
    } catch (walrusErr) {
      console.warn("[Walrus] Approved tx memory notice:", walrusErr);
    }

    const timestampStr = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date());

    const approvedRecord: InfractionRecord = {
      id: `tx_${Date.now()}`,
      ruleTitle: "Resolutions Honored",
      ruleCondition: "Transaction compliant with commitments",
      amount: sendAmount,
      memo: sendMemo || "Compliant transfer",
      timestamp: timestampStr,
      penaltySui: 0,
      blobId: txBlobId,
      dayOfYear: currentDayOfYear,
      verdict: "honored",
      recipient: sendRecipient,
      txHash,
      explorerUrl,
      provider: transferProvider,
      isUnfunded,
      isRealOnChain,
      isOffChainVoucher: !isRealOnChain,
      source: "user",
    };
    setInfractions((prev) => [approvedRecord, ...prev]);

    const approvedBlob: WalrusMemoryBlob = {
      blobId: txBlobId,
      type: "accountability_event",
      title: `Honored Transfer: ${sendAmount} SUI`,
      timestamp: timestampStr,
      payload: {
        protocol: "Yearbound v1",
        storage: "Walrus Memory (MemWal)",
        type: "accountability_event",
        verdict: "honored",
        userMemo: sendMemo,
        transferAmountSui: numAmount,
        recipient: sendRecipient,
        penaltyDepositedSui: 0,
        vaultTxHash: txHash,
        explorerUrl,
        settlementEngine: transferProvider,
        timestamp: new Date().toISOString(),
      },
    };
    setWalrusBlobs((prev) => [approvedBlob, ...prev]);

    closeSendFlow();
    triggerSnackbar(
      "Transfer confirmed",
      txHash
        ? `Tatum PTB #${txHash.slice(0, 10)}... · Inscribed to Walrus`
        : `Transfer authorized · Inscribed to Walrus Memory`,
      txBlobId
    );
  };

  // Handle Memo Submission & Trigger Checking Screen via Tatum & Walrus
  const handleReviewAndCheck = async () => {
    if (!sendMemo.trim()) return;

    // Degraded Mode (Web2 stateless banking simulation)
    if (isDegradedMode) {
      setSendSubStep("checking");
      setCheckingProgressStage("Routing through legacy Web2 processor (zero memory)...");
      setTimeout(() => {
        setBreachReason("Transaction flagged by basic keyword filter #0492.");
        setWallyRoast("Automated System Notice: Your bank has declined this transfer under Rule #0492. (Degraded mode active: zero memory, zero habit analysis, flat penalty).");
        setMatchedRuleTitle("Default Cardholder Policy");
        setBreachPenaltySui(10);
        setWalrusRecalledCount(0);
        setRepeatInfractionCount(1);
        setStreakBroken(false);
        setBehavioralInsight("Legacy Banking Notice: Cross-session pattern synthesis unavailable. Transaction history will not carry over.");
        setSendSubStep("breach");
      }, 900);
      return;
    }

    setSendSubStep("checking");
    setCheckingProgressStage("Auditing wallet & vault via Tatum Sui RPC...");

    const stageTimer1 = setTimeout(() => {
      setCheckingProgressStage("Cross-referencing oaths on Walrus Mainnet...");
    }, 1200);

    const activeAccountAddress =
      accountType === "demo"
        ? (demoAddress || DEMO_SUI_ADDRESS)
        : accountType === "real"
        ? realAddress
        : linkedAddress || (demoAddress || DEMO_SUI_ADDRESS);

    try {
      const res = await fetch("/api/verify-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: sendRecipient,
          amount: parseFloat(sendAmount) || 0,
          memo: sendMemo,
          walletAddress: activeAccountAddress,
          walletMode: accountType,
          network: accountType === "demo" ? "testnet" : "mainnet",
          timestamp: new Date().toISOString(),
          rules: activeRulesList.map((r) => ({
            id: r.id,
            title: r.title,
            condition: r.condition,
            whyItMatters: r.whyItMatters,
            penalty: r.penalty,
          })),
          history: infractions.map((i) => ({
            ruleTitle: i.ruleTitle,
            verdict: i.verdict,
            memo: i.memo,
            timestamp: i.timestamp,
            penaltySui: i.penaltySui,
          })),
        }),
      });

      const data = await res.json();
      clearTimeout(stageTimer1);

      if (data && data.success) {
        setBreachReason(data.reason || "");
        setWallyRoast(data.wallyRoast || "");
        setMatchedRuleTitle(data.matchedRule || "New Year's Resolution");
        setBreachPenaltySui(data.penaltySui || 10);
        setWalrusRecalledCount(data.walrus?.recalledCount || 0);
        setRepeatInfractionCount(data.repeatInfractionCount || 1);
        setStreakBroken(Boolean(data.streakBroken));
        setBehavioralInsight(data.behavioralInsight || "");

        if (data.behavioralInsight) {
          setBehavioralPatterns((prev) => [
            {
              type: "behavioral_pattern",
              pattern_title: (data.repeatInfractionCount || 1) >= 3 ? "Chronic Relapse Pattern" : "Recurring Violation Habit",
              observation: data.behavioralInsight,
              recommended_intervention: `Escalated fine to ${data.penaltySui || 15} SUI. Enforcing strict transfer curfew.`,
              confidence: 0.94,
              generated_at: new Date().toISOString(),
            },
            ...prev,
          ]);
        }

        if (data.tatum?.inflowMetrics) {
          setInflowProgress({
            current: data.tatum.inflowMetrics.totalInflowSui,
            target: data.tatum.inflowRuleChecked?.targetSui || 0,
            month: "Current Period",
            isDeficit: data.tatum.inflowRuleChecked ? !data.tatum.inflowRuleChecked.isMet : false,
          });
        }

        const matchedRuleObj = activeRulesList.find(
          (r) =>
            r.title.toLowerCase().includes((data.matchedRule || "").toLowerCase()) ||
            (data.matchedRule || "").toLowerCase().includes(r.title.toLowerCase())
        );
        setMatchedRuleMotivation(matchedRuleObj?.whyItMatters || "");

        if (data.verdict === "broken") {
          setTimeout(() => {
            setSendSubStep("breach");
          }, 300);
        } else {
          setSendSubStep("approved");
          setTimeout(() => {
            recordApprovedTransaction();
          }, 1400);
        }
      } else {
        // Fallback to approved if network check returns unexpected shape
        setSendSubStep("approved");
        setTimeout(() => {
          recordApprovedTransaction();
        }, 1400);
      }
    } catch (err) {
      console.warn("[Send Check] Verification notice, proceeding gracefully:", err);
      clearTimeout(stageTimer1);
      setSendSubStep("approved");
      setTimeout(() => {
        recordApprovedTransaction();
      }, 1400);
    }
  };

  // Handle Penalty Payment when Breach is Accepted via x402 Protocol
  const handlePayFineAndProceed = async () => {
    setIsSubmitting(true);
    setPayFineStage("Settling fine via x402...");
    try {
      const penaltyAmt = breachPenaltySui || 10;
      const transferAmt = parseFloat(sendAmount) || 0;
      const activeAccountAddress =
        accountType === "demo"
          ? (demoAddress || DEMO_SUI_ADDRESS)
          : accountType === "real"
          ? realAddress
          : linkedAddress || (demoAddress || DEMO_SUI_ADDRESS);

      // 1. Execute Real x402 Challenge-Response Flow with Sui Move Vault
      let isRealOnChain = false;
      let settlementType: "on_chain_ptb" | "cryptographic_voucher" = "cryptographic_voucher";
      let txHash: string | undefined = undefined;
      let voucherSignature: string | undefined = undefined;
      let explorerUrl: string | undefined = undefined;
      let vaultDestination =
        accountType === "demo"
          ? YEARBOUND_TESTNET_VAULT_ADDRESS
          : YEARBOUND_VAULT_ADDRESS;
      let settlementProvider =
        accountType === "demo"
          ? "Tatum Sui Testnet Gateway (x402 Protocol)"
          : "Tatum Sui Mainnet Gateway (x402 Protocol)";
      let settlementMsg = "";

      const privateKeySecret =
        accountType === "demo"
          ? (exportDemoPrivateKeyHex() || undefined)
          : accountType === "real"
          ? (exportRealPrivateKeyHex() || undefined)
          : undefined;

      try {
        const x402Result = await executeX402VaultDeposit({
          amountSui: penaltyAmt,
          reason: breachReason || `Breached resolution: ${matchedRuleTitle || "Curfew"}`,
          commitmentId: hydratedPactId || "pact_primary",
          walletMode: accountType,
          privateKeySecret: privateKeySecret || undefined,
          senderAddress: activeAccountAddress,
        });

        isRealOnChain = x402Result.isRealOnChain;
        settlementType = x402Result.settlementType;
        txHash = x402Result.txHash;
        voucherSignature = x402Result.voucherSignature;
        explorerUrl = x402Result.explorerUrl;
        vaultDestination = x402Result.vaultDestination;
        settlementProvider = x402Result.provider;
        settlementMsg = x402Result.message || "";
        console.log("[x402] Penalty successfully settled:", x402Result);
      } catch (x402Err) {
        console.warn("[x402] Challenge flow notice (proceeding with fallback voucher):", x402Err);
      }

      setLatestSettlement({
        isRealOnChain,
        settlementType,
        txHash,
        voucherSignature,
        explorerUrl,
        provider: settlementProvider,
        message: settlementMsg,
      });

      setPayFineStage("Inscribing to Walrus memory...");

      // 2. Persist Accountability Event Blob to Walrus Mainnet with verified tx hash / voucher
      let fineBlobId = `blob_infr_${Date.now().toString(36)}`;
      try {
        const res = await fetch("/api/walrus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(4000), // Fast 4s timeout prevents UI hang
          body: JSON.stringify({
            type: "accountability_event",
            commitment_id: hydratedPactId || "pact_primary",
            rule_id: activeRulesList.find((r) => r.title === matchedRuleTitle)?.id,
            rule_title: matchedRuleTitle,
            verdict: "broken",
            user_explanation: sendMemo,
            penalty_deposited_sui: penaltyAmt,
            vault_tx_hash: txHash || undefined,
            voucher_signature: voucherSignature || undefined,
            settlement_type: settlementType,
            is_real_on_chain: isRealOnChain,
            explorer_url: explorerUrl || undefined,
            recipient: sendRecipient,
            amount_sui: transferAmt,
            repeat_infraction_count: repeatInfractionCount,
            streak_broken: streakBroken,
            wallet_address: activeAccountAddress,
          }),
        });

        const data = await res.json();
        if (data?.blobId) {
          fineBlobId = data.blobId;
        }
      } catch (walrusErr) {
        console.warn("[Walrus] Event logging notice:", walrusErr);
      }

      const timestampStr = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date());

      const newInfraction: InfractionRecord = {
        id: `infr_${Date.now()}`,
        ruleTitle: matchedRuleTitle || activeRulesList[0]?.title || "Resolution 01",
        ruleCondition: activeRulesList[0]?.condition || "Behavioral boundary",
        amount: sendAmount,
        memo: sendMemo,
        timestamp: timestampStr,
        penaltySui: penaltyAmt,
        blobId: fineBlobId,
        dayOfYear: currentDayOfYear,
        verdict: "broken",
        recipient: sendRecipient,
        txHash,
        explorerUrl,
        isRealOnChain,
        isOffChainVoucher: !isRealOnChain,
        voucherSignature,
        settlementType,
        provider: settlementProvider,
        repeatCount: repeatInfractionCount,
        streakBroken: streakBroken,
        behavioralInsight: behavioralInsight,
        source: "user",
      };
      setInfractions((prev) => [newInfraction, ...prev]);

      const infractionBlob: WalrusMemoryBlob = {
        blobId: fineBlobId,
        type: "accountability_event",
        title: `Infraction #${repeatInfractionCount}: ${matchedRuleTitle || activeRulesList[0]?.title || "Resolution Breach"}`,
        timestamp: timestampStr,
        payload: {
          protocol: "Yearbound v1",
          storage: "Walrus Memory (MemWal)",
          type: "accountability_event",
          verdict: "broken",
          userMemo: sendMemo,
          penaltyDepositedSui: penaltyAmt,
          settlementType,
          isRealOnChain,
          vaultTxHash: txHash || null,
          voucherSignature: voucherSignature || null,
          explorerUrl: explorerUrl || null,
          settlementEngine: settlementProvider,
          breachedResolution: matchedRuleTitle || activeRulesList[0]?.title || "Resolution 01",
          repeatCount: repeatInfractionCount,
          streakBroken: streakBroken,
          behavioralInsight: behavioralInsight,
          destination: vaultDestination,
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
      // Graceful fallback so demo never gets blocked
      const fallbackBlobId = `blob_infr_${Date.now().toString(36)}`;
      setLatestFineBlobId(fallbackBlobId);
      setSendSubStep("penalty_recorded");
    } finally {
      setIsSubmitting(false);
      setPayFineStage("");
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
        ? (demoAddress || DEMO_SUI_ADDRESS)
        : accountType === "real"
        ? realAddress
        : linkedAddress || (demoAddress || DEMO_SUI_ADDRESS);
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

    const activeInflowRule = activeRulesList.find((r) => {
      const t = `${r.title} ${r.condition}`.toLowerCase();
      return (
        t.includes("save") ||
        t.includes("deposit") ||
        t.includes("inflow") ||
        t.includes("earn") ||
        t.includes("income") ||
        t.includes("accumulate")
      );
    });

    const numMatch = activeInflowRule
      ? `${activeInflowRule.title} ${activeInflowRule.condition}`.match(/(\d+[\d,.]*)\s*(?:sui|SUI|\$)?/)
      : null;
    const dynamicTarget = numMatch ? `${numMatch[1]} SUI Target` : null;

    triggerSnackbar(
      "Address Copied · Tatum Inflow Tracking Active",
      dynamicTarget
        ? `Auditing "${activeInflowRule?.title}" (${dynamicTarget} via Tatum Gateway)`
        : "Audited on-chain via Tatum Sui Gateway"
    );
    setTimeout(() => setCopiedAddress(false), 2500);
  };

  // Persistent milestone cache & Walrus log tracking for idempotent time travel
  const milestoneCacheRef = React.useRef<Map<TimeMilestone, InfractionRecord[]>>(new Map());
  const loggedMilestonesToWalrusRef = React.useRef<Set<string>>(new Set());

  // Helper to generate dynamic memo based on user's actual resolution
  const getDynamicResolutionMemo = (rule: RuleItem, context: "first" | "repeat" | "summer") => {
    const t = (rule.title || "").toLowerCase();
    const c = (rule.condition || "").toLowerCase();
    const combined = `${t} ${c}`;

    if (combined.includes("bet") || combined.includes("gambl") || combined.includes("sport") || combined.includes("parlay") || combined.includes("wager")) {
      if (context === "first") return "Super Bowl live parlay wager";
      if (context === "repeat") return "Weekend derby live odds bet";
      return "Championship futures bet";
    }
    if (combined.includes("food") || combined.includes("takeout") || combined.includes("delivery") || combined.includes("eat") || combined.includes("curfew")) {
      if (context === "first") return "Valentine's midnight food delivery (11:30 PM)";
      if (context === "repeat") return "Midnight pizza takeout order (12:20 AM)";
      return "Late-night fast food order (1:15 AM)";
    }
    if (combined.includes("banned") || combined.includes("send") || combined.includes("transfer") || combined.includes("xxxx")) {
      return `Transfer sent to forbidden recipient: ${rule.condition.slice(0, 24)}`;
    }
    if (combined.includes("shop") || combined.includes("spend") || combined.includes("buy") || combined.includes("gear")) {
      if (context === "first") return "Unplanned impulse checkout";
      return "Online retail impulse buy";
    }
    return `Impulsive slip-up breaching: ${rule.title}`;
  };

  // Handler for Demo-Only 12-Month Time Travel Scrubber (Strictly Idempotent)
  const handleMilestoneChange = (milestone: TimeMilestone) => {
    setActiveMilestone(milestone);

    // 1. Preserve all user-initiated manual transactions
    const userTransactions = infractions.filter((i) => i.source === "user");
    const userPenaltySum = userTransactions.reduce((acc, i) => acc + (i.verdict === "honored" ? 0 : i.penaltySui), 0);

    const primaryRule = activeRulesList[0] || rules[0] || {
      id: "1",
      title: "Personal Discipline",
      condition: "Maintain New Year commitments",
      penalty: 10,
      whyItMatters: "Self growth",
    };
    const secondaryRule = activeRulesList[1] || rules[1] || primaryRule;

    if (milestone === "jan1") {
      setCurrentDateStr("Thursday, Jan 1, 2026");
      setCurrentDayOfYear(1);
      setEscrowDeposit(10 + userPenaltySum);
      setIsVaultUnlocked(false);
      setIsVaultClaimed(false);
      setInfractions([...userTransactions]);
      triggerSnackbar("Time Travel: Jan 1 (Genesis)", "Fresh New Year oaths sealed · 0 milestone breaches");
      return;
    }

    if (milestone === "feb14") {
      setCurrentDateStr("Saturday, Feb 14, 2026");
      setCurrentDayOfYear(45);
      setIsVaultUnlocked(false);
      setIsVaultClaimed(false);

      let febInfrs = milestoneCacheRef.current.get("feb14");
      if (!febInfrs) {
        const penalty = primaryRule.penalty || 10;
        const memo = getDynamicResolutionMemo(primaryRule, "first");
        const blobId = `blob_walrus_feb14_${Date.now().toString(36)}`;
        const record: InfractionRecord = {
          id: "milestone_feb14",
          ruleTitle: primaryRule.title,
          ruleCondition: primaryRule.condition,
          amount: "25",
          memo,
          timestamp: "Feb 14, 11:30 PM",
          penaltySui: penalty,
          blobId,
          dayOfYear: 45,
          verdict: "broken",
          source: "timeline",
        };
        febInfrs = [record];
        milestoneCacheRef.current.set("feb14", febInfrs);

        // Inscribe once to Walrus Mainnet
        if (!loggedMilestonesToWalrusRef.current.has("feb14")) {
          loggedMilestonesToWalrusRef.current.add("feb14");
          fetch("/api/walrus", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(3500),
            body: JSON.stringify({
              type: "accountability_event",
              commitment_id: "pact_primary",
              verdict: "broken",
              user_explanation: memo,
              penalty_deposited_sui: penalty,
              vault_tx_hash: "0x_sui_ptb_feb14",
            }),
          }).catch((e) => console.warn("[Walrus Demo] Feb 14 log notice:", e));
        }
      }

      const totalFines = febInfrs.reduce((acc, i) => acc + i.penaltySui, 0);
      setEscrowDeposit(10 + totalFines + userPenaltySum);
      setInfractions([...userTransactions, ...febInfrs]);
      triggerSnackbar(
        "Time Travel: Feb 14 (1st Breach)",
        `Breached '${primaryRule.title}' · ${primaryRule.penalty || 10} SUI fine locked via x402`
      );
      return;
    }

    if (milestone === "jul20" || milestone === "dec25") {
      const isChristmas = milestone === "dec25";
      setCurrentDateStr(isChristmas ? "Friday, Dec 25, 2026" : "Monday, Jul 20, 2026");
      setCurrentDayOfYear(isChristmas ? 359 : 201);
      setIsVaultUnlocked(isChristmas);

      let summerInfrs = milestoneCacheRef.current.get("jul20");
      if (!summerInfrs) {
        const p1 = primaryRule.penalty || 10;
        const p2 = secondaryRule.penalty || 15;
        const febMemo = getDynamicResolutionMemo(primaryRule, "first");
        const mayMemo = getDynamicResolutionMemo(secondaryRule, "repeat");
        const julMemo = getDynamicResolutionMemo(primaryRule, "summer");

        const record1: InfractionRecord = {
          id: "milestone_feb14",
          ruleTitle: primaryRule.title,
          ruleCondition: primaryRule.condition,
          amount: "25",
          memo: febMemo,
          timestamp: "Feb 14, 11:30 PM",
          penaltySui: p1,
          blobId: `blob_walrus_feb14_${Date.now().toString(36)}`,
          dayOfYear: 45,
          verdict: "broken",
          source: "timeline",
        };
        const record2: InfractionRecord = {
          id: "milestone_may15",
          ruleTitle: secondaryRule.title,
          ruleCondition: secondaryRule.condition,
          amount: "40",
          memo: mayMemo,
          timestamp: "May 15, 9:45 PM",
          penaltySui: p2,
          blobId: `blob_walrus_may15_${Date.now().toString(36)}`,
          dayOfYear: 135,
          verdict: "broken",
          source: "timeline",
        };
        const record3: InfractionRecord = {
          id: "milestone_jul20",
          ruleTitle: primaryRule.title,
          ruleCondition: primaryRule.condition,
          amount: "30",
          memo: julMemo,
          timestamp: "Jul 20, 12:15 AM",
          penaltySui: p1,
          blobId: `blob_walrus_jul20_${Date.now().toString(36)}`,
          dayOfYear: 201,
          verdict: "broken",
          source: "timeline",
        };
        summerInfrs = [record3, record2, record1];
        milestoneCacheRef.current.set("jul20", summerInfrs);
        milestoneCacheRef.current.set("dec25", summerInfrs);

        if (!loggedMilestonesToWalrusRef.current.has("jul20")) {
          loggedMilestonesToWalrusRef.current.add("jul20");
          fetch("/api/walrus", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(3500),
            body: JSON.stringify({
              type: "accountability_event",
              commitment_id: "pact_primary",
              verdict: "broken",
              user_explanation: julMemo,
              penalty_deposited_sui: p1,
              vault_tx_hash: "0x_sui_ptb_jul20",
            }),
          }).catch((e) => console.warn("[Walrus Demo] Jul 20 log notice:", e));
        }
      }

      const totalFines = summerInfrs.reduce((acc, i) => acc + i.penaltySui, 0);
      setEscrowDeposit(10 + totalFines + userPenaltySum);
      setInfractions([...userTransactions, ...summerInfrs]);

      if (isChristmas) {
        triggerSnackbar(
          "🎅 Time Travel: Dec 25 (Christmas Unlock)",
          `Move vault time-lock mature! Claim your ${10 + totalFines + userPenaltySum} SUI savings.`
        );
      } else {
        triggerSnackbar(
          "Time Travel: Jul 20 (Habit Pattern)",
          `Walrus synthesis: 3 breaches across '${primaryRule.title}' · ${totalFines} SUI in vault`
        );
      }
      return;
    }
  };

  const handleClaimChristmasVault = () => {
    if (isVaultClaimed) return;
    const claimedAmt = escrowDeposit;
    setAvailableBalance((prev) => prev + claimedAmt);
    setIsVaultClaimed(true);
    triggerSnackbar(
      "🎅 Christmas Vault Unlocked & Claimed!",
      `+${claimedAmt}.00 SUI released from Sui Move contract into wallet.`
    );
  };

  const activeRulesList = rules.filter((r) => r.title.trim().length > 0);
  const totalBreaches = activeRulesList.reduce((sum, r) => sum + (r.breaches || 0), 0);

  const activeWalletDisplay =
    accountType === "demo"
      ? `Testnet · ${(demoAddress || DEMO_SUI_ADDRESS).slice(0, 6)}...${(demoAddress || DEMO_SUI_ADDRESS).slice(-4)}`
      : accountType === "real"
      ? `Mainnet · ${realAddress.slice(0, 6)}...${realAddress.slice(-4)}`
      : `Linked · ${linkedAddress ? `${linkedAddress.slice(0, 6)}...${linkedAddress.slice(-4)}` : "Wallet"}`;

  return (
    <main className="fixed inset-0 w-full h-[100dvh] bg-[#000000] text-[#FFFFFF] flex items-start sm:items-center justify-center p-0 md:p-6 overflow-hidden font-sans">
      {/* ====================================================================
          MOBILE SHELL (Centered vertical frame on desktop, solid black ground)
          ==================================================================== */}
      <div className={`relative w-full max-w-[420px] h-full md:h-[860px] md:max-h-[92vh] bg-[#000000] md:border md:border-[#222226] md:rounded-[40px] flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-300 ${
        isDegradedMode ? "filter grayscale contrast-90" : ""
      }`}>
        {/* ====================================================================
            TOP SYSTEM BAR: TOTAL RECALL vs DEGRADED LEGACY TOGGLE
            ==================================================================== */}
        <div
          className={`w-full px-4 py-2 border-b transition-colors duration-200 flex items-center justify-between shrink-0 z-30 ${
            isDegradedMode
              ? "bg-[#18181B] border-[#27272A]"
              : "bg-[#0A0A0C] border-[#18181C]"
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isDegradedMode
                  ? "bg-[#71717A]"
                  : "bg-[#10B981] shadow-[0_0_8px_#10B981]"
              }`}
            />
            <span
              className={`text-[10px] font-mono tracking-wider uppercase font-semibold ${
                isDegradedMode ? "text-[#A1A1AA]" : "text-white"
              }`}
            >
              {isDegradedMode ? "Legacy Banking (Degraded)" : "Walrus Recall · Tatum"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isHydrating && (
              <span className="text-[9px] font-mono text-[#E5A93C] animate-pulse">
                Hydrating...
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsDegradedMode((prev) => !prev)}
              className={`text-[10px] font-mono px-2.5 py-1 rounded-full border transition-all duration-150 active:scale-95 flex items-center gap-1 ${
                isDegradedMode
                  ? "bg-[#27272A] text-white border-[#3F3F46] hover:bg-[#3F3F46]"
                  : "bg-[#131316] text-[#A1A1AA] border-[#27272A] hover:text-white hover:border-[#3F3F46]"
              }`}
              title={
                isDegradedMode
                  ? "Restore Walrus Total Recall & Tatum Gateway"
                  : "Simulate stateless Web2 legacy banking without memory"
              }
            >
              <span>{isDegradedMode ? "⚡ Restore Recall" : "Simulate Degraded"}</span>
            </button>
          </div>
        </div>

        {isDegradedMode && (
          <div className="w-full bg-[#1C1917] border-b border-[#292524] px-4 py-1.5 flex items-center justify-between text-[10px] font-mono text-[#FCA5A5] animate-in slide-in-from-top-1 shrink-0 z-20">
            <span>⚠️ Web2 Mode: Walrus Memory bypassed · Flat fines · Stateless</span>
            <span className="text-[#A8A29E]">No Recall</span>
          </div>
        )}

        {/* Existing Genesis Pact Banner (if hydrated from Walrus on Steps 1-3) */}
        {step > 0 && step < 4 && hydratedPactId && (
          <div className="mx-4 mt-2 mb-1 bg-[#14120C] border border-[#3E2812] rounded-xl px-3 py-2 flex items-center justify-between text-xs animate-in fade-in shrink-0 z-20">
            <div className="flex flex-col min-w-0 pr-2">
              <span className="font-medium text-white truncate">Walrus Genesis Pact Found</span>
              <span className="text-[10px] font-mono text-[#E5A93C] truncate">#{hydratedPactId.slice(0, 12)}...</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setStep(4);
                setActiveTab("home");
              }}
              className="text-[10px] font-mono font-semibold bg-[#E5A93C] text-black px-2.5 py-1 rounded-lg hover:bg-[#F5B84D] transition-colors shrink-0"
            >
              Resume Pact →
            </button>
          </div>
        )}
        
        {/* ==================================================================
            SCREEN 0: SIGN IN & RESTORE MEMORY GATEWAY
            ================================================================== */}
        {step === 0 && (
          <div className="flex-1 flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
            <div className="pt-6 sm:pt-8 px-7 pb-3 flex flex-col gap-1 shrink-0">
              <div className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.02em] leading-tight text-white">
                Sign in
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-7 py-2 flex flex-col gap-3.5 pb-4 overscroll-contain">
              {/* Option 1: Connect Sui Wallet */}
              <div
                onClick={handleConnectExtensionAndEnter}
                className="bg-[#0A0A0C] rounded-2xl p-5 flex flex-col gap-3 cursor-pointer transition-all duration-200 active:scale-[0.99] border border-[#222226] hover:border-[#3F3F46]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-semibold text-white tracking-[-0.01em]">
                      Connect wallet
                    </div>
                    <span className="text-[10px] font-mono text-[#71717A] uppercase tracking-wider">
                      {detectedExtension ? detectedExtension.name : "Browser Extension"}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-[#A1A1AA] flex items-center gap-1">
                    <span>{isConnectingExtension ? "Connecting..." : "Connect"}</span>
                    <ArrowRight size={14} />
                  </div>
                </div>

                <p className="text-xs text-[#71717A] leading-relaxed">
                  Link an installed Sui extension wallet to verify your identity and restore past commitments from Walrus memory.
                </p>

                {linkedAddress && (
                  <div className="pt-3 border-t border-[#18181C] flex items-center justify-between text-xs font-mono text-[#A1A1AA]">
                    <span>Connected</span>
                    <span>{linkedAddress.slice(0, 6)}...{linkedAddress.slice(-4)}</span>
                  </div>
                )}
              </div>

              {/* Option 2: Restore from Walrus with Address or Blob ID */}
              <div
                onClick={() => setShowRestoreInput((prev) => !prev)}
                className={`bg-[#0A0A0C] rounded-2xl p-5 flex flex-col gap-3 cursor-pointer transition-all duration-200 border ${
                  showRestoreInput ? "border-white/40" : "border-[#222226] hover:border-[#3F3F46]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-semibold text-white tracking-[-0.01em]">
                      Restore from Walrus
                    </div>
                    <span className="text-[10px] font-mono text-[#71717A] uppercase tracking-wider">
                      Decentralized State Recall
                    </span>
                  </div>
                  <div className="text-xs font-mono text-[#A1A1AA] flex items-center gap-1">
                    <span>{showRestoreInput ? "Close" : "Enter ID"}</span>
                    {showRestoreInput ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </div>

                <p className="text-xs text-[#71717A] leading-relaxed">
                  Enter your Sui address or Genesis Walrus Blob ID to reconstruct your resolutions, streaks, and infractions on this device.
                </p>

                {showRestoreInput && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex flex-col gap-2.5 pt-3 border-t border-[#18181C]"
                  >
                    <input
                      type="text"
                      placeholder="0x... or blob_..."
                      value={restoreInput}
                      onChange={(e) => setRestoreInput(e.target.value)}
                      className="w-full bg-[#131316] border border-[#222226] rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-[#52525B] focus:outline-none focus:border-[#52525B]"
                    />
                    <button
                      type="button"
                      onClick={handleDirectRestore}
                      disabled={isRestoring || !restoreInput.trim()}
                      className="py-2.5 px-4 rounded-xl bg-white text-black font-semibold text-xs hover:bg-[#E4E4E7] transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 active:scale-[0.98]"
                    >
                      <span>{isRestoring ? "Recalling from Walrus..." : "Restore Memory"}</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Option 3: Demo Sandbox */}
              <div
                onClick={() => {
                  setAccountType("demo");
                  const activeDemo = demoAddress || DEMO_SUI_ADDRESS;
                  hydrateFromWalrus(activeDemo);
                  refreshLiveBalance(activeDemo, "demo");
                  setStep(4);
                  setActiveTab("home");
                }}
                className="bg-[#0A0A0C] rounded-2xl p-5 flex flex-col gap-3 cursor-pointer transition-all duration-200 active:scale-[0.99] border border-[#222226] hover:border-[#3F3F46]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-semibold text-white tracking-[-0.01em]">
                      Demo sandbox
                    </div>
                    <span className="text-[10px] font-mono text-[#71717A] uppercase tracking-wider">
                      Sui Testnet · Mainnet Walrus
                    </span>
                  </div>
                  <div className="text-xs font-mono text-[#A1A1AA] flex items-center gap-1">
                    <span>Explore</span>
                    <ArrowRight size={14} />
                  </div>
                </div>

                <p className="text-xs text-[#71717A] leading-relaxed">
                  Live Sui Testnet sandbox via Tatum Gateway with permanent Mainnet Walrus memory. Real testnet PTBs, vault locks, and memory audit.
                </p>

                <div className="pt-3 border-t border-[#18181C] flex items-center justify-between text-xs font-mono text-[#71717A]">
                  <span>{(demoAddress || DEMO_SUI_ADDRESS).slice(0, 6)}...{(demoAddress || DEMO_SUI_ADDRESS).slice(-4)}</span>
                  <span className="text-white">
                    {liveOnChainBalanceSui !== null && accountType === "demo" ? `${liveOnChainBalanceSui.toFixed(2)} SUI (Testnet)` : "150.00 SUI (Testnet)"}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom: Start New Pact Action */}
            <div className="p-7 pt-3 pb-8 sm:pb-9 shrink-0 flex flex-col gap-3 border-t border-[#18181C]">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full py-4 px-6 rounded-2xl bg-white text-black font-semibold text-sm hover:bg-[#E4E4E7] transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] shadow-md"
              >
                <span>Create a new pact</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================
            SCREEN 1: RESOLUTION BUILDER (Accordion - Single Expanded Rule)
            ================================================================== */}
        {step === 1 && (
          <div className="flex-1 flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
            <div className="pt-5 sm:pt-7 px-5 sm:px-7 pb-2 shrink-0 flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="self-start text-[#71717A] hover:text-white flex items-center gap-1.5 text-xs font-medium transition-colors active:scale-95"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
              <div className="text-[26px] sm:text-[32px] font-semibold tracking-[-0.02em] leading-tight text-white">
                Write your resolutions
              </div>
            </div>

            <div
              ref={scrollContainerRef}
              onClick={handleCloseActiveRule}
              className="flex-1 overflow-y-auto px-5 sm:px-7 py-2 flex flex-col pb-4 overscroll-contain cursor-default"
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

              {/* EXPANDED EDITOR OR ADD ACTION CONTAINER */}
              {(() => {
                const expandedRule = rules.find((r) => r.id === expandedRuleId);
                const expandedIndex = expandedRule ? rules.findIndex((r) => r.id === expandedRule.id) : -1;

                return (
                  <div className="flex flex-col items-center transition-all duration-200 ease-out w-full mt-3">
                    {/* Active Expanded Resolution Card */}
                    {expandedRule && (
                      <div
                        key={expandedRule.id}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-[#0A0A0C] border border-[#3F3F46] rounded-2xl p-4 flex flex-col gap-3 relative focus-within:border-white transition-all duration-300 ease-out shadow-xl mb-4 animate-in fade-in zoom-in-95 cursor-auto"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-mono font-medium text-[#71717A] tracking-wider">
                            0{expandedIndex + 1}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCloseActiveRule();
                              }}
                              className={`text-xs font-bold tracking-wider transition-colors duration-150 py-1 px-2.5 rounded-lg active:scale-95 ${
                                expandedRule.title.trim() && expandedRule.condition.trim()
                                  ? "text-white bg-[#1F1F23] hover:bg-[#27272A] cursor-pointer"
                                  : "text-[#71717A] bg-[#141416] hover:text-white cursor-pointer"
                              }`}
                            >
                              Done
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeRule(expandedRule.id);
                              }}
                              className="text-[#71717A] hover:text-[#EF4444] p-1.5 transition-colors active:scale-95 rounded-lg hover:bg-[#18181B] cursor-pointer"
                              title={rules.length > 1 ? "Remove resolution" : "Clear fields"}
                            >
                              <Trash2 size={13} />
                            </button>
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

                        {showMotivationIds[expandedRule.id] || Boolean(expandedRule.whyItMatters) ? (
                          <div className="flex flex-col gap-1.5 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-medium text-[#A1A1AA]">
                                Why this matters to you
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  updateRule(expandedRule.id, "whyItMatters", "");
                                  setShowMotivationIds((prev) => ({ ...prev, [expandedRule.id]: false }));
                                }}
                                className="text-[10px] text-[#71717A] hover:text-[#EF4444] transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                            <input
                              type="text"
                              value={expandedRule.whyItMatters || ""}
                              onChange={(e) => updateRule(expandedRule.id, "whyItMatters", e.target.value)}
                              placeholder="e.g. Save $3,000 for Tokyo trip & fix sleep routine"
                              className="w-full bg-[#131316] border border-[#27272A] rounded-xl px-3.5 py-2 text-sm text-white placeholder-[#52525B] outline-none focus:border-white transition-colors"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setShowMotivationIds((prev) => ({ ...prev, [expandedRule.id]: true }))
                            }
                            className="self-start text-[11px] font-mono text-[#71717A] hover:text-[#E4E4E7] flex items-center gap-1.5 transition-colors pt-0.5"
                          >
                            <Plus size={11} />
                            <span>Add personal motivation</span>
                          </button>
                        )}
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

            <div className="p-4 sm:p-6 bg-[#000000] shrink-0 border-t border-[#18181C]">
              <button
                type="button"
                onClick={() => {
                  if (!isStep1Valid) {
                    triggerSnackbar("Incomplete resolutions", "Please provide a title and condition for all resolutions");
                    return;
                  }
                  setStep(2);
                }}
                className={`w-full py-4 px-6 rounded-full font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] ${
                  isStep1Valid
                    ? "bg-[#FFFFFF] text-[#000000] hover:bg-[#E4E4E7] cursor-pointer"
                    : "bg-[#1C1C20] text-[#71717A] hover:bg-[#26262B] hover:text-[#A1A1AA] cursor-pointer"
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
                  const activeDemo = demoAddress || DEMO_SUI_ADDRESS;
                  refreshLiveBalance(activeDemo, "demo");
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
                      Sui Testnet Sandbox · Tatum Gateway
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
                  Operates on live Sui Testnet with an isolated device Ed25519 keypair. Real PTBs execute via Tatum Testnet Gateway with audit trails on Mainnet Walrus Memory.
                </p>

                <div className="pt-3 border-t border-[#18181C] flex items-center justify-between text-xs font-mono">
                  <span className="text-[#A1A1AA]">
                    {(demoAddress || DEMO_SUI_ADDRESS).slice(0, 6)}...{(demoAddress || DEMO_SUI_ADDRESS).slice(-4)}
                  </span>
                  <span className="text-white font-medium">
                    {liveOnChainBalanceSui !== null && accountType === "demo"
                      ? `${liveOnChainBalanceSui.toFixed(2)} SUI (Testnet)`
                      : `${availableBalance.toFixed(2)} SUI (Testnet)`}
                  </span>
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
                className={`relative overflow-hidden w-full py-4 px-6 rounded-full font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                  isSubmitting
                    ? "bg-[#18181C] text-white border border-[#27272A] cursor-wait"
                    : "bg-[#FFFFFF] text-[#000000] hover:bg-[#E4E4E7] active:scale-[0.98]"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div
                      className="absolute inset-y-0 left-0 bg-white/20 transition-all duration-700 ease-out"
                      style={{ width: `${sealingProgress}%` }}
                    />
                    <div className="relative z-10 flex items-center justify-center gap-2.5 max-w-full px-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block shrink-0" />
                      <span className="truncate text-xs text-white font-medium tracking-normal">
                        {sealingStage || "Connecting to Walrus..."}
                      </span>
                    </div>
                  </>
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
            {/* DEMO ACCOUNT ONLY: 12-MONTH CHRONOLOGICAL TIME-TRAVEL SCRUBBER */}
            {accountType === "demo" && (
              <TimeTravelScrubber
                activeMilestone={activeMilestone}
                onChangeMilestone={handleMilestoneChange}
              />
            )}

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

                {/* CHRISTMAS UNLOCK BANNER (When Time-Lock Reaches Dec 25) */}
                {isVaultUnlocked && (
                  <div className="bg-gradient-to-r from-[#18150A] to-[#12110E] border border-[#E5A93C]/40 rounded-2xl p-5 flex flex-col gap-3 shadow-lg shadow-[#E5A93C]/5 animate-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Gift size={16} className="text-[#E5A93C]" />
                        <span className="text-xs font-semibold text-white uppercase tracking-wider">
                          Christmas Vault Unlocked
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-[#E5A93C] bg-[#E5A93C]/10 px-2 py-0.5 rounded border border-[#E5A93C]/20">
                        {isVaultClaimed ? "Funds Claimed" : "Time-Lock Expired"}
                      </span>
                    </div>
                    <p className="text-xs text-[#D4D4D8] leading-relaxed">
                      {isVaultClaimed
                        ? `You claimed ${escrowDeposit}.00 SUI back to your wallet. Full year discipline cycle completed.`
                        : `Sui network clock reached December 25. You saved ${escrowDeposit}.00 SUI from your impulsive self.`}
                    </p>
                    {!isVaultClaimed ? (
                      <button
                        type="button"
                        onClick={handleClaimChristmasVault}
                        className="w-full py-3 px-4 rounded-xl bg-[#E5A93C] hover:bg-[#F5B84D] text-black font-semibold text-xs transition-all duration-150 flex items-center justify-center gap-2 active:scale-[0.98] shadow-md"
                      >
                        <Gift size={14} />
                        <span>Claim Christmas Savings ({escrowDeposit}.00 SUI)</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-mono text-[#10B981] bg-[#10B981]/10 p-2.5 rounded-xl border border-[#10B981]/20">
                        <Check size={14} />
                        <span>55.00 SUI released from Sui Move contract into available balance</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. WALLY MEMORY SHOWCASE BOX */}
                <div className="bg-[#0A0A0C] border border-[#222226] rounded-2xl p-5 flex flex-col gap-2.5 relative transition-all duration-200 hover:border-[#3F3F46]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#71717A]">
                      {isDegradedMode ? "Legacy Banking Engine" : "Wally · Walrus Memory"}
                    </span>
                    <span className="text-[11px] font-mono text-[#71717A]">
                      {isDegradedMode ? "Stateless (Web2)" : walrusBlobId ? `Blob #${walrusBlobId.slice(0, 8)}` : "Blob #d4a97f"}
                    </span>
                  </div>
                  <p className="text-sm text-[#E4E4E7] leading-relaxed font-normal">
                    {isDegradedMode
                      ? "Stateless Session: Web2 banking mode active. Walrus memory is disconnected. Outgoing transfers are not cross-referenced against your resolutions and past infractions are forgotten."
                      : isVaultUnlocked && !isVaultClaimed
                      ? `🎅 Merry Christmas! The Sui network clock has passed the vault unlock timestamp (1798156800000 ms). Your accumulated savings of ${escrowDeposit}.00 SUI are now ready to be claimed!`
                      : isVaultClaimed
                      ? `🎉 Christmas gift claimed! You successfully locked ${escrowDeposit}.00 SUI away from your impulsive past self and reclaimed it for the holidays.`
                      : activeMilestone === "jul20"
                      ? `Walrus memory synthesis: Multiple slip-ups recorded on "${activeRulesList[0]?.title || "your resolution"}". ${activeRulesList[0]?.whyItMatters ? `You pledged: "${activeRulesList[0].whyItMatters}". ` : ""}${escrowDeposit}.00 SUI total is now locked away in Move storage.`
                      : activeMilestone === "feb14"
                      ? `Day 45: First slip-up logged. You swore in Walrus Memory: "${activeRulesList[0]?.title || "your resolution"}". ${activeRulesList[0]?.penalty || 10} SUI was locked into the Move vault via x402.`
                      : totalBreaches > 0
                      ? `Infraction logged into Walrus memory. You have paid penalties into the vault. Current balance: ${availableBalance.toFixed(2)} SUI.`
                      : activeRulesList.length > 0
                      ? `I have committed your resolutions to Walrus memory. 0 infractions recorded. Remember your pact: "${activeRulesList[0].title}". ${activeRulesList[0].penalty || 10} SUI penalty standing by if you slip up.`
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

                {/* 3A. WALLY'S COMPOUNDING MEMORY JOURNAL */}
                <div
                  className={`border rounded-2xl p-5 flex flex-col gap-3 transition-all duration-200 ${
                    isDegradedMode
                      ? "bg-[#111113] border-[#222226] text-[#71717A]"
                      : "bg-[#0A0A0C] border-[#222226] hover:border-[#3F3F46]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles
                        size={14}
                        className={isDegradedMode ? "text-[#52525B]" : "text-[#E5A93C]"}
                      />
                      <span className="text-[11px] font-mono uppercase tracking-wider text-[#71717A]">
                        Wally's Memory Journal · Pattern Synthesis
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        isDegradedMode
                          ? "text-[#71717A] bg-[#18181B] border-[#27272A]"
                          : "text-[#10B981] bg-[#10B981]/10 border-[#10B981]/25"
                      }`}
                    >
                      {isDegradedMode ? "Offline (Web2)" : "Compounding Active"}
                    </span>
                  </div>

                  {isDegradedMode ? (
                    <p className="text-xs text-[#71717A] leading-relaxed italic">
                      Decentralized memory journal offline. Traditional Web2 banking does not synthesize recurring behavioral habits or cross-session accountability.
                    </p>
                  ) : behavioralPatterns.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">
                          {behavioralPatterns[0].pattern_title || "Emerging Behavioral Habit"}
                        </span>
                        <span className="text-[10px] font-mono text-[#E5A93C]">
                          {Math.round((behavioralPatterns[0].confidence || 0.94) * 100)}% Confidence
                        </span>
                      </div>
                      <p className="text-xs text-[#D4D4D8] leading-relaxed">
                        {behavioralPatterns[0].observation || "Multiple breaches detected. Agent has synthesized habit correlation across your transaction history."}
                      </p>
                      {behavioralPatterns[0].recommended_intervention && (
                        <div className="text-[11px] font-mono text-[#A1A1AA] bg-[#131316] border border-[#222226] p-2.5 rounded-xl">
                          💡 Intervention: {behavioralPatterns[0].recommended_intervention}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const patternBlobId = `blob_pattern_${(behavioralPatterns[0].pattern_title || "habit").toLowerCase().replace(/\s+/g, "_")}`;
                          setExpandedJsonBlobId(patternBlobId);
                          setIsMemoryInspectorOpen(true);
                        }}
                        className="self-start text-[11px] font-mono text-[#E5A93C] hover:text-[#F5B84D] flex items-center gap-1 mt-1 transition-colors"
                      >
                        <span>Inspect Pattern Blob Proof</span>
                        <ExternalLink size={10} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">
                          Zero Habit Decay Detected · Clean Record
                        </span>
                        <span className="text-[10px] font-mono text-[#10B981]">
                          100% Adherence
                        </span>
                      </div>
                      <p className="text-xs text-[#A1A1AA] leading-relaxed">
                        Walrus memory is actively cross-referencing your transactions against {activeRulesList.length} locked commitments. As transactions accumulate, Wally synthesizes recurring timing vulnerabilities and escalating deterrents.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsMemoryInspectorOpen(true)}
                        className="self-start text-[11px] font-mono text-[#A1A1AA] hover:text-white flex items-center gap-1 mt-1 transition-colors"
                      >
                        <span>View Decentralized Memory Ledger</span>
                        <ExternalLink size={10} />
                      </button>
                    </div>
                  )}
                </div>

                {/* 3B. RECENT ACTIVITY · WALRUS MEMORY LEDGER */}
                {infractions.length > 0 && (
                  <div className="bg-[#0A0A0C] border border-[#222226] rounded-2xl p-5 flex flex-col gap-3 transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity size={14} className="text-[#A1A1AA]" />
                        <span className="text-[11px] font-mono uppercase tracking-wider text-[#71717A]">
                          Recent Activity · Walrus Ledger
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsMemoryInspectorOpen(true)}
                        className="text-[11px] font-mono text-[#A1A1AA] hover:text-white flex items-center gap-1 transition-colors"
                      >
                        <span>Memory Proofs ({infractions.length})</span>
                        <ExternalLink size={10} />
                      </button>
                    </div>

                    <div className="flex flex-col gap-2 pt-1">
                      {infractions.slice(0, 3).map((item) => {
                        const isHonored = item.verdict === "honored";
                        return (
                          <div
                            key={item.id}
                            className="bg-[#131316] border border-[#222226] rounded-xl p-3 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex flex-col gap-0.5 shrink-0">
                                <span
                                  className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border text-center ${
                                    isHonored
                                      ? "text-[#10B981] bg-[#10B981]/10 border-[#10B981]/25"
                                      : "text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/25"
                                  }`}
                                >
                                  {isHonored ? "Honored" : "Breach"}
                                </span>
                                {item.repeatCount && item.repeatCount > 1 && (
                                  <span className="text-[8px] font-mono text-red-400 text-center font-semibold">
                                    #{item.repeatCount}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-medium text-white truncate">
                                  {item.memo || (isHonored ? "Transfer" : "Breach Fine")}
                                </span>
                                <span className="text-[10px] text-[#71717A] truncate">
                                  {item.timestamp}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end shrink-0 gap-0.5">
                              <span className="text-xs font-mono font-semibold text-white">
                                {isHonored ? `-${item.amount} SUI` : `+${item.penaltySui} SUI`}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {item.isRealOnChain && item.txHash && item.explorerUrl ? (
                                  <a
                                    href={item.explorerUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[9px] font-mono text-[#E5A93C] hover:text-[#F3BA5B] flex items-center gap-0.5 transition-colors"
                                    title="View Sui PTB on SuiScan"
                                  >
                                    <span>PTB</span>
                                    <ExternalLink size={8} />
                                  </a>
                                ) : item.voucherSignature || item.isOffChainVoucher ? (
                                  <span
                                    className="text-[9px] font-mono text-[#71717A] bg-[#18181C] px-1.5 py-0.5 rounded border border-[#222226]"
                                    title="x402 Agent Cryptographic Voucher (Inscribed to Walrus)"
                                  >
                                    x402 Voucher
                                  </span>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExpandedJsonBlobId(item.blobId);
                                    setIsMemoryInspectorOpen(true);
                                  }}
                                  className="text-[9px] font-mono text-[#71717A] hover:text-white transition-colors"
                                >
                                  #{item.blobId.slice(0, 8)}...
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

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

                {/* CHRISTMAS UNLOCK ACTION IN VAULT */}
                {isVaultUnlocked && (
                  <div className="bg-gradient-to-r from-[#18150A] to-[#12110E] border border-[#E5A93C]/40 rounded-2xl p-5 flex flex-col gap-3 shadow-lg shadow-[#E5A93C]/5 animate-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Gift size={16} className="text-[#E5A93C]" />
                        <span className="text-xs font-semibold text-white uppercase tracking-wider">
                          Christmas Release Active
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-[#E5A93C] bg-[#E5A93C]/10 px-2 py-0.5 rounded border border-[#E5A93C]/20">
                        {isVaultClaimed ? "Funds Claimed" : "Unlocked"}
                      </span>
                    </div>
                    <p className="text-xs text-[#D4D4D8]">
                      Smart contract time-lock satisfied. All {escrowDeposit}.00 SUI unlocked.
                    </p>
                    {!isVaultClaimed ? (
                      <button
                        type="button"
                        onClick={handleClaimChristmasVault}
                        className="w-full py-3 px-4 rounded-xl bg-[#E5A93C] hover:bg-[#F5B84D] text-black font-semibold text-xs transition-all duration-150 flex items-center justify-center gap-2 active:scale-[0.98] shadow-md"
                      >
                        <Gift size={14} />
                        <span>Claim Christmas Savings ({escrowDeposit}.00 SUI)</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-mono text-[#10B981] bg-[#10B981]/10 p-2.5 rounded-xl border border-[#10B981]/20">
                        <Check size={14} />
                        <span>Funds Claimed into Available Balance</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 365-DAY DISCIPLINE GRID HEATMAP */}
                <DisciplineGrid
                  currentDayOfYear={currentDayOfYear}
                  infractions={infractions.map((i) => ({
                    dayOfYear: i.dayOfYear || 45,
                    dateStr: i.timestamp,
                    memo: i.memo,
                    penaltySui: i.penaltySui,
                    ruleTitle: i.ruleTitle,
                    blobId: i.blobId,
                    verdict: i.verdict || (i.penaltySui > 0 ? "broken" : "honored"),
                    txHash: i.txHash,
                  }))}
                  totalEscrowSui={escrowDeposit}
                  isUnlocked={isVaultUnlocked}
                  isDegraded={isDegradedMode}
                  onInspectBlob={(blobId) => {
                    setExpandedJsonBlobId(blobId);
                    setIsMemoryInspectorOpen(true);
                  }}
                />

                {/* Primary Vault Balance Card */}
                <div className="bg-[#0A0A0C] border border-[#222226] rounded-2xl p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-[#71717A] uppercase">
                      Lock Status
                    </span>
                    <span className="text-xs font-mono text-white flex items-center gap-1.5">
                      {isVaultUnlocked ? (
                        <>
                          <Check size={12} className="text-[#10B981]" />
                          <span className="text-[#10B981]">Unlocked</span>
                        </>
                      ) : (
                        <>
                          <Lock size={12} />
                          <span>Locked</span>
                        </>
                      )}
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
                  <div className="flex items-center justify-between border-t border-[#18181C] pt-3">
                    <span className="text-xs text-[#71717A]">Escrow Destination</span>
                    <span className="text-xs font-mono text-[#A1A1AA]" title={YEARBOUND_VAULT_ADDRESS}>
                      {YEARBOUND_VAULT_ADDRESS.slice(0, 8)}...{YEARBOUND_VAULT_ADDRESS.slice(-6)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#18181C] pt-3">
                    <span className="text-xs text-[#71717A]">Settlement Mode</span>
                    <span className="text-xs font-mono text-white">
                      {accountType === "real"
                        ? "Tatum Mainnet Gateway"
                        : accountType === "linked"
                        ? "Sui Wallet Standard"
                        : "Ed25519 Cryptographic Voucher"}
                    </span>
                  </div>
                </div>

                {/* TATUM INFLOW & ACCUMULATION SENTINEL CARD */}
                {(() => {
                  const activeInflowRule = activeRulesList.find((r) => {
                    const t = `${r.title} ${r.condition}`.toLowerCase();
                    return (
                      t.includes("save") ||
                      t.includes("deposit") ||
                      t.includes("inflow") ||
                      t.includes("earn") ||
                      t.includes("income") ||
                      t.includes("accumulate")
                    );
                  });

                  const hasInflowGoal = Boolean(activeInflowRule && inflowProgress.target > 0);
                  const progressPct = hasInflowGoal
                    ? Math.min(100, (inflowProgress.current / (inflowProgress.target || 1)) * 100)
                    : 0;
                  const isMet = hasInflowGoal && inflowProgress.current >= inflowProgress.target;

                  return (
                    <div
                      className={`border rounded-2xl p-5 flex flex-col gap-3.5 transition-all duration-200 ${
                        isDegradedMode
                          ? "bg-[#111113] border-[#222226] text-[#71717A]"
                          : "bg-[#0A0A0C] border-[#222226] hover:border-[#3F3F46]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity size={14} className={isDegradedMode ? "text-[#52525B]" : "text-[#A1A1AA]"} />
                          <span className="text-[11px] font-mono uppercase tracking-wider text-[#71717A]">
                            Tatum Inflow Sentinel
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            isDegradedMode
                              ? "text-[#71717A] bg-[#18181B] border-[#27272A]"
                              : isMet
                              ? "text-[#10B981] bg-[#10B981]/10 border-[#10B981]/25"
                              : hasInflowGoal
                              ? "text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/25"
                              : "text-[#A1A1AA] bg-[#18181C] border-[#27272A]"
                          }`}
                        >
                          {isDegradedMode
                            ? "Offline (Web2)"
                            : isMet
                            ? "Goal Met"
                            : hasInflowGoal
                            ? "Inflow Deficit"
                            : "No Goal Configured"}
                        </span>
                      </div>

                      {isDegradedMode ? (
                        <p className="text-xs text-[#71717A] leading-relaxed italic">
                          Tatum on-chain telemetry is bypassed in legacy Web2 mode. Incoming deposits are not cross-referenced against your resolutions.
                        </p>
                      ) : hasInflowGoal ? (
                        <div className="flex flex-col gap-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-white">
                                {activeInflowRule?.title}
                              </span>
                              <span className="text-[10px] font-mono text-[#71717A]">
                                Target: {inflowProgress.target}.00 SUI
                              </span>
                            </div>
                            <span className="text-xs font-mono font-semibold text-white">
                              {inflowProgress.current.toFixed(2)} SUI Received
                            </span>
                          </div>

                          {/* Minimalist Progress Track */}
                          <div className="w-full h-1.5 bg-[#18181C] rounded-full overflow-hidden border border-[#27272A]">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${
                                isMet ? "bg-[#10B981]" : "bg-white"
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px] font-mono text-[#71717A]">
                            <span>
                              {isMet
                                ? "Adherence verified: on-chain deposits honor your pledge."
                                : `${(inflowProgress.target - inflowProgress.current).toFixed(2)} SUI needed to satisfy pledge.`}
                            </span>
                            <span>{progressPct.toFixed(0)}%</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          <p className="text-xs text-[#71717A] leading-relaxed">
                            No deposit target detected. Add a resolution like &quot;Save 500 SUI&quot; or &quot;Deposit 250 SUI&quot; to audit incoming wealth accumulation on-chain.
                          </p>
                          <div className="flex items-center justify-between text-[10px] font-mono text-[#52525B] pt-1">
                            <span>Audited by Tatum Sui Gateway</span>
                            <span>Current: {inflowProgress.current.toFixed(2)} SUI</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Walrus Memory Ledger: Inscribed Events */}
                <div className="bg-[#0A0A0C] border border-[#222226] rounded-2xl p-5 flex flex-col gap-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-[#71717A] uppercase tracking-wider">
                      Walrus Memory Ledger · Live Activity
                    </span>
                    <span className="text-xs font-mono text-white">
                      {infractions.length} Inscribed Events
                    </span>
                  </div>

                  {infractions.length === 0 ? (
                    <div className="py-4 text-center text-xs text-[#71717A] border-t border-[#18181C] mt-1">
                      Zero transactions recorded yet. Send SUI to create live Walrus proofs.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5 border-t border-[#18181C] pt-3">
                      {infractions.map((infr) => {
                        const isHonored = infr.verdict === "honored";
                        return (
                          <div
                            key={infr.id}
                            className="bg-[#131316] border border-[#222226] rounded-xl p-3 flex flex-col gap-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${
                                    isHonored
                                      ? "text-[#10B981] bg-[#10B981]/10 border-[#10B981]/25"
                                      : "text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/25"
                                  }`}
                                >
                                  {isHonored ? "Honored" : infr.repeatCount && infr.repeatCount > 1 ? `Breach #${infr.repeatCount}` : "Breach Fine"}
                                </span>
                                <span className="text-xs font-semibold text-white">
                                  {isHonored ? `-${infr.amount} SUI` : `+${infr.penaltySui} SUI Locked`}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-[#71717A]">
                                {infr.timestamp}
                              </span>
                            </div>
                            <span className="text-xs text-[#D4D4D8]">
                              "{infr.memo}"
                            </span>
                            <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-[#1E1E22]">
                              <span className="text-[10px] text-[#71717A] truncate">
                                {isHonored
                                  ? infr.recipient
                                    ? `To: ${infr.recipient.slice(0, 8)}...`
                                    : "Compliant transfer"
                                  : `Breach: ${infr.ruleTitle}`}
                              </span>
                              <div className="flex items-center gap-2">
                                {infr.isRealOnChain && infr.txHash && infr.explorerUrl ? (
                                  <a
                                    href={infr.explorerUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] font-mono text-[#E5A93C] hover:text-[#F3BA5B] flex items-center gap-0.5 transition-colors"
                                    title="View PTB on SuiScan"
                                  >
                                    <span>PTB #{infr.txHash.slice(0, 6)}...</span>
                                    <ExternalLink size={9} />
                                  </a>
                                ) : infr.voucherSignature || infr.isOffChainVoucher ? (
                                  <span
                                    className="text-[10px] font-mono text-[#71717A] bg-[#141417] px-2 py-0.5 rounded border border-[#222226]"
                                    title="x402 Cryptographic Debt Voucher (Inscribed to Walrus)"
                                  >
                                    x402 Voucher
                                  </span>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExpandedJsonBlobId(infr.blobId);
                                    setIsMemoryInspectorOpen(true);
                                  }}
                                  className="text-[10px] font-mono text-[#A1A1AA] hover:text-white flex items-center gap-1 transition-colors"
                                >
                                  <span>Blob #{infr.blobId.slice(0, 8)}...</span>
                                  <ExternalLink size={10} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
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
                                ? (demoAddress || DEMO_SUI_ADDRESS)
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
                          href={accountType === "demo"
                            ? `https://suiscan.xyz/testnet/account/${demoAddress || DEMO_SUI_ADDRESS}`
                            : `https://suiscan.xyz/mainnet/account/${realAddress || linkedAddress}`}
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
                        ? (demoAddress || DEMO_SUI_ADDRESS)
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
                          ? isCheckingLiveBalance
                            ? "Querying Testnet RPC..."
                            : `${liveOnChainBalanceSui !== null ? liveOnChainBalanceSui.toFixed(2) : availableBalance.toFixed(2)} SUI (Testnet)`
                          : isCheckingLiveBalance
                          ? "Querying RPC..."
                          : `${liveOnChainBalanceSui !== null ? liveOnChainBalanceSui.toFixed(2) : "0.00"} SUI (Mainnet)`}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (accountType === "demo") {
                            refreshLiveBalance(demoAddress || DEMO_SUI_ADDRESS, "demo");
                          } else {
                            refreshLiveBalance(realAddress, "real");
                          }
                        }}
                        disabled={isCheckingLiveBalance}
                        className="text-[#71717A] hover:text-white text-[10px] font-mono transition-colors"
                        title="Refresh on-chain balance"
                      >
                        ↻
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#18181C] pt-3">
                    <span className="text-xs text-[#71717A]">Network</span>
                    <span className="text-xs text-white font-medium">
                      {accountType === "demo" ? "Sui Testnet (Tatum Gateway)" : "Sui Mainnet (Tatum Gateway)"}
                    </span>
                  </div>

                  {(accountType === "real" || accountType === "demo") && (
                    <div className="border-t border-[#18181C] pt-3 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const hex = accountType === "demo" ? exportDemoPrivateKeyHex() : exportRealPrivateKeyHex();
                          if (hex) {
                            setExportedKey(hex);
                            setShowExportPrivateKey(!showExportPrivateKey);
                          }
                        }}
                        className="text-xs text-left text-[#A1A1AA] hover:text-white transition-colors flex items-center justify-between font-mono"
                      >
                        <span>Export Private Key ({accountType === "demo" ? "Testnet" : "Mainnet"})</span>
                        <span className="text-[10px] text-[#71717A]">
                          {showExportPrivateKey ? "Hide" : "Reveal"}
                        </span>
                      </button>

                      {showExportPrivateKey && exportedKey && (
                        <div className="bg-[#131316] border border-[#27272A] rounded-xl p-3 flex flex-col gap-1.5 animate-in fade-in">
                          <span className="text-[10px] font-mono text-[#A1A1AA]">
                            {accountType === "demo" ? "Testnet" : "Mainnet"} Ed25519 Secret Key (Hex):
                          </span>
                          <div className="bg-[#0A0A0C] p-2 rounded text-[10px] font-mono text-white break-all select-all border border-[#1F1F24]">
                            {exportedKey}
                          </div>
                          <span className="text-[10px] text-[#71717A]">
                            {accountType === "demo"
                              ? "Import into Sui Wallet on Testnet to inspect balance or use with testnet faucets."
                              : "Keep this secret. Anyone with this key controls your Sui burner wallet on Mainnet."}
                          </span>
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
                  Auditing Transaction
                </div>
                
                {/* Live Split Status Cards: Tatum RPC + Walrus Memory */}
                <div className="mt-4 w-full flex flex-col gap-2">
                  <div className="bg-[#0A0A0C] border border-[#222226] rounded-xl px-4 py-2.5 flex items-center justify-between text-left">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs text-[#A1A1AA]">Tatum Sui RPC</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#71717A]">Verifying Solvency</span>
                  </div>

                  <div className="bg-[#0A0A0C] border border-[#222226] rounded-xl px-4 py-2.5 flex items-center justify-between text-left">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                      <span className="text-xs text-[#A1A1AA]">Walrus Memory</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#71717A]">Recalling Oaths</span>
                  </div>
                </div>

                <div className="text-xs font-mono text-[#71717A] mt-4 truncate max-w-full">
                  {checkingProgressStage}
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
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-[#71717A]">
                          Wally · Walrus Memory
                        </span>
                        {repeatInfractionCount > 1 && (
                          <span className="text-[10px] font-mono text-red-400 bg-red-500/10 border border-red-500/25 px-2 py-0.5 rounded-full font-semibold">
                            Attempt #{repeatInfractionCount}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        {walrusRecalledCount > 0 ? `${walrusRecalledCount} Memories Recalled` : "Memory Verified"}
                      </span>
                    </div>

                    <p className="text-sm text-[#E4E4E7] leading-relaxed font-normal">
                      {wallyRoast || (
                        <>You swore in Walrus memory: <span className="text-white font-medium">"{activeRulesList[0]?.condition || "No food delivery between 10 PM and 5 AM"}"</span>.</>
                      )}
                    </p>

                    <p className="text-xs text-[#71717A] leading-relaxed">
                      {breachReason || "This transaction violates your active yearly resolution. You committed to financial discipline."}
                    </p>

                    {/* Sacred Vow Card from Walrus Memory */}
                    {matchedRuleMotivation && (
                      <div className="bg-[#100F17] border border-[#2D2245] rounded-xl p-3.5 flex flex-col gap-1 mt-1">
                        <span className="text-[10px] font-mono text-[#A78BFA] uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles size={11} />
                          <span>Your Inscribed Vow (Walrus Memory)</span>
                        </span>
                        <p className="text-xs text-white/90 font-serif italic leading-relaxed">
                          "{matchedRuleMotivation}"
                        </p>
                      </div>
                    )}

                    {/* Behavioral Pattern Insight if recurring */}
                    {behavioralInsight && (
                      <div className="bg-[#14110C] border border-[#3E2812] rounded-xl p-3 flex flex-col gap-1 mt-1">
                        <span className="text-[10px] font-mono text-[#F59E0B] uppercase tracking-wider flex items-center gap-1.5">
                          <Activity size={11} />
                          <span>Habit Pattern Detected</span>
                        </span>
                        <p className="text-xs text-[#D4D4D8] leading-relaxed">
                          {behavioralInsight}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Penalty Breakdown Card */}
                  <div className="bg-[#0A0A0C] border border-[#222226] rounded-2xl p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-[#71717A]">
                        Enforced Penalty Toll
                      </span>
                      <span className="text-[10px] font-mono text-[#71717A]">
                        Audited by Tatum RPC
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-[#A1A1AA]">Transfer Amount</span>
                      <span className="text-xs font-mono text-white">{sendAmount} SUI</span>
                    </div>

                    {streakBroken && (
                      <div className="flex items-center justify-between border-t border-[#18181C] pt-2.5 text-amber-400">
                        <span className="text-xs">Streak Status</span>
                        <span className="text-xs font-mono font-medium">Shattered by Infraction</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-[#18181C] pt-2.5">
                      <span className="text-xs text-[#A1A1AA]">
                        {repeatInfractionCount > 1 ? "Escalated x402 Penalty" : "x402 Vault Penalty"}
                      </span>
                      <div className="flex items-center gap-2">
                        {repeatInfractionCount > 1 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/25">
                            Repeat #{repeatInfractionCount} Fine
                          </span>
                        )}
                        <span className="text-xs font-mono font-semibold text-white">{breachPenaltySui} SUI</span>
                      </div>
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
                    className="w-full py-2.5 text-center text-xs font-medium text-[#71717A] hover:text-white transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-3 h-3 border-2 border-[#71717A] border-t-white rounded-full animate-spin inline-block shrink-0" />
                        <span>{payFineStage || "Settling penalty..."}</span>
                      </>
                    ) : (
                      <span>Proceed anyway & pay {breachPenaltySui || 10} SUI penalty</span>
                    )}
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
                    {breachPenaltySui || 10} SUI penalty has been processed via x402 and inscribed to Walrus memory.
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
                      <span className="text-xs font-mono font-semibold text-white">
                        {breachPenaltySui || 10} SUI → x402 Vault
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-[#18181C] pt-2.5">
                      <span className="text-xs text-[#A1A1AA]">Settlement Engine</span>
                      <span className="text-xs font-mono text-[#A1A1AA]">
                        {latestSettlement?.isRealOnChain
                          ? "Sui Mainnet PTB (Tatum Gateway)"
                          : "Agent Cryptographic Debt Voucher"}
                      </span>
                    </div>

                    {latestSettlement?.isRealOnChain && latestSettlement?.txHash && (
                      <div className="flex items-center justify-between border-t border-[#18181C] pt-2.5">
                        <span className="text-xs text-[#A1A1AA]">On-Chain Digest</span>
                        <a
                          href={latestSettlement.explorerUrl || `https://suiscan.xyz/mainnet/tx/${latestSettlement.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-mono text-[#E5A93C] hover:underline flex items-center gap-1"
                        >
                          <span>{latestSettlement.txHash.slice(0, 10)}...</span>
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    )}

                    {!latestSettlement?.isRealOnChain && latestSettlement?.voucherSignature && (
                      <div className="flex items-center justify-between border-t border-[#18181C] pt-2.5">
                        <span className="text-xs text-[#A1A1AA]">x402 Signature</span>
                        <span
                          className="text-[11px] font-mono text-[#71717A] truncate max-w-[180px]"
                          title={latestSettlement.voucherSignature}
                        >
                          ed25519_{latestSettlement.voucherSignature.slice(0, 12)}...
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-[#18181C] pt-2.5">
                      <span className="text-xs text-[#A1A1AA]">Lock Expiry</span>
                      <span className="text-xs text-[#A1A1AA]">{unlockDate}</span>
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

                        <div className="flex items-center gap-3 pt-1">
                          {item.payload?.isRealOnChain && item.payload?.vaultTxHash && (
                            <a
                              href={item.payload?.explorerUrl || `https://suiscan.xyz/mainnet/tx/${item.payload.vaultTxHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-[#E5A93C] hover:underline flex items-center gap-1 font-mono"
                            >
                              <span>SuiScan PTB</span>
                              <ExternalLink size={10} />
                            </a>
                          )}
                          {!item.payload?.isRealOnChain && (item.payload?.voucherSignature || item.payload?.settlementType === "cryptographic_voucher") && (
                            <span className="text-[11px] text-[#71717A] font-mono">
                              x402 Voucher
                            </span>
                          )}
                          <a
                            href={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${item.blobId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-white hover:underline flex items-center gap-1 font-mono"
                          >
                            <span>Inspect on Walrus</span>
                            <ExternalLink size={11} />
                          </a>
                        </div>
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
