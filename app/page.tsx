"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Database,
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
import { synthesizeWallyIntervention, paraphraseUserMotivation } from "@/lib/wally-synthesizer";
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

const PENALTY_PRESETS = [0.02, 0.05, 0.1, 0.2];
const AMOUNT_PRESETS = [0.01, 0.05, 0.1, 0.2];

const QUICK_MEMO_PICKS = [
  {
    label: "Late-night food delivery",
    text: "Late-night UberEats order at 1:30 AM",
    isFood: true,
  },
  {
    label: "Pack of cigarettes at corner store",
    text: "Pack of smokes and lighter at the 7-Eleven",
    isCigarettes: true,
  },
  {
    label: "Sending money to Sarah (Ex)",
    text: "Late-night apology transfer to Sarah (0x7a8b...9c01)",
    isEx: true,
  },
  {
    label: "Weekend parlay on DraftKings",
    text: "Deposit for Sunday NFL parlay on DraftKings",
    isBetting: true,
  },
  {
    label: "Grocery shopping (Compliant)",
    text: "Weekly groceries, produce, and meal prep ingredients",
    isCompliant: true,
  },
];

export default function YearboundApp() {
  const [step, setStep] = useState<-1 | 0 | 1 | 2 | 3 | 4>(-1);
  const [carouselIndex, setCarouselIndex] = useState<number>(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (diff > 40) {
      setCarouselIndex((prev) => (prev < 2 ? prev + 1 : 0));
    } else if (diff < -40) {
      setCarouselIndex((prev) => (prev > 0 ? prev - 1 : 2));
    }
    setTouchStartX(null);
  };

  // Auto-scroll features carousel every 4 seconds when on landing screen
  useEffect(() => {
    if (step !== -1) return;
    const interval = setInterval(() => {
      setCarouselIndex((prev) => (prev < 2 ? prev + 1 : 0));
    }, 4000);
    return () => clearInterval(interval);
  }, [step]);

  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);
  const [scrollContainerHeight, setScrollContainerHeight] = useState<number>(680);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (expandedRuleId && titleInputRef.current) {
      setTimeout(() => {
        titleInputRef.current?.focus();
        titleInputRef.current?.select();
      }, 60);
    }
  }, [expandedRuleId]);

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
      if (demo) {
        setDemoAddress(demo);
        refreshLiveBalance(demo, "demo");
      }
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

  // Screen 1: Rules (Prepopulated with authentic, human New Year's resolutions, 0.05 SUI default penalty & verified Walrus blobs)
  const [rules, setRules] = useState<RuleItem[]>([
    {
      id: "1",
      title: "Cut all ties with my ex",
      condition: "Never send any money to Sarah / 0x7a8b...9c01, no matter how lonely I get late at night",
      whyItMatters: "She moved on and I need to respect myself. Falling for late-night guilt texts always sets me back.",
      penalty: 0.05,
      breaches: 0,
      blobId: "walrus_blob_rule_sarah_01",
      category: "lifestyle",
      keywords: ["sarah", "money", "lonely", "night", "text", "ex"],
    },
    {
      id: "2",
      title: "Quit smoking for good",
      condition: "No buying cigarettes, vapes, or pods at the corner store or gas stations",
      whyItMatters: "I want to stop waking up coughing every morning and save money for my Japan trip.",
      penalty: 0.05,
      breaches: 0,
      blobId: "walrus_blob_rule_smoking_02",
      category: "lifestyle",
      keywords: ["cigarettes", "vapes", "pods", "smokes", "gas station", "7-eleven"],
    },
    {
      id: "3",
      title: "Keep my impulse spending in check",
      condition: "Keep non-essential shopping, clubbing, and random purchases under 150 SUI a month",
      whyItMatters: "I'm tired of feeling broke by the 20th of every month with nothing left for my future.",
      penalty: 0.05,
      breaches: 0,
      blobId: "walrus_blob_rule_spending_03",
      category: "finance",
      keywords: ["shopping", "clubbing", "clothes", "impulse", "non-essential"],
    },
    {
      id: "4",
      title: "Stop gambling on sports",
      condition: "Zero deposits into DraftKings, FanDuel, Stake, or online casino apps",
      whyItMatters: "Chasing losses ruined my mental health last year. The house always wins and I hate that gut-drop feeling.",
      penalty: 0.05,
      breaches: 0,
      blobId: "walrus_blob_rule_gambling_04",
      category: "finance",
      keywords: ["draftkings", "fanduel", "stake", "casino", "parlay", "bet", "wager"],
    },
    {
      id: "5",
      title: "No more late night takeout",
      condition: "No ordering DoorDash or UberEats past 10 PM on weeknights",
      whyItMatters: "I wake up feeling gross, sluggish, and $40 poorer every single time.",
      penalty: 0.05,
      breaches: 0,
      blobId: "walrus_blob_rule_takeout_05",
      category: "lifestyle",
      keywords: ["doordash", "ubereats", "takeout", "burger", "pizza", "food", "delivery", "late night"],
    },
  ]);
  const [showMotivationIds, setShowMotivationIds] = useState<Record<string, boolean>>({});

  // Screen 2: Escrow Settings
  const [escrowDeposit, setEscrowDeposit] = useState<number>(0);
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

  // Balances (Bound strictly to live on-chain Sui RPC, initialized to 0)
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [isRequestingFaucet, setIsRequestingFaucet] = useState<boolean>(false);

  // Walrus feedback & memory proofs
  const [walrusBlobId, setWalrusBlobId] = useState<string>("walrus_blob_genesis_manifest_pact_2026");
  const [showSnackbar, setShowSnackbar] = useState<boolean>(false);
  const [snackbarTitle, setSnackbarTitle] = useState<string>("Saved to Walrus");
  const [snackbarSubtitle, setSnackbarSubtitle] = useState<string>("");
  const [copiedBlob, setCopiedBlob] = useState<boolean>(false);
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);

  // Walrus Total Recall & Infraction state (Seeded with Genesis resolutions)
  const [infractions, setInfractions] = useState<InfractionRecord[]>([]);
  const [walrusBlobs, setWalrusBlobs] = useState<WalrusMemoryBlob[]>([
    {
      blobId: "walrus_blob_genesis_manifest_pact_2026",
      type: "commitment_pact",
      title: "Genesis Resolution Pact Manifest (Yearbound 2026)",
      timestamp: "Genesis",
      payload: {
        protocol: "Yearbound v1",
        storage: "Walrus Memory (MemWal)",
        type: "genesis_pact",
        pactId: "pact_primary_genesis",
        wallet: DEMO_SUI_ADDRESS,
        totalRules: 5,
        resolutions: [
          { index: 1, title: "Cut all ties with my ex", blobId: "walrus_blob_rule_sarah_01", penaltySui: 0.05 },
          { index: 2, title: "Quit smoking for good", blobId: "walrus_blob_rule_smoking_02", penaltySui: 0.05 },
          { index: 3, title: "Keep my impulse spending in check", blobId: "walrus_blob_rule_spending_03", penaltySui: 0.05 },
          { index: 4, title: "Stop gambling on sports", blobId: "walrus_blob_rule_gambling_04", penaltySui: 0.05 },
          { index: 5, title: "No more late night takeout", blobId: "walrus_blob_rule_takeout_05", penaltySui: 0.05 },
        ],
      },
    },
    {
      blobId: "walrus_blob_rule_sarah_01",
      type: "resolution_contract",
      title: "Resolution: Cut all ties with my ex",
      timestamp: "Genesis",
      payload: {
        protocol: "Yearbound v1",
        storage: "Walrus Memory (MemWal)",
        type: "commitment_rule",
        ruleId: "1",
        title: "Cut all ties with my ex",
        category: "lifestyle",
        penaltySui: 0.05,
        keywords: ["sarah", "money", "lonely", "night", "text", "ex"],
        behavioralRule: "Never send any money to Sarah / 0x7a8b...9c01, no matter how lonely I get late at night",
        why_it_matters: "She moved on and I need to respect myself. Falling for late-night guilt texts always sets me back.",
        wallyRoastAngle: "Remind user to respect their boundaries and that late-night transfers to Sarah only set them back.",
        status: "active",
      },
    },
    {
      blobId: "walrus_blob_rule_smoking_02",
      type: "resolution_contract",
      title: "Resolution: Quit smoking for good",
      timestamp: "Genesis",
      payload: {
        protocol: "Yearbound v1",
        storage: "Walrus Memory (MemWal)",
        type: "commitment_rule",
        ruleId: "2",
        title: "Quit smoking for good",
        category: "lifestyle",
        penaltySui: 0.05,
        keywords: ["cigarettes", "vapes", "pods", "smokes", "gas station", "7-eleven"],
        behavioralRule: "No buying cigarettes, vapes, or pods at the corner store or gas stations",
        why_it_matters: "I want to stop waking up coughing every morning and save money for my Japan trip.",
        wallyRoastAngle: "Call out coughing every morning and the Japan trip funds being burnt on tobacco.",
        status: "active",
      },
    },
    {
      blobId: "walrus_blob_rule_spending_03",
      type: "resolution_contract",
      title: "Resolution: Keep my impulse spending in check",
      timestamp: "Genesis",
      payload: {
        protocol: "Yearbound v1",
        storage: "Walrus Memory (MemWal)",
        type: "commitment_rule",
        ruleId: "3",
        title: "Keep my impulse spending in check",
        category: "finance",
        penaltySui: 0.05,
        keywords: ["shopping", "clubbing", "clothes", "impulse", "non-essential"],
        behavioralRule: "Keep non-essential shopping, clubbing, and random purchases under 150 SUI a month",
        why_it_matters: "I'm tired of feeling broke by the 20th of every month with nothing left for my future.",
        wallyRoastAngle: "Highlight the regret of feeling broke by the 20th and having zero future savings.",
        status: "active",
      },
    },
    {
      blobId: "walrus_blob_rule_gambling_04",
      type: "resolution_contract",
      title: "Resolution: Stop gambling on sports",
      timestamp: "Genesis",
      payload: {
        protocol: "Yearbound v1",
        storage: "Walrus Memory (MemWal)",
        type: "commitment_rule",
        ruleId: "4",
        title: "Stop gambling on sports",
        category: "finance",
        penaltySui: 0.05,
        keywords: ["draftkings", "fanduel", "stake", "casino", "parlay", "bet", "wager"],
        behavioralRule: "Zero deposits into DraftKings, FanDuel, Stake, or online casino apps",
        why_it_matters: "Chasing losses ruined my mental health last year. The house always wins and I hate that gut-drop feeling.",
        wallyRoastAngle: "Point out chasing losses, gut-drop feeling, and that the house always wins.",
        status: "active",
      },
    },
    {
      blobId: "walrus_blob_rule_takeout_05",
      type: "resolution_contract",
      title: "Resolution: No more late night takeout",
      timestamp: "Genesis",
      payload: {
        protocol: "Yearbound v1",
        storage: "Walrus Memory (MemWal)",
        type: "commitment_rule",
        ruleId: "5",
        title: "No more late night takeout",
        category: "lifestyle",
        penaltySui: 0.05,
        keywords: ["doordash", "ubereats", "takeout", "burger", "pizza", "food", "delivery", "late night"],
        behavioralRule: "No ordering DoorDash or UberEats past 10 PM on weeknights",
        why_it_matters: "I wake up feeling gross, sluggish, and $40 poorer every single time.",
        wallyRoastAngle: "Remind user that late night delivery makes them wake up gross, sluggish, and poorer.",
        status: "active",
      },
    },
  ]);
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
  const [newRulePenalty, setNewRulePenalty] = useState<number>(0.05);
  const [isCommittingNewRule, setIsCommittingNewRule] = useState<boolean>(false);

  // =========================================================================
  // SEND FLOW STATE
  // =========================================================================
  const [isSendOpen, setIsSendOpen] = useState<boolean>(false);
  const [sendSubStep, setSendSubStep] = useState<SendSubStep>("amount");
  const [sendAmount, setSendAmount] = useState<string>("0.05");
  const [sendRecipient, setSendRecipient] = useState<string>("0x8f4c...cafe");
  const [sendMemo, setSendMemo] = useState<string>("");
  const [breachReason, setBreachReason] = useState<string>("");
  const [wallyRoast, setWallyRoast] = useState<string>("");
  const [breachPenaltySui, setBreachPenaltySui] = useState<number>(0.05);
  const [matchedRuleTitle, setMatchedRuleTitle] = useState<string>("");
  const [checkingProgressStage, setCheckingProgressStage] = useState<string>("Connecting to Tatum & Walrus...");
  const [walrusRecalledCount, setWalrusRecalledCount] = useState<number>(0);
  const [repeatInfractionCount, setRepeatInfractionCount] = useState<number>(1);
  const [streakBroken, setStreakBroken] = useState<boolean>(false);
  const [behavioralInsight, setBehavioralInsight] = useState<string>("");
  const [matchedRuleMotivation, setMatchedRuleMotivation] = useState<string>("");
  const [matchedRuleBlobId, setMatchedRuleBlobId] = useState<string>("");
  const [matchedRuleCondition, setMatchedRuleCondition] = useState<string>("");

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
        setAvailableBalance(data.balanceSui);
      }
    } catch (err) {
      console.warn("Failed to query live balance:", err);
    } finally {
      setIsCheckingLiveBalance(false);
    }
  };

  // Request 1.00 SUI Testnet Gas from the official PoW faucet
  const handleRequestFaucet = async (targetAddr?: string) => {
    const addr = targetAddr || (demoAddress || DEMO_SUI_ADDRESS);
    setIsRequestingFaucet(true);
    triggerSnackbar("Requesting Faucet Gas", "Solving PoW challenge & depositing 1 SUI on Testnet...");
    try {
      const res = await fetch("/api/sui/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr, network: "testnet" }),
      });
      const data = await res.json();
      if (data.success) {
        triggerSnackbar("Faucet Success (+1.00 SUI)", `Tx: ${data.digest.slice(0, 10)}...`);
        await refreshLiveBalance(addr, "demo");
      } else {
        triggerSnackbar("Faucet Notice", data.error || "Please wait before requesting again");
      }
    } catch {
      triggerSnackbar("Faucet Notice", "Faucet request timed out or rate-limited. Please retry shortly.");
    } finally {
      setIsRequestingFaucet(false);
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
              condition: r.behavioral_rule || r.condition || "",
              whyItMatters: r.why_it_matters || "",
              penalty: r.penalty_amount_sui || 0.05,
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
      { id: newId, title: "", condition: "", whyItMatters: "", penalty: 0.05, breaches: 0 },
    ]);
    setExpandedRuleId(newId);
  };

  const handleCloseActiveRule = () => {
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

  const isStep2Valid =
    rules.length > 0 &&
    rules
      .filter((r) => r.title.trim().length > 0)
      .every((r) => typeof r.penalty === "number" && r.penalty > 0);

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
    setSealingProgress(20);
    setSealingStage("Analyzing resolutions with Gemini...");
    const t1 = setTimeout(() => {
      setSealingProgress(55);
      setSealingStage("Committing to Walrus Memory...");
    }, 900);
    const t2 = setTimeout(() => {
      setSealingProgress(85);
      setSealingStage("Locking x402 vault...");
    }, 2200);

    try {
      const activeRules = rules.filter((r) => r.title.trim().length > 0);
      const activeAccountAddress =
        accountType === "demo"
          ? (demoAddress || DEMO_SUI_ADDRESS)
          : accountType === "real"
          ? realAddress
          : linkedAddress || (demoAddress || DEMO_SUI_ADDRESS);

      let data: any = null;

      try {
        const res = await fetch("/api/walrus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(30000),
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
        }
      } catch (fetchErr) {
        console.warn(`[Vault] Submission notice:`, fetchErr);
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
              const matched = data.blobs.find(
                (b: any) =>
                  String(b.ruleId) === String(r.id) ||
                  (b.title && r.title && b.title.toLowerCase() === r.title.toLowerCase())
              );
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

        // Execute real on-chain deposit to x402 Move vault on Sui
        try {
          const privateKey =
            accountType === "demo"
              ? (exportDemoPrivateKeyHex() || undefined)
              : accountType === "real"
              ? (exportRealPrivateKeyHex() || undefined)
              : undefined;

          const vaultRes = await executeX402VaultDeposit({
            amountSui: 0.20,
            reason: "Genesis Commitment Pledge",
            commitmentId: "pact_primary",
            walletMode: accountType,
            privateKeySecret: privateKey,
            senderAddress: activeAccountAddress,
          });
          setEscrowDeposit(0.20);
          await refreshLiveBalance(activeAccountAddress, accountType);
        } catch (vaultDepositErr) {
          console.warn("[x402 Genesis Vault] Real deposit notice:", vaultDepositErr);
          setEscrowDeposit(0.20);
        }

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
      setNewRulePenalty(0.05);
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
    setSendAmount("0.05");
    setSendRecipient("");
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
        await refreshLiveBalance(activeAccountAddress, accountType);
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
        setBreachPenaltySui(0.05);
        setWalrusRecalledCount(0);
        setRepeatInfractionCount(1);
        setStreakBroken(false);
        setBehavioralInsight("Legacy Banking Notice: Cross-session pattern synthesis unavailable. Transaction history will not carry over.");
        setSendSubStep("breach");
      }, 900);
      return;
    }

    setSendSubStep("checking");
    setCheckingProgressStage("Auditing transaction...");

    const stageTimer1 = setTimeout(() => {
      setCheckingProgressStage("Checking Tatum Sui RPC...");
    }, 800);

    const stageTimer2 = setTimeout(() => {
      setCheckingProgressStage("Checking Walrus Memory...");
    }, 1600);

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
      clearTimeout(stageTimer2);

      if (data && data.success) {
        setBreachReason(data.reason || "");
        setWallyRoast(data.wallyRoast || "");
        setMatchedRuleTitle(data.matchedRule || "New Year's Resolution");
        setBreachPenaltySui(data.penaltySui || 0.05);
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
              recommended_intervention: `Escalated fine to ${data.penaltySui || 0.08} SUI. Enforcing strict transfer curfew.`,
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
        setMatchedRuleMotivation(data.motivation || matchedRuleObj?.whyItMatters || "");
        setMatchedRuleCondition(matchedRuleObj?.condition || "");
        setMatchedRuleBlobId(data.matchedRuleBlobId || matchedRuleObj?.blobId || walrusBlobId || "");
        if (data.wallyRoast) {
          setWallyRoast(data.wallyRoast);
        }

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

  // Handle Penalty Payment when Breach is Accepted via x402 Protocol & Execute Transfer
  const handlePayFineAndProceed = async () => {
    setIsSubmitting(true);
    setPayFineStage("Settling fine via x402...");

    // Safety timeout: guarantees button never stays stuck in loading
    const safetyTimer = setTimeout(() => {
      console.warn("[Fine Settlement] Safety timeout triggered, auto-advancing");
      setIsSubmitting(false);
      setPayFineStage("");
      setSendSubStep("penalty_recorded");
    }, 12000);

    try {
      const penaltyAmt = breachPenaltySui || 0.05;
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

      // 2. Execute the actual purchase / transfer to the recipient!
      setPayFineStage("Sending SUI to recipient...");
      let recipientTxHash: string | undefined = undefined;
      let recipientExplorerUrl: string | undefined = undefined;
      if (transferAmt > 0 && sendRecipient) {
        try {
          const ptbRes = await fetch("/api/sui-transfer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(6000),
            body: JSON.stringify({
              senderAddress: activeAccountAddress,
              recipientAddress: sendRecipient,
              amountSui: transferAmt,
              walletMode: accountType,
              privateKeySecret,
            }),
          });
          const ptbData = await ptbRes.json();
          if (ptbData?.digest) {
            recipientTxHash = ptbData.digest;
            recipientExplorerUrl = ptbData.explorerUrl;
            console.log("[Breach Transfer] Real Sui PTB transfer completed:", ptbData.digest);
          }
        } catch (tErr) {
          console.warn("[Breach Transfer] Transfer dispatch notice:", tErr);
        }
      }

      setPayFineStage("Inscribing to Walrus memory...");

      // 3. Persist Accountability Event Blob to Walrus Mainnet with verified tx hash / voucher
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
        txHash: recipientTxHash || txHash,
        explorerUrl: recipientExplorerUrl || explorerUrl,
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
          transferAmountSui: transferAmt,
          recipient: sendRecipient,
          settlementType,
          isRealOnChain,
          vaultTxHash: txHash || null,
          recipientTxHash: recipientTxHash || null,
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
        prev.map((r) =>
          r.title.toLowerCase() === (matchedRuleTitle || "").toLowerCase()
            ? { ...r, breaches: (r.breaches || 0) + 1 }
            : r
        )
      );
      setAvailableBalance((prev) => Math.max(0, prev - penaltyAmt - transferAmt));
      setEscrowDeposit((prev) => prev + penaltyAmt);
      refreshLiveBalance(activeAccountAddress, accountType);
      setLatestFineBlobId(fineBlobId);
      clearTimeout(safetyTimer);
      setSendSubStep("penalty_recorded");
    } catch {
      // Graceful fallback so demo never gets blocked
      const fallbackBlobId = `blob_infr_${Date.now().toString(36)}`;
      setLatestFineBlobId(fallbackBlobId);
      setSendSubStep("penalty_recorded");
    } finally {
      clearTimeout(safetyTimer);
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
  // Handler for Demo-Only 12-Month Time Travel Scrubber (Strictly Idempotent)
  const handleMilestoneChange = async (milestone: TimeMilestone) => {
    setActiveMilestone(milestone);

    // 1. Preserve all user-initiated manual transactions
    const userTransactions = infractions.filter((i) => i.source === "user");
    const userPenaltySum = userTransactions.reduce((acc, i) => acc + (i.verdict === "honored" ? 0 : i.penaltySui), 0);

    const primaryRule = activeRulesList[0] || rules[0] || {
      id: "1",
      title: "Personal Discipline",
      condition: "Maintain New Year commitments",
      penalty: 0.05,
      whyItMatters: "Self growth",
    };
    const secondaryRule = activeRulesList[1] || rules[1] || primaryRule;

    const activeAccountAddress =
      accountType === "demo"
        ? (demoAddress || DEMO_SUI_ADDRESS)
        : accountType === "real"
        ? realAddress
        : linkedAddress || (demoAddress || DEMO_SUI_ADDRESS);

    const privateKey =
      accountType === "demo"
        ? (exportDemoPrivateKeyHex() || undefined)
        : accountType === "real"
        ? (exportRealPrivateKeyHex() || undefined)
        : undefined;

    if (milestone === "jan1") {
      setCurrentDateStr("Thursday, Jan 1, 2026");
      setCurrentDayOfYear(1);
      setEscrowDeposit(0.20 + userPenaltySum);
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
        const penalty = primaryRule.penalty || 0.05;
        const memo = getDynamicResolutionMemo(primaryRule, "first");

        let txHash: string | undefined = undefined;
        let explorerUrl: string | undefined = undefined;
        let isRealOnChain = false;

        // Execute real on-chain deposit to x402 Move vault on Sui Testnet
        try {
          const x402Result = await executeX402VaultDeposit({
            amountSui: penalty,
            reason: `Time Travel Feb 14: Breach on ${primaryRule.title}`,
            commitmentId: "pact_primary",
            walletMode: accountType,
            privateKeySecret: privateKey,
            senderAddress: activeAccountAddress,
          });
          txHash = x402Result.txHash;
          explorerUrl = x402Result.explorerUrl;
          isRealOnChain = x402Result.isRealOnChain;
          refreshLiveBalance(activeAccountAddress, accountType);
        } catch (depositErr) {
          console.warn("[Time Travel Feb 14] Vault deposit notice:", depositErr);
        }

        // Inscribe once to Walrus Memory with verified tx hash
        let blobId = `blob_walrus_feb14_${Date.now().toString(36)}`;
        if (!loggedMilestonesToWalrusRef.current.has("feb14")) {
          loggedMilestonesToWalrusRef.current.add("feb14");
          try {
            const wRes = await fetch("/api/walrus", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: AbortSignal.timeout(4500),
              body: JSON.stringify({
                type: "accountability_event",
                commitment_id: "pact_primary",
                rule_id: primaryRule.id,
                rule_title: primaryRule.title,
                verdict: "broken",
                user_explanation: memo,
                penalty_deposited_sui: penalty,
                vault_tx_hash: txHash,
                is_real_on_chain: isRealOnChain,
                explorer_url: explorerUrl,
                wallet_address: activeAccountAddress,
              }),
            });
            const wData = await wRes.json();
            if (wData?.blobId) {
              blobId = wData.blobId;
            }
          } catch (e) {
            console.warn("[Walrus Demo] Feb 14 log notice:", e);
          }
        }

        const record: InfractionRecord = {
          id: "milestone_feb14",
          ruleTitle: primaryRule.title,
          ruleCondition: primaryRule.condition,
          amount: "0.05",
          memo,
          timestamp: "Feb 14, 11:30 PM",
          penaltySui: penalty,
          blobId,
          dayOfYear: 45,
          verdict: "broken",
          source: "timeline",
          txHash,
          explorerUrl,
          isRealOnChain,
        };
        febInfrs = [record];
        milestoneCacheRef.current.set("feb14", febInfrs);

        const febBlob: WalrusMemoryBlob = {
          blobId,
          type: "accountability_event",
          title: `Milestone Feb 14: ${primaryRule.title}`,
          timestamp: "Feb 14, 11:30 PM",
          payload: {
            protocol: "Yearbound v1",
            storage: "Walrus Memory (MemWal)",
            type: "accountability_event",
            verdict: "broken",
            userMemo: memo,
            penaltyDepositedSui: penalty,
            vaultTxHash: txHash || null,
            isRealOnChain,
            explorerUrl: explorerUrl || null,
            breachedResolution: primaryRule.title,
            dayOfYear: 45,
            timestamp: new Date().toISOString(),
          },
        };
        setWalrusBlobs((prev) => [febBlob, ...prev.filter((b) => b.blobId !== blobId)]);
      }

      const totalFines = febInfrs.reduce((acc, i) => acc + i.penaltySui, 0);
      setEscrowDeposit(0.20 + totalFines + userPenaltySum);
      setInfractions([...userTransactions, ...febInfrs]);
      triggerSnackbar(
        "Time Travel: Feb 14 (1st Breach)",
        `Breached '${primaryRule.title}' · ${(primaryRule.penalty || 0.05).toFixed(2)} SUI fine locked via x402`
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
        // Retrieve or prepare Feb 14 record
        let febRecord: InfractionRecord;
        const cachedFeb = milestoneCacheRef.current.get("feb14");
        if (cachedFeb && cachedFeb[0]) {
          febRecord = cachedFeb[0];
        } else {
          const p1 = primaryRule.penalty || 0.05;
          const memo1 = getDynamicResolutionMemo(primaryRule, "first");
          let txHash1: string | undefined = undefined;
          let explorerUrl1: string | undefined = undefined;
          let isReal1 = false;
          try {
            const x1 = await executeX402VaultDeposit({
              amountSui: p1,
              reason: `Time Travel Feb 14: Breach on ${primaryRule.title}`,
              commitmentId: "pact_primary",
              walletMode: accountType,
              privateKeySecret: privateKey,
              senderAddress: activeAccountAddress,
            });
            txHash1 = x1.txHash;
            explorerUrl1 = x1.explorerUrl;
            isReal1 = x1.isRealOnChain;
          } catch {}

          febRecord = {
            id: "milestone_feb14",
            ruleTitle: primaryRule.title,
            ruleCondition: primaryRule.condition,
            amount: "0.05",
            memo: memo1,
            timestamp: "Feb 14, 11:30 PM",
            penaltySui: p1,
            blobId: `blob_walrus_feb14_${Date.now().toString(36)}`,
            dayOfYear: 45,
            verdict: "broken",
            source: "timeline",
            txHash: txHash1,
            explorerUrl: explorerUrl1,
            isRealOnChain: isReal1,
          };
          milestoneCacheRef.current.set("feb14", [febRecord]);
        }

        const p1 = primaryRule.penalty || 0.05;
        const p2 = secondaryRule.penalty || 0.05;
        const mayMemo = getDynamicResolutionMemo(secondaryRule, "repeat");
        const julMemo = getDynamicResolutionMemo(primaryRule, "summer");

        // Execute real on-chain deposit for the Jul 20 relapse
        let txHash3: string | undefined = undefined;
        let explorerUrl3: string | undefined = undefined;
        let isReal3 = false;
        try {
          const x3 = await executeX402VaultDeposit({
            amountSui: p1,
            reason: `Time Travel Jul 20: Relapse on ${primaryRule.title}`,
            commitmentId: "pact_primary",
            walletMode: accountType,
            privateKeySecret: privateKey,
            senderAddress: activeAccountAddress,
          });
          txHash3 = x3.txHash;
          explorerUrl3 = x3.explorerUrl;
          isReal3 = x3.isRealOnChain;
          refreshLiveBalance(activeAccountAddress, accountType);
        } catch (depositErr) {
          console.warn("[Time Travel Jul 20] Vault deposit notice:", depositErr);
        }

        let blobId3 = `blob_walrus_jul20_${Date.now().toString(36)}`;
        if (!loggedMilestonesToWalrusRef.current.has("jul20")) {
          loggedMilestonesToWalrusRef.current.add("jul20");
          try {
            const wRes3 = await fetch("/api/walrus", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: AbortSignal.timeout(4500),
              body: JSON.stringify({
                type: "accountability_event",
                commitment_id: "pact_primary",
                rule_id: primaryRule.id,
                rule_title: primaryRule.title,
                verdict: "broken",
                user_explanation: julMemo,
                penalty_deposited_sui: p1,
                vault_tx_hash: txHash3,
                is_real_on_chain: isReal3,
                explorer_url: explorerUrl3,
                wallet_address: activeAccountAddress,
              }),
            });
            const wData3 = await wRes3.json();
            if (wData3?.blobId) {
              blobId3 = wData3.blobId;
            }
          } catch (e) {
            console.warn("[Walrus Demo] Jul 20 log notice:", e);
          }
        }

        const record2: InfractionRecord = {
          id: "milestone_may15",
          ruleTitle: secondaryRule.title,
          ruleCondition: secondaryRule.condition,
          amount: "0.05",
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
          amount: "0.05",
          memo: julMemo,
          timestamp: "Jul 20, 12:15 AM",
          penaltySui: p1,
          blobId: blobId3,
          dayOfYear: 201,
          verdict: "broken",
          source: "timeline",
          txHash: txHash3,
          explorerUrl: explorerUrl3,
          isRealOnChain: isReal3,
        };

        summerInfrs = [record3, record2, febRecord];
        milestoneCacheRef.current.set("jul20", summerInfrs);
        milestoneCacheRef.current.set("dec25", summerInfrs);

        const julBlob: WalrusMemoryBlob = {
          blobId: blobId3,
          type: "accountability_event",
          title: `Milestone Jul 20: ${primaryRule.title}`,
          timestamp: "Jul 20, 12:15 AM",
          payload: {
            protocol: "Yearbound v1",
            storage: "Walrus Memory (MemWal)",
            type: "accountability_event",
            verdict: "broken",
            userMemo: julMemo,
            penaltyDepositedSui: p1,
            vaultTxHash: txHash3 || null,
            isRealOnChain: isReal3,
            explorerUrl: explorerUrl3 || null,
            breachedResolution: primaryRule.title,
            dayOfYear: 201,
            timestamp: new Date().toISOString(),
          },
        };
        setWalrusBlobs((prev) => [julBlob, ...prev.filter((b) => b.blobId !== blobId3)]);
      }

      const totalFines = summerInfrs.reduce((acc, i) => acc + i.penaltySui, 0);
      setEscrowDeposit(0.20 + totalFines + userPenaltySum);
      setInfractions([...userTransactions, ...summerInfrs]);

      if (isChristmas) {
        triggerSnackbar(
          "🎅 Time Travel: Dec 25 (Christmas Unlock)",
          `Move vault time-lock mature! Claim your ${(0.20 + totalFines + userPenaltySum).toFixed(2)} SUI savings.`
        );
      } else {
        triggerSnackbar(
          "Time Travel: Jul 20 (Habit Pattern)",
          `Walrus synthesis: 3 breaches across '${primaryRule.title}' · ${totalFines.toFixed(2)} SUI in vault`
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
      `+${claimedAmt.toFixed(2)} SUI released from Sui Move contract into wallet.`
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
        {/* Global App Background Image (for Sign In & the rest of the app: pure starry sky, no dark overlay) */}
        {step >= 0 && (
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
            <img
              src="/assets/bg/starry_sky.png"
              alt="Starry Night Sky"
              className="w-full h-full object-cover object-center select-none"
              draggable={false}
            />
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
            SCREEN -1: PRODUCT FEATURES CAROUSEL (Minimalist Auto-scrolling)
            ================================================================== */}
        {step === -1 && (
          <div
            className="relative flex-1 flex flex-col justify-between overflow-hidden animate-in fade-in duration-200 select-none"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Background artwork for slide 0 ("Keep your financial resolve all year round with Yearbound") */}
            <div
              className={`absolute inset-0 z-0 pointer-events-none overflow-hidden transition-opacity duration-300 ease-out ${
                carouselIndex === 0 ? "opacity-100" : "opacity-0"
              }`}
            >
              <img
                src="/assets/onboarding/walrus_bench.png"
                alt="Walrus holding sparkler under starry midnight sky"
                className="w-full h-full object-cover object-center select-none"
                draggable={false}
              />
            </div>

            {/* Background artwork for slide 1 ("Wally agent uses Walrus memory to keep you to your resolutions") */}
            <div
              className={`absolute inset-0 z-0 pointer-events-none overflow-hidden transition-opacity duration-300 ease-out ${
                carouselIndex === 1 ? "opacity-100" : "opacity-0"
              }`}
            >
              <img
                src="/assets/onboarding/walrus_memory.png"
                alt="Walrus reading Memory book under autumn night sky"
                className="w-full h-full object-cover object-center select-none"
                draggable={false}
              />
            </div>

            {/* Background artwork for slide 2 ("Penalties are locked in a x402 vault using Tatum") */}
            <div
              className={`absolute inset-0 z-0 pointer-events-none overflow-hidden transition-opacity duration-300 ease-out ${
                carouselIndex === 2 ? "opacity-100" : "opacity-0"
              }`}
            >
              <img
                src="/assets/onboarding/walrus_vault.png"
                alt="Walrus with locked on-chain vault in winter snow"
                className="w-full h-full object-cover object-center select-none"
                draggable={false}
              />
            </div>

            {/* Top Bar: Header Title (Editorial typography in #ebaf64 with wider letter spacing and relaxed line height) */}
            <div className="relative z-10 pt-10 sm:pt-12 px-7 pb-4 flex flex-col shrink-0">
              <div className="text-[30px] sm:text-[34px] font-bold tracking-[0.02em] leading-[1.24] text-[#ebaf64] transition-all duration-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
                {carouselIndex === 0 && "Keep your financial resolve all year round with Yearbound"}
                {carouselIndex === 1 && "Wally agent uses Walrus memory to keep you to your resolutions"}
                {carouselIndex === 2 && "Penalties are locked in a x402 vault using Tatum"}
              </div>
            </div>

            {/* Middle Space (Pure centered artwork across all 3 carousel slides) */}
            <div className="relative z-10 flex-1 px-7 py-3 min-h-0 pointer-events-none" />

            {/* Bottom Actions: Center Progress Ring + Fully Rounded Liquid Glass CTAs */}
            <div className="relative z-10 p-7 pt-2 pb-8 sm:pb-9 shrink-0 flex flex-col items-center gap-3">
              {/* Progress Indicator Ring (Centered directly above Create a pact button, no numbers inside) */}
              <div
                onClick={() => setCarouselIndex((prev) => (prev < 2 ? prev + 1 : 0))}
                className="relative inline-flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-transform duration-150 py-1"
                title={`Slide ${carouselIndex + 1} of 3 · Tap to advance`}
              >
                <svg width={32} height={32} className="transform -rotate-90">
                  <circle
                    cx={16}
                    cy={16}
                    r={13}
                    stroke="rgba(235, 175, 100, 0.25)"
                    strokeWidth={2.5}
                    fill="none"
                  />
                  <circle
                    cx={16}
                    cy={16}
                    r={13}
                    stroke="#ebaf64"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={2 * Math.PI * 13}
                    strokeDashoffset={
                      2 * Math.PI * 13 -
                      ((carouselIndex + 1) / 3) * (2 * Math.PI * 13)
                    }
                    className="transition-all duration-500 ease-out"
                  />
                </svg>
              </div>

              {/* Primary CTA: Create a pact (Thin outline, background displays the blurred image underneath) */}
              <button
                type="button"
                onClick={() => setStep(1)}
                className="relative w-full py-4 px-6 rounded-full overflow-hidden transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] group bg-black/10 hover:bg-black/20 backdrop-blur-2xl border border-[#ebaf64]/25 hover:border-[#ebaf64]/50 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
              >
                <span className="relative z-10 text-[#ebaf64] font-semibold text-sm tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  Create a pact
                </span>
                <ArrowRight size={16} className="relative z-10 text-[#ebaf64] stroke-[2.2] group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Secondary CTA: Sign in to existing (Matching Dark Glass Pill) */}
              <button
                type="button"
                onClick={() => setStep(0)}
                className="w-full py-3.5 px-6 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/10 hover:border-[#ebaf64]/40 text-[#ebaf64]/80 hover:text-[#ebaf64] font-medium text-xs transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <span>Sign in to existing pact</span>
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================
            SCREEN 0: SIGN IN & RESTORE MEMORY GATEWAY
            ================================================================== */}
        {step === 0 && (
          <div className="relative z-10 flex-1 flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
            {/* Header */}
            <div className="pt-8 sm:pt-10 px-7 pb-4 flex flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setStep(-1)}
                className="self-start text-[#ebaf64]/75 hover:text-[#ebaf64] flex items-center gap-1.5 text-xs font-medium transition-colors active:scale-95"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
              <div className="text-[30px] sm:text-[34px] font-bold tracking-[0.02em] leading-tight text-[#ebaf64]">
                Sign in
              </div>
            </div>

            {/* Main Action Cards (Dark Blur Glass, text in #ebaf64, concise & clean) */}
            <div className="flex-1 overflow-y-auto px-7 py-2 flex flex-col gap-4 pb-4 overscroll-contain">
              {/* Option 1: Connect Sui Wallet */}
              <div
                onClick={handleConnectExtensionAndEnter}
                className="bg-black/20 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 flex flex-col gap-3 cursor-pointer transition-all duration-200 active:scale-[0.99] border border-[#ebaf64]/25 hover:border-[#ebaf64]/50 shadow-[0_8px_32px_rgba(0,0,0,0.4)] group"
              >
                <div className="flex items-center justify-between">
                  <div className="text-base font-semibold text-[#ebaf64] tracking-[-0.01em]">
                    Connect wallet
                  </div>
                  <div className="text-xs font-mono text-[#ebaf64]/80 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>{isConnectingExtension ? "Connecting..." : "Connect"}</span>
                    <ArrowRight size={14} />
                  </div>
                </div>

                {linkedAddress && (
                  <div className="pt-2 border-t border-[#ebaf64]/15 flex items-center justify-between text-xs font-mono text-[#ebaf64]/80">
                    <span>Connected</span>
                    <span>{linkedAddress.slice(0, 6)}...{linkedAddress.slice(-4)}</span>
                  </div>
                )}
              </div>

              {/* Option 2: Restore from Walrus (Dark Blur, no divider line in extended state) */}
              <div
                onClick={() => setShowRestoreInput((prev) => !prev)}
                className={`bg-black/20 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 flex flex-col gap-3.5 cursor-pointer transition-all duration-200 border shadow-[0_8px_32px_rgba(0,0,0,0.4)] ${
                  showRestoreInput ? "border-[#ebaf64]/50" : "border-[#ebaf64]/25 hover:border-[#ebaf64]/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-base font-semibold text-[#ebaf64] tracking-[-0.01em]">
                    Restore from Walrus
                  </div>
                  <div className="text-xs font-mono text-[#ebaf64]/80 flex items-center gap-1">
                    <span>{showRestoreInput ? "Close" : "Enter ID"}</span>
                    {showRestoreInput ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </div>

                {showRestoreInput && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex flex-col gap-3 pt-1 animate-in fade-in"
                  >
                    <input
                      type="text"
                      placeholder="0x... or blob_..."
                      value={restoreInput}
                      onChange={(e) => setRestoreInput(e.target.value)}
                      className="w-full bg-black/30 border border-[#ebaf64]/30 rounded-2xl px-4 py-3 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-[#ebaf64]"
                    />
                    <button
                      type="button"
                      onClick={handleDirectRestore}
                      disabled={isRestoring || !restoreInput.trim()}
                      className="py-3 px-4 rounded-full bg-black/40 hover:bg-black/60 border border-[#ebaf64]/40 text-[#ebaf64] font-semibold text-xs transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 active:scale-[0.98] shadow-md backdrop-blur-xl"
                    >
                      <span>{isRestoring ? "Recalling from Walrus..." : "Restore Memory"}</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom: Or create a new pact */}
            <div className="p-7 pt-2 pb-8 sm:pb-9 shrink-0 flex flex-col items-center">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full py-3.5 px-6 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-[#ebaf64]/30 hover:border-[#ebaf64]/60 text-[#ebaf64] font-medium text-xs transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <span>Or create a new pact</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================
            SCREEN 1: RESOLUTION BUILDER (Accordion - Single Expanded Rule)
            ================================================================== */}
        {step === 1 && (
          <div
            onClick={handleCloseActiveRule}
            className="relative z-10 flex-1 flex flex-col justify-between overflow-hidden animate-in fade-in duration-200 cursor-default"
          >
            {/* Header */}
            <div
              onClick={handleCloseActiveRule}
              className="pt-8 sm:pt-10 px-7 pb-4 shrink-0 flex flex-col gap-2"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setStep(-1);
                }}
                className="self-start text-[#ebaf64]/75 hover:text-[#ebaf64] flex items-center gap-1.5 text-xs font-medium transition-colors active:scale-95"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
              <div className="text-[28px] sm:text-[32px] font-bold tracking-[0.02em] leading-tight text-[#ebaf64]">
                My {new Date().getFullYear()} Resolutions
              </div>
            </div>

            <div
              ref={scrollContainerRef}
              onClick={handleCloseActiveRule}
              className="flex-1 overflow-y-auto px-5 sm:px-7 py-2 flex flex-col pb-4 overscroll-contain cursor-default"
            >
              {/* STACK OF MINIMIZED RESOLUTIONS AT TOP */}
              <div className="flex flex-col gap-4.5 transition-all duration-300 ease-out">
                {rules.map((rule, index) => {
                  const isCurrentExpanded = rule.id === expandedRuleId;
                  if (isCurrentExpanded) return null; // rendered in the active editor below
                  return (
                    <div
                      key={rule.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedRuleId(rule.id);
                      }}
                      className="bg-black/20 backdrop-blur-2xl border-x border-b border-t-0 border-[#ebaf64]/35 hover:border-[#ebaf64]/60 rounded-b-3xl rounded-t-none px-5 py-2.5 flex items-center justify-between cursor-pointer transition-all duration-300 ease-out active:scale-[0.99] shadow-md"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span className="text-sm font-mono font-medium text-[#ebaf64] shrink-0">
                          0{index + 1}
                        </span>
                        <span className={`text-sm truncate ${rule.title ? "text-white font-medium" : "text-[#71717A]"}`}>
                          {rule.title || "Untitled resolution"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-[#ebaf64]/80 uppercase tracking-wider font-mono">Edit</span>
                        {rules.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeRule(rule.id);
                            }}
                            className="text-[#71717A] hover:text-[#EF4444] p-1 transition-colors"
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
                    {/* Active Expanded Resolution Card (Dark Glass) */}
                    {expandedRule && (
                      <div
                        key={expandedRule.id}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-black/20 backdrop-blur-2xl border border-[#ebaf64]/35 rounded-3xl p-5 sm:p-6 flex flex-col gap-4 relative focus-within:border-[#ebaf64]/70 transition-all duration-300 ease-out shadow-[0_8px_32px_rgba(0,0,0,0.4)] mb-4 animate-in fade-in zoom-in-95 cursor-auto"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-mono font-medium text-[#ebaf64] tracking-wider">
                            0{expandedIndex + 1}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCloseActiveRule();
                              }}
                              className="text-[#ebaf64] bg-black/30 hover:bg-black/50 border border-[#ebaf64]/40 text-xs font-semibold tracking-wider transition-all duration-150 py-1 px-3 rounded-xl active:scale-95 cursor-pointer backdrop-blur-xl"
                            >
                              Done
                            </button>
                            {rules.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeRule(expandedRule.id);
                                }}
                                className="text-[#71717A] hover:text-[#EF4444] p-1.5 transition-colors active:scale-95 rounded-lg hover:bg-black/40 cursor-pointer"
                                title="Remove resolution"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-medium text-[#ebaf64]/80">
                            Title
                          </label>
                          <input
                            ref={titleInputRef}
                            type="text"
                            value={expandedRule.title}
                            onChange={(e) => updateRule(expandedRule.id, "title", e.target.value)}
                            placeholder="e.g. No more late night takeout"
                            className="w-full bg-black/30 border border-[#ebaf64]/30 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#ebaf64] transition-colors"
                            autoFocus
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-medium text-[#ebaf64]/80">
                            Condition
                          </label>
                          <textarea
                            value={expandedRule.condition}
                            onChange={(e) => updateRule(expandedRule.id, "condition", e.target.value)}
                            placeholder="e.g. Any food delivery ordered between 10 PM and 5 AM"
                            rows={2}
                            className="w-full bg-black/30 border border-[#ebaf64]/30 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#ebaf64] transition-colors resize-none leading-relaxed"
                          />
                        </div>

                        {showMotivationIds[expandedRule.id] || Boolean(expandedRule.whyItMatters) ? (
                          <div className="flex flex-col gap-1.5 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-medium text-[#ebaf64]/80">
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
                              className="w-full bg-black/30 border border-[#ebaf64]/30 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#ebaf64] transition-colors"
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setShowMotivationIds((prev) => ({ ...prev, [expandedRule.id]: true }))
                            }
                            className="self-start text-[11px] font-mono text-[#ebaf64]/70 hover:text-[#ebaf64] flex items-center gap-1.5 transition-colors pt-0.5"
                          >
                            <Plus size={11} />
                            <span>Add personal motivation</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Centered Add Button */}
                    <div className="w-full flex justify-center py-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addRule();
                        }}
                        className="py-3 px-6 border border-dashed border-[#ebaf64]/35 hover:border-[#ebaf64]/60 bg-black/20 hover:bg-black/40 text-[#ebaf64] rounded-full flex items-center justify-center gap-2 text-xs font-medium backdrop-blur-2xl transition-all duration-200 active:scale-95 shadow-sm"
                      >
                        <Plus size={14} />
                        <span>Add another resolution</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Bottom Actions: Next Step CTA */}
            <div className="p-5 sm:p-7 pt-2 pb-8 sm:pb-9 bg-transparent shrink-0 flex flex-col items-center">
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
                    ? "bg-[#ebaf64] text-black hover:bg-[#f3bc75] shadow-lg shadow-black/60 cursor-pointer"
                    : "bg-black/40 text-white/40 border border-white/10 cursor-not-allowed"
                }`}
              >
                <span>Next</span>
                <ArrowRight size={16} />
              </button>
              <span className="text-[11px] font-mono text-white/35 text-center tracking-tight mt-2.5">
                All resolutions are encrypted and stored on Walrus
              </span>
            </div>
          </div>
        )}

        {/* ==================================================================
            SCREEN 2: PENALTY STAKES & ESCROW SETUP
            ================================================================== */}
        {step === 2 && (
          <div className="relative z-10 flex-1 flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
            {/* Header */}
            <div className="pt-8 sm:pt-10 px-7 pb-4 shrink-0 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="self-start text-[#ebaf64]/75 hover:text-[#ebaf64] flex items-center gap-1.5 text-xs font-medium transition-colors active:scale-95"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
              <div className="text-[28px] sm:text-[32px] font-bold tracking-[0.02em] leading-tight text-[#ebaf64]">
                Set your penalties
              </div>
            </div>

            {/* Scrollable Rules List & Vault Parameters */}
            <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-7 py-2 flex flex-col gap-4 pb-4 overscroll-contain">
              {rules
                .filter((r) => r.title.trim().length > 0)
                .map((rule, idx) => (
                  <div
                    key={rule.id}
                    className="bg-black/20 backdrop-blur-2xl border border-[#ebaf64]/25 rounded-3xl p-5 flex flex-col gap-3.5 transition-all duration-200 shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono font-medium text-[#ebaf64] tracking-wider">
                        0{idx + 1}
                      </span>
                    </div>

                    <div className="text-base font-semibold text-white tracking-[-0.01em]">
                      {rule.title}
                    </div>

                    <div className="flex flex-col gap-2 pt-0.5">
                      <div className="text-[11px] font-medium text-[#ebaf64]/70 uppercase tracking-wider">
                        Stake per breach
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {PENALTY_PRESETS.map((amt) => {
                          const isSelected = rule.penalty === amt;
                          return (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => updateRule(rule.id, "penalty", isSelected ? 0 : amt)}
                              className={`py-2.5 text-center rounded-xl text-xs font-medium transition-all duration-150 active:scale-95 ${
                                isSelected
                                  ? "bg-[#ebaf64] text-black font-semibold shadow-sm"
                                  : "bg-black/30 text-[#ebaf64]/80 border border-[#ebaf64]/25 hover:border-[#ebaf64]/60 hover:text-white"
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

              {/* x402 Vault Parameters Summary Card */}
              <div className="bg-black/20 backdrop-blur-2xl border border-[#ebaf64]/25 rounded-3xl p-5 flex flex-col gap-3 shadow-md mt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[#ebaf64]/80 uppercase tracking-wider">
                    x402 Vault Lock
                  </span>
                  <Lock size={12} className="text-[#ebaf64]/80" />
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-xs text-white/70">Locked Until</span>
                  <span className="text-xs text-white font-medium">{unlockDate}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/70">Initial x402 Deposit</span>
                  <span className="text-xs text-[#ebaf64] font-mono font-medium">{escrowDeposit} SUI</span>
                </div>

                <div className="flex items-center justify-between border-t border-[#ebaf64]/20 pt-2.5">
                  <span className="text-xs text-white/50">Memory Proof</span>
                  <span className="text-xs text-[#ebaf64]/80">Walrus Network</span>
                </div>
              </div>
            </div>

            {/* Pinned Bottom CTA */}
            <div className="p-5 sm:p-7 pt-2 pb-8 sm:pb-9 bg-transparent shrink-0 flex flex-col items-center w-full">
              <button
                type="button"
                onClick={() => {
                  if (!isStep2Valid) {
                    const unassigned = rules.filter((r) => !r.penalty || r.penalty <= 0);
                    triggerSnackbar(
                      "Penalties required",
                      `Please select a penalty stake for all resolutions (${unassigned.length} unset)`
                    );
                    return;
                  }
                  setStep(3);
                }}
                className={`w-full py-4 px-6 rounded-full font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                  isStep2Valid
                    ? "bg-[#ebaf64] text-black hover:bg-[#f3bc75] active:scale-[0.98] shadow-lg shadow-black/60 cursor-pointer"
                    : "bg-black/40 text-white/40 border border-white/10 cursor-not-allowed"
                }`}
              >
                <span>Continue to Account</span>
                <ArrowRight size={16} />
              </button>
              <span className="text-[11px] font-mono text-white/35 text-center tracking-tight mt-2.5">
                Penalties are enforced and locked on-chain via x402 vault
              </span>
            </div>
          </div>
        )}

        {/* ==================================================================
            SCREEN 3: ACCOUNT & WALLET SETUP
            ================================================================== */}
        {step === 3 && (
          <div className="relative z-10 flex-1 flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
            {/* Header */}
            <div className="pt-8 sm:pt-10 px-7 pb-3 shrink-0 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="self-start text-[#ebaf64]/75 hover:text-[#ebaf64] flex items-center gap-1.5 text-xs font-medium transition-colors active:scale-95"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
              <div className="text-[28px] sm:text-[32px] font-bold tracking-[0.02em] leading-tight text-[#ebaf64]">
                Choose an account
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-7 py-2 flex flex-col gap-3.5 pb-4 overscroll-contain">
              {/* Option 1: Demo Account */}
              <div
                onClick={() => {
                  setAccountType("demo");
                  const activeDemo = demoAddress || DEMO_SUI_ADDRESS;
                  refreshLiveBalance(activeDemo, "demo");
                }}
                className={`bg-black/20 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 flex flex-col gap-2.5 cursor-pointer transition-all duration-200 active:scale-[0.99] border shadow-md ${
                  accountType === "demo"
                    ? "border-[#ebaf64]"
                    : "border-[#ebaf64]/25 hover:border-[#ebaf64]/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-base font-semibold text-white tracking-[-0.01em]">
                    Demo account
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${
                      accountType === "demo"
                        ? "bg-[#ebaf64] text-black scale-100"
                        : "border border-[#ebaf64]/30 scale-90"
                    }`}
                  >
                    {accountType === "demo" && <Check size={12} strokeWidth={3} />}
                  </div>
                </div>

                <p className="text-xs text-white/70 leading-relaxed">
                  Sandbox environment preloaded with testnet SUI to try out pacts risk-free.
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-white/10 mt-1">
                  <span className="text-[11px] font-mono text-white/60">
                    Testnet: <span className="text-[#ebaf64] font-semibold">{availableBalance.toFixed(2)} SUI</span>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRequestFaucet(demoAddress || DEMO_SUI_ADDRESS);
                    }}
                    disabled={isRequestingFaucet}
                    className="py-1 px-3 rounded-full bg-[#ebaf64]/15 hover:bg-[#ebaf64]/25 text-[#ebaf64] border border-[#ebaf64]/30 text-[11px] font-mono flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  >
                    {isRequestingFaucet ? (
                      <span className="w-2.5 h-2.5 border border-[#ebaf64] border-t-transparent rounded-full animate-spin inline-block" />
                    ) : (
                      <Sparkles size={11} />
                    )}
                    <span>{isRequestingFaucet ? "Claiming..." : "Claim 1.00 SUI"}</span>
                  </button>
                </div>
              </div>

              {/* Option 2: Real Account */}
              <div
                onClick={() => {
                  setAccountType("real");
                  if (realAddress) refreshLiveBalance(realAddress);
                }}
                className={`bg-black/20 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 flex flex-col gap-2.5 cursor-pointer transition-all duration-200 active:scale-[0.99] border shadow-md ${
                  accountType === "real"
                    ? "border-[#ebaf64]"
                    : "border-[#ebaf64]/25 hover:border-[#ebaf64]/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-base font-semibold text-white tracking-[-0.01em]">
                    Real account
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${
                      accountType === "real"
                        ? "bg-[#ebaf64] text-black scale-100"
                        : "border border-[#ebaf64]/30 scale-90"
                    }`}
                  >
                    {accountType === "real" && <Check size={12} strokeWidth={3} />}
                  </div>
                </div>

                <p className="text-xs text-white/70 leading-relaxed">
                  Self-custodial Sui wallet with real funds and cryptographic enforcement.
                </p>
              </div>

              {/* Option 3: Link Wallet */}
              <div className="pt-1 flex flex-col items-center gap-2">
                {detectedExtension ? (
                  <button
                    type="button"
                    onClick={handleConnectExtension}
                    disabled={isConnectingExtension}
                    className="w-full py-3 px-4 rounded-full bg-black/20 backdrop-blur-xl border border-[#ebaf64]/25 hover:border-[#ebaf64]/50 text-xs font-medium text-[#ebaf64] transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                  >
                    <Wallet size={14} />
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
                    className="text-xs font-medium text-[#ebaf64]/70 hover:text-[#ebaf64] transition-colors py-1 flex items-center gap-1.5 active:scale-95"
                  >
                    <Plus size={13} />
                    <span>Link an existing Sui address</span>
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
                      className="w-full bg-black/30 border border-[#ebaf64]/30 rounded-2xl px-4 py-2.5 text-xs font-mono text-white placeholder-white/30 outline-none focus:border-[#ebaf64] transition-colors"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 sm:p-7 pt-2 pb-8 sm:pb-9 bg-transparent shrink-0 flex flex-col items-center w-full">
              <button
                type="button"
                onClick={handleLockVault}
                disabled={isSubmitting}
                className={`relative overflow-hidden w-full py-4 px-6 rounded-full font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                  isSubmitting
                    ? "bg-[#18181C] text-white border border-[#27272A] cursor-wait"
                    : "bg-[#ebaf64] text-black hover:bg-[#f3bc75] active:scale-[0.98] shadow-lg shadow-black/60 cursor-pointer"
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
              <span className="text-[11px] font-mono text-white/35 text-center tracking-tight mt-2.5">
                Account activity is monitored on-chain via Tatum
              </span>
            </div>
          </div>
        )}

        {/* ==================================================================
            SCREEN 4: ACTIVE HOMESCREEN & NAVIGATION
            ================================================================== */}
        {step === 4 && !isSendOpen && (
          <div className="relative z-10 flex-1 flex flex-col justify-between overflow-hidden animate-in fade-in duration-300">
            {/* TAB: HOME */}
            {activeTab === "home" && (
              <div className="flex-1 overflow-y-auto px-5 sm:px-7 pt-6 sm:pt-8 pb-36 flex flex-col gap-4 overscroll-contain">
                {/* 1. TOP HEADER: PROMINENT DATE + MINIMALIST WALRUS SWITCH */}
                <div className="flex items-center justify-between pt-1 pb-1">
                  <div className="text-[26px] sm:text-[30px] font-bold tracking-[0.02em] leading-tight text-[#ebaf64]">
                    {currentDateStr || "Sunday, Nov 8"}
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono text-white/70">Walrus</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!isDegradedMode}
                      onClick={() => setIsDegradedMode((prev) => !prev)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        !isDegradedMode ? "bg-[#ebaf64]" : "bg-white/20"
                      }`}
                      title={!isDegradedMode ? "Walrus & Tatum Active" : "Walrus Disconnected"}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ease-in-out ${
                          !isDegradedMode ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* CHRISTMAS UNLOCK BANNER (When Time-Lock Reaches Dec 25) */}
                {isVaultUnlocked && (
                  <div className="bg-black/20 backdrop-blur-2xl border border-[#ebaf64]/25 rounded-3xl p-5 flex flex-col gap-3 shadow-md animate-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Gift size={16} className="text-[#ebaf64]" />
                        <span className="text-xs font-semibold text-white uppercase tracking-wider">
                          Christmas Vault Unlocked
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-[#ebaf64] bg-[#ebaf64]/10 px-2 py-0.5 rounded border border-[#ebaf64]/20">
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
                        className="w-full py-3 px-4 rounded-full bg-[#ebaf64] hover:bg-[#f3ba6f] text-black font-semibold text-xs transition-all duration-150 flex items-center justify-center gap-2 active:scale-[0.98] shadow-sm"
                      >
                        <Gift size={14} />
                        <span>Claim Christmas Savings ({escrowDeposit}.00 SUI)</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-mono text-[#10B981] bg-[#10B981]/10 p-2.5 rounded-2xl border border-[#10B981]/20">
                        <Check size={14} />
                        <span>55.00 SUI released from Sui Move contract into available balance</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. UNIFIED HERO CARD: BALANCE + ACTIONS + WALLY'S VOICE (Zero Slop, No Divider Line) */}
                <div className="relative bg-black/20 backdrop-blur-2xl border border-[#ebaf64]/25 rounded-3xl p-5 sm:p-6 pt-7 sm:pt-8 flex flex-col gap-4 shadow-md transition-all duration-200 mt-8">
                  {/* Wally Mascot with Memories Book: Small, above the card, on the left top edge */}
                  <div className="absolute -top-7 sm:-top-8 left-5 sm:left-6 z-20 pointer-events-none select-none">
                    <img
                      src="/assets/mascot/wally_memories.png"
                      alt="Wally with Memories book"
                      className="w-16 h-auto sm:w-18 drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)] filter"
                      draggable={false}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-3xl sm:text-4xl font-bold font-mono text-white tracking-tight">
                      {availableBalance.toFixed(2)} SUI
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {accountType === "demo" && (
                        <button
                          type="button"
                          onClick={() => handleRequestFaucet(demoAddress || DEMO_SUI_ADDRESS)}
                          disabled={isRequestingFaucet}
                          className="py-2.5 px-3 rounded-full bg-[#ebaf64]/15 hover:bg-[#ebaf64]/25 text-[#ebaf64] border border-[#ebaf64]/30 font-medium text-xs font-mono transition-all duration-150 flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                          title="Claim 1.00 SUI Testnet Gas"
                        >
                          {isRequestingFaucet ? (
                            <span className="w-3 h-3 border border-[#ebaf64] border-t-transparent rounded-full animate-spin inline-block" />
                          ) : (
                            <Sparkles size={13} />
                          )}
                          <span>{isRequestingFaucet ? "Claiming..." : "+1 SUI"}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={openSendFlow}
                        className="py-2.5 px-4 rounded-full bg-[#ebaf64] hover:bg-[#f3ba6f] text-black font-semibold text-xs transition-all duration-150 flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
                      >
                        <ArrowUpRight size={14} className="stroke-[2.5]" />
                        <span>Send</span>
                      </button>
                      <button
                        type="button"
                        onClick={copyAddress}
                        className="py-2.5 px-4 rounded-full bg-black/40 hover:bg-black/60 text-[#ebaf64] border border-[#ebaf64]/30 hover:border-[#ebaf64]/60 font-medium text-xs transition-all duration-150 flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        {copiedAddress ? <Check size={14} className="text-[#ebaf64]" /> : <ArrowDownLeft size={14} />}
                        <span>{copiedAddress ? "Copied" : "Receive"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 pt-1">
                    <span className="text-[11px] font-mono text-[#ebaf64]/80 uppercase tracking-wider font-semibold">
                      {!isDegradedMode ? "Wally · Walrus Memory" : "Wally · Memory Offline"}
                    </span>
                    <p className="text-sm text-white/90 leading-relaxed font-normal">
                      {(() => {
                        if (isDegradedMode) {
                          return "Stateless Session: Walrus memory is disconnected. Outgoing transfers are not cross-referenced against your resolutions and past infractions are forgotten.";
                        }
                        if (isVaultUnlocked && !isVaultClaimed) {
                          return `🎅 Merry Christmas! The Sui network clock has passed the vault unlock timestamp. Your accumulated savings of ${escrowDeposit.toFixed(2)} SUI are ready to be claimed!`;
                        }
                        if (isVaultClaimed) {
                          return `🎉 Christmas gift claimed! You successfully locked ${escrowDeposit.toFixed(2)} SUI away from your impulsive past self and reclaimed it for the holidays.`;
                        }
                        if (activeMilestone === "jul20") {
                          return `Walrus memory synthesis: Multiple slip-ups recorded on "${activeRulesList[0]?.title || "your resolution"}". ${escrowDeposit.toFixed(2)} SUI total is now locked away in Move storage.`;
                        }
                        if (activeMilestone === "feb14") {
                          return `Day 45: First slip-up logged. You swore in Walrus Memory: "${activeRulesList[0]?.title || "your resolution"}". ${(activeRulesList[0]?.penalty || 0.05).toFixed(2)} SUI was locked into the Move vault via x402.`;
                        }

                        // Recent breaches in Walrus memory
                        const recentBreaches = infractions.filter((i) => i.verdict === "broken");
                        if (recentBreaches.length > 0) {
                          const latest = recentBreaches[0];
                          const rule = activeRulesList.find((r) => r.title.toLowerCase() === latest.ruleTitle.toLowerCase());
                          const paraphrased = rule?.whyItMatters ? paraphraseUserMotivation(rule.whyItMatters) : "";
                          return `Walrus memory alert: Breach recorded on '${latest.ruleTitle}' (${latest.memo || "impulse transfer"}). ${recentBreaches.length === 1 ? "1 infraction" : `${recentBreaches.length} infractions`} on record · ${escrowDeposit.toFixed(2)} SUI locked in Christmas vault. ${paraphrased ? `Stay mindful: ${paraphrased}.` : "Stay vigilant."}`;
                        }

                        // Honored transfers in Walrus memory
                        const honoredTxs = infractions.filter((i) => i.verdict === "honored");
                        if (honoredTxs.length > 0) {
                          const primary = activeRulesList[0];
                          const paraphrased = primary?.whyItMatters ? paraphraseUserMotivation(primary.whyItMatters) : "";
                          return `Clean streak active. Walrus memory has audited and verified ${honoredTxs.length} compliant ${honoredTxs.length === 1 ? "transfer" : "transfers"}. 0 infractions against your ${activeRulesList.length} commitments. ${paraphrased ? `Holding strong: ${paraphrased}.` : "Keep your streak intact."}`;
                        }

                        // Genesis Pact
                        if (activeRulesList.length > 0) {
                          const primary = activeRulesList[0];
                          const paraphrased = primary.whyItMatters ? paraphraseUserMotivation(primary.whyItMatters) : "";
                          return `Genesis Pact locked in Walrus memory across ${activeRulesList.length} commitments. 0 infractions recorded. Monitoring transactions against "${primary.title}" (${(primary.penalty || 0.05).toFixed(2)} SUI penalty standing by). ${paraphrased ? `Committed to: ${paraphrased}.` : ""}`;
                        }

                        return "Resolutions locked in Walrus memory. I am monitoring your transactions for adherence.";
                      })()}
                    </p>
                  </div>
                </div>

                {/* 3. ACTIVE RESOLUTIONS PREVIEW (Dark Glass Penalties Style) */}
                <div className="bg-black/20 backdrop-blur-2xl border border-[#ebaf64]/25 rounded-3xl p-5 shadow-md flex flex-col gap-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-[#ebaf64]">
                      {activeRulesList.length} Resolutions
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab("resolutions")}
                      className="text-xs font-mono text-[#ebaf64]/80 hover:text-white transition-colors"
                    >
                      See all →
                    </button>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {activeRulesList.slice(0, 3).map((rule) => (
                      <div
                        key={rule.id}
                        className="bg-black/30 border border-[#ebaf64]/20 rounded-2xl p-4 flex items-center justify-between gap-3 transition-colors hover:border-[#ebaf64]/40"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-white truncate">
                            {rule.title}
                          </span>
                          <span className="text-[11px] font-mono text-[#ebaf64]/70 mt-0.5">
                            {rule.penalty} SUI stake per breach
                          </span>
                        </div>

                        <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
                          <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                            <circle
                              cx="16"
                              cy="16"
                              r="13"
                              fill="none"
                              stroke="rgba(235, 175, 100, 0.15)"
                              strokeWidth="2.5"
                            />
                            <circle
                              cx="16"
                              cy="16"
                              r="13"
                              fill="none"
                              stroke="#ebaf64"
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
                          <span className="absolute text-[11px] font-mono font-semibold text-[#ebaf64]">
                            {rule.breaches || 0}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: RESOLUTIONS */}
            {activeTab === "resolutions" && (
              <div className="flex-1 overflow-y-auto px-5 sm:px-7 pt-6 sm:pt-8 pb-36 flex flex-col gap-4 animate-in fade-in duration-200 overscroll-contain">
                <div className="text-[26px] sm:text-[30px] font-bold tracking-[0.02em] leading-tight text-[#ebaf64]">
                  Saved Resolutions
                </div>

                {/* Resolutions List */}
                <div className="flex flex-col gap-3">
                  {activeRulesList.map((rule, idx) => {
                    const isExpanded = selectedMemoryRuleId === rule.id;
                    const matchingBlob = walrusBlobs.find(
                      (b) => b.payload?.ruleId === rule.id || b.blobId === rule.blobId
                    );
                    const rulePayload = matchingBlob?.payload || {
                      protocol: "Yearbound v1",
                      storage: "Walrus Memory (MemWal)",
                      type: "commitment_rule",
                      ruleId: rule.id,
                      title: rule.title,
                      condition: rule.condition,
                      penaltySui: rule.penalty,
                      status: "active",
                      keywords: rule.keywords || [],
                    };

                    return (
                      <div
                        key={rule.id}
                        onClick={() => setSelectedMemoryRuleId(isExpanded ? null : rule.id)}
                        className={`bg-black/20 backdrop-blur-2xl border rounded-3xl p-5 flex flex-col gap-2.5 cursor-pointer transition-all duration-200 shadow-md ${
                          isExpanded
                            ? "border-[#ebaf64] ring-1 ring-[#ebaf64]/30"
                            : "border-[#ebaf64]/25 hover:border-[#ebaf64]/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-medium text-[#ebaf64] tracking-wider">
                            0{idx + 1}
                          </span>
                          <div className="flex items-center gap-2">
                            {rule.breaches ? (
                              <span className="text-[10px] font-mono text-red-400 font-semibold bg-red-500/10 border border-red-500/25 px-2 py-0.5 rounded-full">
                                {rule.breaches} {rule.breaches === 1 ? "Breach" : "Breaches"}
                              </span>
                            ) : null}
                            <span className="text-xs font-mono text-black font-semibold bg-[#ebaf64] px-2.5 py-0.5 rounded-full shadow-sm">
                              {rule.penalty} SUI Penalty
                            </span>
                          </div>
                        </div>

                        <div className="text-base font-semibold text-white">
                          {rule.title}
                        </div>

                        {rule.condition && rule.condition !== "Commitment boundary" && (
                          <p className="text-xs text-white/70 leading-relaxed">
                            {rule.condition}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-[#ebaf64]/80 group-hover:text-[#ebaf64] transition-colors select-none">
                          <span>{isExpanded ? "Hide Walrus payload" : "Tap to show Walrus payload"}</span>
                          <ChevronDown size={13} className={`transform transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                        </div>

                        {/* Expandable Exact Walrus Memory Proof & Inscribed Payload */}
                        {isExpanded && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="bg-black/30 border border-[#ebaf64]/20 rounded-2xl p-4 flex flex-col gap-3 mt-1 animate-in fade-in duration-200"
                          >
                            <div className="flex items-center justify-between bg-black/40 border border-[#ebaf64]/20 rounded-xl px-3 py-2">
                              <span className="text-[11px] font-mono text-white/90 truncate mr-2">
                                Blob #{rule.blobId ? `${rule.blobId.slice(0, 16)}...` : walrusBlobId ? `${walrusBlobId.slice(0, 16)}...` : "d4a97f2e8c9b4e11..."}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
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
                                  className="text-white/60 hover:text-white p-1 transition-colors"
                                  title="Copy Blob ID"
                                >
                                  <Copy size={12} />
                                </button>
                                {(rule.blobId || walrusBlobId) && (
                                  <a
                                    href={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${rule.blobId || walrusBlobId}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-white/60 hover:text-white p-1 transition-colors"
                                    title="View on Walrus Aggregator"
                                  >
                                    <ExternalLink size={12} />
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Exact Walrus Inscription Payload Display */}
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-mono uppercase tracking-wider text-[#ebaf64]/80">
                                Walrus Inscription Payload
                              </span>
                              <div className="bg-black/60 border border-white/10 rounded-xl p-3 overflow-x-auto max-h-48 overscroll-contain">
                                <pre className="text-[10px] font-mono text-white/80 whitespace-pre-wrap leading-relaxed select-all">
                                  {JSON.stringify(rulePayload, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add Another Resolution Button */}
                  <button
                    type="button"
                    onClick={() => setIsAddResolutionOpen(true)}
                    className="w-full py-3.5 px-4 rounded-full border border-dashed border-[#ebaf64]/35 hover:border-[#ebaf64]/60 bg-black/20 hover:bg-black/40 text-[#ebaf64] text-xs font-medium flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.99] mt-1 shadow-sm"
                  >
                    <Plus size={14} />
                    <span>Add another resolution</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB: x402 VAULT */}
            {activeTab === "vault" && (
              <div className="flex-1 overflow-y-auto px-5 sm:px-7 pt-6 sm:pt-8 pb-36 flex flex-col gap-4 animate-in fade-in duration-200 overscroll-contain">
                <div className="text-[26px] sm:text-[30px] font-bold tracking-[0.02em] leading-tight text-[#ebaf64]">
                  x402 Vault
                </div>

                {/* CHRISTMAS UNLOCK ACTION IN VAULT */}
                {isVaultUnlocked && (
                  <div className="bg-black/20 backdrop-blur-2xl border border-[#ebaf64]/25 rounded-3xl p-5 flex flex-col gap-3 shadow-md animate-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Gift size={16} className="text-[#ebaf64]" />
                        <span className="text-xs font-semibold text-white uppercase tracking-wider">
                          Christmas Release Active
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-[#ebaf64] bg-[#ebaf64]/10 px-2 py-0.5 rounded border border-[#ebaf64]/20">
                        {isVaultClaimed ? "Funds Claimed" : "Unlocked"}
                      </span>
                    </div>
                    <p className="text-xs text-[#D4D4D8]">
                      Smart contract time-lock satisfied. All {escrowDeposit.toFixed(2)} SUI unlocked.
                    </p>
                    {!isVaultClaimed ? (
                      <button
                        type="button"
                        onClick={handleClaimChristmasVault}
                        className="w-full py-3 px-4 rounded-full bg-[#ebaf64] hover:bg-[#f3ba6f] text-black font-semibold text-xs transition-all duration-150 flex items-center justify-center gap-2 active:scale-[0.98] shadow-sm cursor-pointer"
                      >
                        <Gift size={14} />
                        <span>Claim Christmas Savings ({escrowDeposit.toFixed(2)} SUI)</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-mono text-[#10B981] bg-[#10B981]/10 p-2.5 rounded-2xl border border-[#10B981]/20">
                        <Check size={14} />
                        <span>Funds Claimed into Available Balance</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 1. PRIMARY HERO VAULT CARD (Top Section) */}
                <div className="relative bg-black/20 backdrop-blur-2xl border border-[#ebaf64]/30 rounded-3xl p-6 sm:p-7 flex flex-col gap-5 shadow-xl transition-all duration-200 overflow-hidden">
                  {/* Subtle ambient decorative gold glow */}
                  <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#ebaf64]/10 rounded-full blur-3xl pointer-events-none" />

                  {/* Top Row: Label & Release Status */}
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-white/50">
                      Total Locked Value
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ebaf64]/10 border border-[#ebaf64]/25 text-[#ebaf64] text-xs font-mono font-medium">
                      {isVaultUnlocked ? (
                        <>
                          <Check size={12} className="text-[#10B981]" />
                          <span className="text-[#10B981]">Release Active</span>
                        </>
                      ) : (
                        <>
                          <Lock size={11} />
                          <span>Locked until {unlockDate}</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Hero Balance Block */}
                  <div className="flex items-baseline gap-2 relative z-10">
                    <span className="text-4xl sm:text-5xl font-bold font-mono text-white tracking-tight">
                      {escrowDeposit.toFixed(2)}
                    </span>
                    <span className="text-xl sm:text-2xl font-bold font-mono text-[#ebaf64]">
                      SUI
                    </span>
                  </div>

                  {/* Pledge vs Toll Breakdown Pills */}
                  <div className="grid grid-cols-2 gap-2.5 relative z-10">
                    <div className="bg-black/30 border border-[#ebaf64]/15 rounded-2xl p-3.5 flex flex-col gap-0.5">
                      <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">
                        Initial Pledge
                      </span>
                      <span className="text-sm font-mono font-semibold text-white">
                        0.20 SUI
                      </span>
                    </div>
                    <div className="bg-black/30 border border-[#ebaf64]/15 rounded-2xl p-3.5 flex flex-col gap-0.5">
                      <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">
                        Infraction Tolls
                      </span>
                      <span className="text-sm font-mono font-semibold text-[#ebaf64]">
                        +{Math.max(0, escrowDeposit - 0.20).toFixed(2)} SUI
                      </span>
                    </div>
                  </div>

                  {/* Contract Details Micro-Rows */}
                  <div className="flex flex-col gap-2 pt-3 border-t border-white/10 text-xs relative z-10">
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Escrow Contract</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(YEARBOUND_TESTNET_VAULT_ADDRESS);
                            triggerSnackbar("Contract Address Copied", YEARBOUND_TESTNET_VAULT_ADDRESS);
                          }}
                          className="font-mono text-[#ebaf64] hover:text-[#f3ba6f] flex items-center gap-1.5 transition-colors group"
                          title={YEARBOUND_TESTNET_VAULT_ADDRESS}
                        >
                          <span>{YEARBOUND_TESTNET_VAULT_ADDRESS.slice(0, 6)}...{YEARBOUND_TESTNET_VAULT_ADDRESS.slice(-4)}</span>
                          <Copy size={11} className="text-white/40 group-hover:text-white transition-colors" />
                        </button>
                        <a
                          href={`https://suiscan.xyz/testnet/account/${YEARBOUND_TESTNET_VAULT_ADDRESS}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white/40 hover:text-white transition-colors"
                          title="View on SuiScan Testnet"
                        >
                          <ExternalLink size={11} />
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Release Trigger</span>
                      <span className="font-mono text-white/80">
                        Sui Network Epoch Clock (Dec 25)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Settlement Gateway</span>
                      <span className="font-mono text-white/80">
                        {accountType === "real"
                          ? "Tatum Mainnet Gateway"
                          : accountType === "linked"
                          ? "Sui Wallet Standard"
                          : "Tatum Sui Testnet Gateway (Live On-Chain)"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. 365-DAY DISCIPLINE GRID HEATMAP (Activity Visualizer) */}
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

              </div>
            )}

            {/* TAB: SETTINGS */}
            {activeTab === "settings" && (
              <div className="flex-1 overflow-y-auto px-5 sm:px-7 pt-6 sm:pt-8 pb-36 flex flex-col gap-4 animate-in fade-in duration-200 overscroll-contain">
                <div className="text-[26px] sm:text-[30px] font-bold tracking-[0.02em] leading-tight text-[#ebaf64]">
                  Settings & Proofs
                </div>

                {/* Walrus Memory Proof Card */}
                <div className="bg-black/20 backdrop-blur-2xl border border-[#ebaf64]/25 rounded-3xl p-5 flex flex-col gap-3 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">
                      Walrus Memory Proof
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsMemoryInspectorOpen(true)}
                      className="text-xs font-mono text-[#ebaf64] hover:underline flex items-center gap-1 active:scale-95"
                    >
                      <span>Inspect Memory</span>
                      <ExternalLink size={12} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between bg-black/30 border border-[#ebaf64]/20 rounded-2xl px-4 py-3">
                    <span className="text-xs font-mono text-white/80 truncate mr-2">
                      Blob #{walrusBlobId ? `${walrusBlobId.slice(0, 16)}...` : "pact_genesis_manifest"}
                    </span>
                    <button
                      type="button"
                      onClick={copyBlobId}
                      className="text-[#ebaf64]/80 hover:text-[#ebaf64] p-1 transition-colors active:scale-95"
                      title="Copy Blob ID"
                    >
                      {copiedBlob ? <Check size={14} className="text-[#ebaf64]" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                {/* Wallet Details Card */}
                <div className="bg-black/20 backdrop-blur-2xl border border-[#ebaf64]/25 rounded-3xl p-5 flex flex-col gap-3.5 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">
                      Account & Network
                    </span>
                    <span className="text-xs font-mono text-[#ebaf64]">
                      {accountType === "demo" ? "Testnet" : "Mainnet"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-black/30 border border-[#ebaf64]/20 rounded-2xl px-4 py-3">
                    <span className="text-xs font-mono text-white/80 truncate mr-2">
                      {accountType === "demo"
                        ? (demoAddress || DEMO_SUI_ADDRESS)
                        : accountType === "real"
                        ? realAddress
                        : linkedAddress}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
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
                        className="text-[#ebaf64]/80 hover:text-[#ebaf64] p-1 transition-colors"
                        title="Copy address"
                      >
                        <Copy size={13} />
                      </button>
                      <a
                        href={accountType === "demo"
                          ? `https://suiscan.xyz/testnet/account/${demoAddress || DEMO_SUI_ADDRESS}`
                          : `https://suiscan.xyz/mainnet/account/${realAddress || linkedAddress}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#ebaf64]/80 hover:text-[#ebaf64] p-1 transition-colors"
                        title="View on SuiScan"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs text-white/60">Live Balance</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-white font-medium">
                        {accountType === "demo"
                          ? isCheckingLiveBalance
                            ? "Querying..."
                            : `${liveOnChainBalanceSui !== null ? liveOnChainBalanceSui.toFixed(2) : availableBalance.toFixed(2)} SUI`
                          : isCheckingLiveBalance
                          ? "Querying..."
                          : `${liveOnChainBalanceSui !== null ? liveOnChainBalanceSui.toFixed(2) : "0.00"} SUI`}
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
                        className="text-[#ebaf64]/80 hover:text-[#ebaf64] text-xs transition-colors"
                        title="Refresh on-chain balance"
                      >
                        ↻
                      </button>
                    </div>
                  </div>

                  {(accountType === "real" || accountType === "demo") && (
                    <div className="flex flex-col gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const hex = accountType === "demo" ? exportDemoPrivateKeyHex() : exportRealPrivateKeyHex();
                          if (hex) {
                            setExportedKey(hex);
                            setShowExportPrivateKey(!showExportPrivateKey);
                          }
                        }}
                        className="text-xs text-left text-white/70 hover:text-white transition-colors flex items-center justify-between px-1"
                      >
                        <span>Export Private Key</span>
                        <span className="text-[11px] font-mono text-[#ebaf64]">
                          {showExportPrivateKey ? "Hide" : "Reveal"}
                        </span>
                      </button>

                      {showExportPrivateKey && exportedKey && (
                        <div className="bg-black/40 border border-[#ebaf64]/20 rounded-2xl p-3 flex flex-col gap-1.5 animate-in fade-in">
                          <span className="text-[10px] font-mono text-white/50">
                            {accountType === "demo" ? "Testnet" : "Mainnet"} Secret Key (Hex):
                          </span>
                          <div className="bg-black/60 p-2.5 rounded-xl text-[10px] font-mono text-[#ebaf64] break-all select-all border border-[#ebaf64]/20">
                            {exportedKey}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Reset Pact Button */}
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setActiveTab("home");
                  }}
                  className="w-full py-3.5 px-4 rounded-full bg-black/20 hover:bg-black/40 border border-[#ebaf64]/25 hover:border-[#ebaf64]/50 text-xs font-medium text-white/70 hover:text-white transition-all text-center active:scale-[0.99] shadow-sm"
                >
                  Reset & Create New Pact
                </button>
              </div>
            )}

            {/* ================================================================
                FLOATING TIME-TRAVEL SCRUBBER (DEMO MODE ONLY)
                ================================================================ */}
            {accountType === "demo" && (
              <TimeTravelScrubber
                activeMilestone={activeMilestone}
                onChangeMilestone={handleMilestoneChange}
              />
            )}

            {/* ================================================================
                FLOATING NAVBAR PILL (With White Circle Selected Look)
                ================================================================ */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-black/90 backdrop-blur-2xl rounded-full p-1.5 flex items-center gap-1.5 shadow-2xl border border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab("home")}
                className={`w-10 h-10 rounded-full transition-all duration-200 active:scale-90 flex items-center justify-center ${
                  activeTab === "home"
                    ? "bg-white text-black shadow-md scale-105"
                    : "text-white/50 hover:text-white"
                }`}
                title="Home"
              >
                <Home size={18} className={activeTab === "home" ? "fill-current" : ""} />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("resolutions")}
                className={`w-10 h-10 rounded-full transition-all duration-200 active:scale-90 flex items-center justify-center ${
                  activeTab === "resolutions"
                    ? "bg-white text-black shadow-md scale-105"
                    : "text-white/50 hover:text-white"
                }`}
                title="Resolutions"
              >
                <ListCheck size={18} strokeWidth={activeTab === "resolutions" ? 2.8 : 2} />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("vault")}
                className={`w-10 h-10 rounded-full transition-all duration-200 active:scale-90 flex items-center justify-center ${
                  activeTab === "vault"
                    ? "bg-white text-black shadow-md scale-105"
                    : "text-white/50 hover:text-white"
                }`}
                title="x402 Vault"
              >
                <Shield size={18} className={activeTab === "vault" ? "fill-current" : ""} />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className={`w-10 h-10 rounded-full transition-all duration-200 active:scale-90 flex items-center justify-center ${
                  activeTab === "settings"
                    ? "bg-white text-black shadow-md scale-105"
                    : "text-white/50 hover:text-white"
                }`}
                title="Settings"
              >
                <Settings size={18} strokeWidth={activeTab === "settings" ? 2.8 : 2} />
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================
            SEND FLOW OVERLAY SCREENS
            ================================================================== */}
        {isSendOpen && (
          <div className="relative z-10 flex-1 flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
            
            {/* SUB-STEP 1: AMOUNT & RECIPIENT */}
            {sendSubStep === "amount" && (
              <>
                <div className="pt-8 sm:pt-10 px-7 pb-3 flex flex-col gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={closeSendFlow}
                    className="self-start text-[#ebaf64]/75 hover:text-[#ebaf64] flex items-center gap-1.5 text-xs font-medium transition-colors active:scale-95"
                  >
                    <ArrowLeft size={14} />
                    <span>Back</span>
                  </button>
                  <div className="text-[28px] sm:text-[32px] font-bold tracking-[0.02em] leading-tight text-[#ebaf64]">
                    Send SUI
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-2 flex flex-col gap-4 pb-4 overscroll-contain">
                  {/* Big Centered Amount Display Card */}
                  <div className="bg-black/20 backdrop-blur-2xl border border-[#ebaf64]/25 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 shadow-md">
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
                        className="bg-transparent text-[52px] sm:text-[56px] font-semibold font-mono text-center text-white outline-none tracking-tight p-0"
                        placeholder="0"
                      />
                      <span className="text-xl font-mono text-[#ebaf64]">SUI</span>
                    </div>

                    {/* Quick Amount Preset Chips */}
                    <div className="flex items-center gap-2 mt-1">
                      {AMOUNT_PRESETS.map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setSendAmount(amt.toString())}
                          className={`py-1.5 px-3.5 rounded-full text-xs font-mono transition-all duration-150 active:scale-95 cursor-pointer ${
                            sendAmount === amt.toString()
                              ? "bg-[#ebaf64] text-black font-semibold shadow-sm"
                              : "bg-black/40 text-white/70 border border-[#ebaf64]/30 hover:border-[#ebaf64]/60"
                          }`}
                        >
                          {amt}
                        </button>
                      ))}
                    </div>

                    {/* Insufficient Balance Indicator */}
                    {parseFloat(sendAmount || "0") > availableBalance && (
                      <span className="text-[11px] font-mono text-red-400 mt-1">
                        Insufficient balance (Wallet: {availableBalance.toFixed(2)} SUI)
                      </span>
                    )}
                  </div>

                  {/* Recipient Address */}
                  <div className="flex flex-col gap-1.5 pt-1">
                    <label className="text-xs font-medium text-[#ebaf64]/80 px-1">
                      Recipient Address
                    </label>
                    <input
                      type="text"
                      value={sendRecipient}
                      onChange={(e) => setSendRecipient(e.target.value)}
                      placeholder="Enter Sui address or contact name..."
                      className="w-full bg-black/20 backdrop-blur-2xl border border-[#ebaf64]/25 hover:border-[#ebaf64]/50 focus:border-[#ebaf64] rounded-2xl px-4 py-3.5 text-xs font-mono text-white placeholder-white/30 outline-none transition-colors shadow-sm"
                    />
                  </div>
                </div>

                <div className="p-5 sm:p-7 pt-2 pb-8 sm:pb-9 bg-transparent shrink-0 flex flex-col items-center">
                  {(() => {
                    const parsed = parseFloat(sendAmount) || 0;
                    const isExceeding = parsed > availableBalance || availableBalance <= 0;
                    const canContinue = Boolean(sendAmount && parsed > 0 && sendRecipient.trim().length > 0 && !isExceeding);

                    return (
                      <button
                        type="button"
                        onClick={() => setSendSubStep("memo")}
                        disabled={!canContinue}
                        className={`w-full py-4 px-6 rounded-full font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] ${
                          canContinue
                            ? "bg-[#ebaf64] text-black hover:bg-[#f3bc75] shadow-lg shadow-black/60 cursor-pointer"
                            : "bg-black/40 text-white/40 border border-white/10 cursor-not-allowed"
                        }`}
                      >
                        <span>{isExceeding ? "Insufficient SUI Balance" : "Continue"}</span>
                        {!isExceeding && <ArrowRight size={16} />}
                      </button>
                    );
                  })()}
                  <span className="text-[11px] font-mono text-white/35 text-center tracking-tight mt-2.5">
                    Walrus Memory validated · Tatum Sui RPC resolved
                  </span>
                </div>
              </>
            )}

            {/* SUB-STEP 2: COMPULSORY TRUTHFUL MEMO */}
            {sendSubStep === "memo" && (
              <>
                <div className="pt-8 sm:pt-10 px-7 pb-2 shrink-0 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setSendSubStep("amount")}
                    className="self-start text-[#ebaf64]/75 hover:text-[#ebaf64] flex items-center gap-1.5 text-xs font-medium transition-colors active:scale-95"
                  >
                    <ArrowLeft size={14} />
                    <span>Back</span>
                  </button>
                  <div className="text-[28px] sm:text-[32px] font-bold tracking-[0.02em] leading-tight text-[#ebaf64]">
                    What is this for?
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed">
                    Be honest with future you. What are you purchasing or sending?
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-3 flex flex-col gap-4 pb-4 overscroll-contain">
                  {/* Compulsory Memo Input */}
                  <textarea
                    value={sendMemo}
                    onChange={(e) => setSendMemo(e.target.value)}
                    placeholder="e.g. Late-night food delivery..."
                    rows={3}
                    className="w-full bg-black/20 backdrop-blur-2xl border border-[#ebaf64]/25 hover:border-[#ebaf64]/50 focus:border-[#ebaf64] rounded-2xl p-4 text-xs sm:text-sm text-white placeholder-white/30 outline-none transition-colors leading-relaxed resize-none shadow-sm"
                  />

                  {/* Quick Pick Testing Chips for Judges */}
                  <div className="flex flex-col gap-2">
                    {QUICK_MEMO_PICKS.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSendMemo(item.text)}
                        className="bg-black/20 backdrop-blur-2xl border border-[#ebaf64]/20 hover:border-[#ebaf64]/50 text-left px-4 py-3 rounded-2xl transition-all duration-150 active:scale-[0.99] flex items-center justify-between"
                      >
                        <span className="text-xs font-medium text-white/90">
                          {item.label}
                        </span>
                        <ArrowRight size={13} className="text-[#ebaf64]/70" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-5 sm:p-7 pt-2 pb-8 sm:pb-9 bg-transparent shrink-0 flex flex-col items-center">
                  <button
                    type="button"
                    onClick={handleReviewAndCheck}
                    disabled={!sendMemo.trim()}
                    className={`w-full py-4 px-6 rounded-full font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] ${
                      sendMemo.trim()
                        ? "bg-[#ebaf64] text-black hover:bg-[#f3bc75] shadow-lg shadow-black/60 cursor-pointer"
                        : "bg-black/40 text-white/40 border border-white/10 cursor-not-allowed"
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
                  <svg className="w-16 h-16 animate-spin text-[#ebaf64]" viewBox="0 0 64 64">
                    <circle
                      cx="32"
                      cy="32"
                      r="26"
                      fill="none"
                      stroke="rgba(235,175,100,0.15)"
                      strokeWidth="3.5"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="26"
                      fill="none"
                      stroke="#ebaf64"
                      strokeWidth="3.5"
                      strokeDasharray={163.36}
                      strokeDashoffset={110}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <div
                  key={checkingProgressStage}
                  className="text-xl sm:text-2xl font-bold text-[#ebaf64] tracking-tight animate-in fade-in zoom-in-95 duration-200 min-h-[36px] flex items-center justify-center px-4"
                >
                  {checkingProgressStage || "Auditing transaction..."}
                </div>

                <div className="text-xs font-mono text-white/50 mt-2">
                  Verifying resolution adherence & solvency
                </div>
              </div>
            )}

            {/* SUB-STEP: APPROVED MORPH STATE */}
            {sendSubStep === "approved" && (
              <div className="flex-1 flex flex-col items-center justify-center px-7 text-center animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-[#ebaf64] text-black flex items-center justify-center mb-6 shadow-2xl">
                  <Check size={32} strokeWidth={3} />
                </div>
                <div className="text-xl font-bold text-white tracking-tight">
                  Transfer Approved
                </div>
                <div className="text-xs font-mono text-[#ebaf64]/80 mt-2">
                  Resolution adherence verified · 0 penalties applied
                </div>
              </div>
            )}

            {/* SUB-STEP 4: WALLY MEMORY INTERVENTION / ROAST */}
            {sendSubStep === "breach" && (
              <>
                <div className="pt-8 sm:pt-10 px-7 pb-3 flex flex-col gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={closeSendFlow}
                    className="self-start text-[#ebaf64]/75 hover:text-[#ebaf64] flex items-center gap-1.5 text-xs font-medium transition-colors active:scale-95"
                  >
                    <ArrowLeft size={14} />
                    <span>Back</span>
                  </button>
                  <div className="text-[28px] sm:text-[32px] font-bold tracking-[0.02em] leading-tight text-[#ebaf64]">
                    Hold on.
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-2 flex flex-col gap-3.5 pb-4 overscroll-contain">
                  <div className="bg-black/20 backdrop-blur-2xl border border-[#ebaf64]/25 rounded-3xl p-6 flex flex-col gap-4 shadow-md">
                    <p className="text-base sm:text-lg text-white font-normal leading-relaxed">
                      {wallyRoast ||
                        synthesizeWallyIntervention({
                          ruleTitle: matchedRuleTitle || "Resolution",
                          motivation: matchedRuleMotivation,
                          condition: matchedRuleCondition,
                          recipient: sendRecipient,
                          memo: sendMemo,
                          amountSui: parseFloat(sendAmount) || 0.05,
                          repeatCount: repeatInfractionCount,
                        })}
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        const targetBlob = matchedRuleBlobId || walrusBlobId || "walrus_blob_rule_sarah_01";
                        // Ensure blob exists in walrusBlobs so it displays when drawer opens
                        setWalrusBlobs((prev) => {
                          if (prev.some((b) => b.blobId === targetBlob)) return prev;
                          return [
                            {
                              blobId: targetBlob,
                              type: "resolution_contract",
                              title: `Resolution: ${matchedRuleTitle || "Committed Oath"}`,
                              timestamp: "Genesis",
                              payload: {
                                protocol: "Yearbound v1",
                                storage: "Walrus Memory (MemWal)",
                                type: "commitment_rule",
                                title: matchedRuleTitle,
                                behavioralRule: matchedRuleCondition,
                                why_it_matters: matchedRuleMotivation,
                                penaltySui: breachPenaltySui || 0.05,
                                status: "active",
                              },
                            },
                            ...prev,
                          ];
                        });
                        setExpandedJsonBlobId(targetBlob);
                        setIsMemoryInspectorOpen(true);
                      }}
                      className="flex items-center gap-1.5 text-xs font-mono text-[#ebaf64] hover:text-[#f3bc75] transition-colors pt-3 border-t border-white/10 self-start cursor-pointer active:scale-95"
                    >
                      <Database size={13} />
                      <span>
                        View Walrus memory payload{" "}
                        {matchedRuleBlobId ? `(#${matchedRuleBlobId.replace("walrus_blob_", "").slice(0, 12)}...)` : ""}
                      </span>
                      <ExternalLink size={11} className="text-[#ebaf64]/70" />
                    </button>
                  </div>
                </div>

                {/* Actions: Cancel vs Pay Fine */}
                <div className="p-5 sm:p-7 pt-2 pb-8 sm:pb-9 bg-transparent shrink-0 flex flex-col gap-2.5 items-center">
                  <button
                    type="button"
                    onClick={() => setSendSubStep("honored")}
                    className="w-full py-4 px-6 rounded-full font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 bg-[#ebaf64] text-black hover:bg-[#f3bc75] active:scale-[0.98] shadow-lg shadow-black/60 cursor-pointer"
                  >
                    <span>Cancel & Honor Resolution</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePayFineAndProceed}
                    disabled={isSubmitting}
                    className="w-full py-2.5 text-center text-xs font-medium text-white/60 hover:text-white transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block shrink-0" />
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
                <div className="pt-8 sm:pt-10 px-7 pb-3 flex flex-col gap-2 shrink-0">
                  <div className="text-[28px] sm:text-[32px] font-bold tracking-[0.02em] leading-tight text-[#ebaf64]">
                    Resolution Honored
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed">
                    You chose discipline over impulse. Your streak stays intact and 0 SUI was forfeited.
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-2 flex flex-col gap-4 pb-4 overscroll-contain">
                  <div className="bg-black/20 backdrop-blur-2xl border border-[#ebaf64]/25 rounded-3xl p-5 flex flex-col gap-3.5 shadow-md">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-[#ebaf64]">
                        Discipline Report
                      </span>
                      <span className="text-xs font-mono text-emerald-400">Streak Intact</span>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/10 pt-3">
                      <span className="text-xs text-white/70">Transfer Status</span>
                      <span className="text-xs text-white font-medium">Cancelled by User</span>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/10 pt-2.5">
                      <span className="text-xs text-white/70">Penalty Avoided</span>
                      <span className="text-xs font-mono font-semibold text-[#ebaf64]">10 SUI</span>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/10 pt-2.5">
                      <span className="text-xs text-white/50">Memory Ledger</span>
                      <span className="text-xs font-mono text-white/70">No Infraction Committed</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 sm:p-7 pt-2 pb-8 sm:pb-9 bg-transparent shrink-0 flex flex-col items-center">
                  <button
                    type="button"
                    onClick={closeSendFlow}
                    className="w-full py-4 px-6 rounded-full font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 bg-[#ebaf64] text-black hover:bg-[#f3bc75] active:scale-[0.98] shadow-lg shadow-black/60 cursor-pointer"
                  >
                    <span>Back to Dashboard</span>
                  </button>
                </div>
              </div>
            )}

            {/* SUB-STEP: INFRACTION RECORDED (ANTI-CONGRATULATIONS / SOBERING REALITY) */}
            {sendSubStep === "penalty_recorded" && (
              <div className="flex-1 flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
                <div className="pt-8 sm:pt-10 px-7 pb-3 flex flex-col gap-2 shrink-0">
                  <div className="text-[28px] sm:text-[32px] font-bold tracking-[0.02em] leading-tight text-[#ebaf64]">
                    Penalty Recorded
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed">
                    {breachPenaltySui || 10} SUI penalty has been processed via x402 and inscribed to Walrus memory.
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-2 flex flex-col gap-4 pb-4 overscroll-contain">
                  <div className="bg-black/20 backdrop-blur-2xl border border-[#ebaf64]/25 rounded-3xl p-5 flex flex-col gap-3.5 shadow-md">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-[#ebaf64]">
                        Infraction Log
                      </span>
                      <span className="text-xs font-mono text-red-400">Breach Enforced</span>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/10 pt-3">
                      <span className="text-xs text-white/70">Penalty Deposit</span>
                      <span className="text-xs font-mono font-semibold text-white">
                        {breachPenaltySui || 10} SUI → x402 Vault
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/10 pt-2.5">
                      <span className="text-xs text-white/70">Settlement Engine</span>
                      <span className="text-xs font-mono text-white/80">
                        {latestSettlement?.isRealOnChain
                          ? "Sui Mainnet PTB (Tatum Gateway)"
                          : "Agent Cryptographic Debt Voucher"}
                      </span>
                    </div>

                    {latestSettlement?.isRealOnChain && latestSettlement?.txHash && (
                      <div className="flex items-center justify-between border-t border-white/10 pt-2.5">
                        <span className="text-xs text-white/70">On-Chain Digest</span>
                        <a
                          href={latestSettlement.explorerUrl || `https://suiscan.xyz/mainnet/tx/${latestSettlement.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-mono text-[#ebaf64] hover:underline flex items-center gap-1"
                        >
                          <span>{latestSettlement.txHash.slice(0, 10)}...</span>
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    )}

                    {!latestSettlement?.isRealOnChain && latestSettlement?.voucherSignature && (
                      <div className="flex items-center justify-between border-t border-white/10 pt-2.5">
                        <span className="text-xs text-white/70">x402 Signature</span>
                        <span
                          className="text-[11px] font-mono text-white/50 truncate max-w-[180px]"
                          title={latestSettlement.voucherSignature}
                        >
                          ed25519_{latestSettlement.voucherSignature.slice(0, 12)}...
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-white/10 pt-2.5">
                      <span className="text-xs text-white/70">Lock Expiry</span>
                      <span className="text-xs text-white/80">{unlockDate}</span>
                    </div>

                    <div className="flex items-center justify-between bg-black/30 border border-[#ebaf64]/30 rounded-2xl px-3.5 py-2.5 mt-1">
                      <span className="text-[11px] font-mono text-white/70 truncate mr-2">
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
                        className="text-[#ebaf64]/75 hover:text-[#ebaf64] p-1 transition-colors shrink-0"
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
                        className="text-[11px] text-[#ebaf64] hover:underline flex items-center gap-1 font-mono pt-0.5"
                      >
                        <span>Inspect on Walrus Aggregator</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>

                <div className="p-5 sm:p-7 pt-2 pb-8 sm:pb-9 bg-transparent shrink-0 flex flex-col items-center">
                  <button
                    type="button"
                    onClick={closeSendFlow}
                    className="w-full py-4 px-6 rounded-full font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 bg-[#ebaf64] text-black hover:bg-[#f3bc75] active:scale-[0.98] shadow-lg shadow-black/60 cursor-pointer"
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
            <div className="w-full max-w-[420px] bg-black/40 backdrop-blur-3xl border border-[#ebaf64]/30 rounded-t-[32px] sm:rounded-[32px] p-6 flex flex-col gap-5 shadow-2xl animate-in slide-in-from-bottom-6 duration-300">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-[#ebaf64]">
                    Add Resolution
                  </span>
                  <span className="text-[11px] font-mono text-white/50">
                    Commits directly to Walrus Memory
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddResolutionOpen(false)}
                  className="p-1.5 text-white/50 hover:text-white rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#ebaf64]/80">
                    Resolution Title
                  </label>
                  <input
                    type="text"
                    value={newRuleTitle}
                    onChange={(e) => setNewRuleTitle(e.target.value)}
                    placeholder="e.g. No Late-Night Uber Eats"
                    className="w-full bg-black/30 border border-[#ebaf64]/30 rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 outline-none focus:border-[#ebaf64] transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#ebaf64]/80">
                    Enforced Boundary Condition
                  </label>
                  <textarea
                    rows={2}
                    value={newRuleCondition}
                    onChange={(e) => setNewRuleCondition(e.target.value)}
                    placeholder="e.g. Reject any takeout food orders after 10 PM on weekdays"
                    className="w-full bg-black/30 border border-[#ebaf64]/30 rounded-2xl px-3.5 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-[#ebaf64] transition-colors resize-none"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-[#ebaf64]/80">
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
                          className={`py-2 text-center rounded-2xl text-xs font-mono transition-all duration-150 active:scale-95 ${
                            isSelected
                              ? "bg-[#ebaf64] text-black font-semibold shadow-sm"
                              : "bg-black/40 text-white/70 border border-[#ebaf64]/30 hover:border-[#ebaf64]/60 hover:text-white"
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
                      ? "bg-[#ebaf64] text-black hover:bg-[#f3bc75] active:scale-[0.98] shadow-md cursor-pointer"
                      : "bg-black/40 text-white/30 border border-white/10 cursor-not-allowed"
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
