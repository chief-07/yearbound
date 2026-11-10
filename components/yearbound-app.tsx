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
import { isValidSuiAddress } from "@mysten/sui/utils";
import {
  executeX402VaultDeposit,
  YEARBOUND_VAULT_ADDRESS,
  YEARBOUND_TESTNET_VAULT_ADDRESS,
} from "@/lib/vault-x402";
import {
  DEFAULT_GENESIS_PLEDGE_SUI,
  MAINNET_DUAL_TX_GAS_BUFFER_SUI,
  MAINNET_MIN_GAS_BUFFER_SUI,
  checkMainnetPenaltySolvency,
  checkMainnetTransferReadiness,
  getVaultDisplayState,
} from "@/lib/real-account";
import { synthesizeWallyIntervention } from "@/lib/wally-synthesizer";
import { DisciplineGrid } from "@/components/discipline-grid";
import { TimeTravelScrubber, type TimeMilestone } from "@/components/time-travel-scrubber";
import { AppTour, type TourStepConfig } from "@/components/app-tour";

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

export interface SavedBrowserPact {
  version: 1;
  savedAt: string;
  accountType: AccountType;
  walletAddress: string;
  rules: RuleItem[];
  escrowDeposit: number;
  initialPledgeSui?: number;
  walrusBlobId: string;
  walrusBlobs: WalrusMemoryBlob[];
  infractions: InfractionRecord[];
  isVaultClaimed?: boolean;
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

  // Live Date (Short weekday e.g. 'Thur, Jan 1', no year)
  const formatShortCalendarDate = (d: Date): string => {
    const weekdayRaw = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(d);
    const weekday = weekdayRaw === "Thu" ? "Thur" : weekdayRaw;
    const monthDay = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(d);
    return `${weekday}, ${monthDay}`;
  };

  const [currentDateStr, setCurrentDateStr] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const demo = getDemoAddress();
      if (demo) {
        setDemoAddress(demo);
        refreshLiveBalance(demo, "demo");
      }
    }
    setCurrentDateStr(formatShortCalendarDate(new Date()));
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
  const [initialPledgeSui, setInitialPledgeSui] = useState<number>(0);
  const [isLockingInitialPledge, setIsLockingInitialPledge] = useState<boolean>(false);
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
  const [focusedMemoryBlobId, setFocusedMemoryBlobId] = useState<string | null>(null);
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
    recipientTxHash?: string;
    recipientExplorerUrl?: string;
    provider: string;
    message?: string;
  } | null>(null);

  // Degraded Mode (Stateless mode with Walrus Memory & Tatum Gateway disabled)
  const [isDegradedMode, setIsDegradedMode] = useState<boolean>(false);
  const isDegradedModeRef = useRef<boolean>(false);
  const prevDegradedModeRef = useRef<boolean>(false);
  const [tatumDisabledNotice, setTatumDisabledNotice] = useState<string>("");

  // Interactive First-Entry Tour state
  const shellRef = useRef<HTMLDivElement | null>(null);
  const TOUR_STORAGE_KEY = "yearbound_tour_done_v1";
  const [isTourOpen, setIsTourOpen] = useState<boolean>(false);
  const [tourIndex, setTourIndex] = useState<number>(0);

  // Walrus Cold-Boot Hydration & Compounding Pattern Synthesis state
  const [isHydrating, setIsHydrating] = useState<boolean>(false);
  const [hasHydratedFromWalrus, setHasHydratedFromWalrus] = useState<boolean>(false);
  const [behavioralPatterns, setBehavioralPatterns] = useState<any[]>([]);
  const [hydratedPactId, setHydratedPactId] = useState<string | null>(null);

  // AI-Synthesized Wally Home Screen Briefing
  const [wallyBriefing, setWallyBriefing] = useState<string>("");
  const [isLoadingWallyBriefing, setIsLoadingWallyBriefing] = useState<boolean>(false);
  const [briefingRefreshTick, setBriefingRefreshTick] = useState<number>(0);
  const briefingAbortRef = useRef<AbortController | null>(null);
  const balanceSyncTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const justCommittedGenesisRef = useRef<boolean>(false);

  // Screen 0: Sign In & Restore state
  const SAVED_PACT_STORAGE_KEY = "yearbound_saved_pact_v1";
  const [savedBrowserPact, setSavedBrowserPact] = useState<SavedBrowserPact | null>(null);
  const [restoreInput, setRestoreInput] = useState<string>("");
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [showRestoreInput, setShowRestoreInput] = useState<boolean>(false);

  // Time-Travel Scrubber state (Demo account only)
  const [activeMilestone, setActiveMilestone] = useState<TimeMilestone>("jan1");
  const [currentDayOfYear, setCurrentDayOfYear] = useState<number>(1);
  const [isVaultUnlocked, setIsVaultUnlocked] = useState<boolean>(false);
  const [isVaultClaimed, setIsVaultClaimed] = useState<boolean>(false);
  const [isChristmasBannerDismissed, setIsChristmasBannerDismissed] = useState<boolean>(false);
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
  const [sendRecipient, setSendRecipient] = useState<string>("");
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

  // Initialize real persistent self-custodial Sui keypair, detect extensions, and check saved browser pact
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

      try {
        const raw = localStorage.getItem(SAVED_PACT_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as SavedBrowserPact;
          if (
            parsed &&
            parsed.version === 1 &&
            typeof parsed.walletAddress === "string" &&
            parsed.walletAddress.length > 0 &&
            Array.isArray(parsed.rules) &&
            parsed.rules.length > 0
          ) {
            setSavedBrowserPact(parsed);
          }
        }
      } catch (err) {
        console.warn("[Browser Pact] Failed to inspect saved pact:", err);
      }
    }
  }, []);

  // Connect to detected Sui wallet extension
  const handleConnectExtension = async () => {
    setIsConnectingExtension(true);
    try {
      const res = await connectExtensionWallet();
      setLinkedAddress(res.address);
      setAccountType("linked");
      setLiveOnChainBalanceSui(null);
      setAvailableBalance(0);
      triggerSnackbar("Wallet Connected", `${res.walletName}: ${res.address.slice(0, 10)}...`);
      refreshLiveBalance(res.address, "linked");
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
      setLiveOnChainBalanceSui(null);
      setAvailableBalance(0);
      triggerSnackbar("Wallet Connected", `${res.walletName}: ${res.address.slice(0, 10)}...`);
      refreshLiveBalance(res.address, "linked");
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
        if (!isValidSuiAddress(input)) {
          triggerSnackbar("Invalid Sui Address", "Enter a valid 0x Sui Mainnet address or Walrus Blob ID");
          return;
        }
        setLinkedAddress(input);
        setAccountType("linked");
        setLiveOnChainBalanceSui(null);
        setAvailableBalance(0);
        refreshLiveBalance(input, "linked");
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

  // Persist current pact session to browser storage (excluding simulated time-travel entries)
  const persistBrowserPact = (snapshot: SavedBrowserPact) => {
    const cleaned: SavedBrowserPact = {
      ...snapshot,
      rules: snapshot.rules.filter((r) => r.title.trim().length > 0),
      infractions: (snapshot.infractions || []).filter((i) => i.source !== "timeline").slice(0, 50),
      walrusBlobs: (snapshot.walrusBlobs || [])
        .filter((b) => !b.title.startsWith("Milestone "))
        .slice(0, 40),
    };
    if (!cleaned.walletAddress || cleaned.rules.length === 0) return;
    setSavedBrowserPact(cleaned);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(SAVED_PACT_STORAGE_KEY, JSON.stringify(cleaned));
      } catch (err) {
        console.warn("[Browser Pact] Could not persist snapshot:", err);
      }
    }
  };

  // Keep browser-saved pact synced whenever user is on the live dashboard (not simulated time-travel)
  useEffect(() => {
    if (step !== 4 || activeMilestone !== "jan1") return;
    const activeAddr =
      accountType === "demo"
        ? (demoAddress || DEMO_SUI_ADDRESS)
        : accountType === "real"
        ? realAddress
        : linkedAddress;
    const nonEmptyRules = rules.filter((r) => r.title.trim().length > 0);
    if (!activeAddr || nonEmptyRules.length === 0) return;

    persistBrowserPact({
      version: 1,
      savedAt: new Date().toISOString(),
      accountType,
      walletAddress: activeAddr,
      rules: nonEmptyRules,
      escrowDeposit,
      initialPledgeSui,
      walrusBlobId,
      walrusBlobs,
      infractions,
      isVaultClaimed,
    });
  }, [
    step,
    activeMilestone,
    accountType,
    demoAddress,
    realAddress,
    linkedAddress,
    rules,
    escrowDeposit,
    initialPledgeSui,
    walrusBlobId,
    walrusBlobs,
    infractions,
    isVaultClaimed,
  ]);

  // Screen 0: 1-tap restore of previously completed pact detected in this browser
  const handleRestoreFromBrowser = () => {
    let pact = savedBrowserPact;
    if (!pact && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(SAVED_PACT_STORAGE_KEY);
        if (raw) pact = JSON.parse(raw) as SavedBrowserPact;
      } catch {}
    }
    if (!pact) {
      triggerSnackbar("No Saved Pact Found", "Create a new pact or restore via Walrus ID.");
      return;
    }

    setIsDegradedMode(false);
    isDegradedModeRef.current = false;
    setAccountType(pact.accountType);
    if (pact.accountType === "demo" && pact.walletAddress) {
      setDemoAddress(pact.walletAddress);
    } else if (pact.accountType === "real" && pact.walletAddress) {
      setRealAddress(pact.walletAddress);
    } else if (pact.accountType === "linked" && pact.walletAddress) {
      setLinkedAddress(pact.walletAddress);
    }

    setRules(pact.rules);
    const restoredEscrow =
      typeof pact.escrowDeposit === "number" && Number.isFinite(pact.escrowDeposit)
        ? Math.max(0, pact.escrowDeposit)
        : 0;
    const restoredInitial =
      typeof pact.initialPledgeSui === "number" && Number.isFinite(pact.initialPledgeSui)
        ? Math.max(0, pact.initialPledgeSui)
        : pact.accountType === "demo" && restoredEscrow >= DEFAULT_GENESIS_PLEDGE_SUI
        ? DEFAULT_GENESIS_PLEDGE_SUI
        : 0;
    setEscrowDeposit(restoredEscrow);
    setInitialPledgeSui(restoredInitial);
    setLiveOnChainBalanceSui(null);
    setAvailableBalance(0);
    if (pact.walrusBlobId) {
      setWalrusBlobId(pact.walrusBlobId);
    }
    if (Array.isArray(pact.walrusBlobs) && pact.walrusBlobs.length > 0) {
      setWalrusBlobs(pact.walrusBlobs);
    }
    setInfractions(Array.isArray(pact.infractions) ? pact.infractions : []);
    setIsVaultClaimed(Boolean(pact.isVaultClaimed));

    // Start cleanly in live present-day mode and sync balance/inflow from network
    setActiveMilestone("jan1");
    setCurrentDayOfYear(1);
    setIsVaultUnlocked(false);
    setCurrentDateStr(formatShortCalendarDate(new Date()));
    justCommittedGenesisRef.current = true;
    setBriefingRefreshTick((t) => t + 1);
    setStep(4);
    setActiveTab("home");

    triggerSnackbar(
      "Restored from Browser",
      `${pact.accountType === "demo" ? "Testnet" : pact.accountType === "real" ? "Mainnet" : "Linked"} · ${pact.walletAddress.slice(0, 6)}...${pact.walletAddress.slice(-4)}`,
      pact.walrusBlobId
    );
  };

  // Fetch live on-chain balance via Tatum Gateway (always bypasses HTTP cache)
  const refreshLiveBalance = async (
    targetAddress?: string,
    explicitMode?: AccountType,
    opts?: { syncRetry?: boolean }
  ): Promise<number | null> => {
    if (isDegradedModeRef.current) return null;

    const currentMode = explicitMode || accountType;
    const addr =
      targetAddress ||
      (currentMode === "real"
        ? realAddress
        : currentMode === "demo"
        ? (demoAddress || DEMO_SUI_ADDRESS)
        : linkedAddress);
    if (!addr || !addr.startsWith("0x")) return null;
    const network = currentMode === "demo" ? "testnet" : "mainnet";

    const fetchOnce = async (): Promise<number | null> => {
      if (isDegradedModeRef.current) return null;
      setIsCheckingLiveBalance(true);
      try {
        const res = await fetch(
          `/api/sui/balance?address=${encodeURIComponent(addr)}&network=${network}&_=${Date.now()}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (isDegradedModeRef.current) return null;
        if (data.success && typeof data.balanceSui === "number" && data.isLive !== false) {
          setLiveOnChainBalanceSui(data.balanceSui);
          setAvailableBalance(data.balanceSui);
          return data.balanceSui;
        }
      } catch (err) {
        console.warn("Failed to query live balance:", err);
      } finally {
        setIsCheckingLiveBalance(false);
      }
      return null;
    };

    const result = await fetchOnce();

    if (opts?.syncRetry && !isDegradedModeRef.current) {
      balanceSyncTimersRef.current.forEach((id) => clearTimeout(id));
      balanceSyncTimersRef.current = [
        setTimeout(() => {
          if (!isDegradedModeRef.current) fetchOnce().catch(() => {});
        }, 2200),
        setTimeout(() => {
          if (!isDegradedModeRef.current) fetchOnce().catch(() => {});
        }, 4800),
      ];
    }

    return result;
  };

  // Request 1.00 SUI Testnet Gas from the official PoW faucet
  const handleRequestFaucet = async (
    targetAddr?: string,
    opts?: { quietStartSnackbar?: boolean; quietResultSnackbar?: boolean; maxTimeoutMs?: number }
  ): Promise<{ success: boolean; digest?: string; amountSui?: number; error?: string }> => {
    if (isDegradedModeRef.current) {
      return { success: false, error: "Tatum & Walrus are disabled" };
    }
    const addr = targetAddr || (demoAddress || DEMO_SUI_ADDRESS);
    setIsRequestingFaucet(true);
    if (!opts?.quietStartSnackbar) {
      triggerSnackbar("Requesting Faucet Gas", "Solving PoW challenge & claiming 1.00 SUI on Testnet...");
    }
    try {
      const res = await fetch("/api/sui/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(opts?.maxTimeoutMs || 115000),
        body: JSON.stringify({ address: addr, network: "testnet" }),
      });
      const data = await res.json();
      if (data.success) {
        if (!opts?.quietResultSnackbar) {
          triggerSnackbar("Faucet Success (+1.00 SUI)", `Tx: ${data.digest.slice(0, 10)}...`);
        }
        await refreshLiveBalance(addr, "demo", { syncRetry: true });
        return { success: true, digest: data.digest, amountSui: data.amountSui || 1 };
      } else {
        if (!opts?.quietResultSnackbar) {
          triggerSnackbar("Faucet Notice", data.error || "Please wait before requesting again");
        }
        return { success: false, error: data.error || "Faucet error" };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Faucet timeout";
      if (!opts?.quietResultSnackbar) {
        triggerSnackbar("Faucet Notice", "Faucet request timed out or rate-limited. Please retry shortly.");
      }
      return { success: false, error: msg };
    } finally {
      setIsRequestingFaucet(false);
    }
  };

  // Walrus Cold-Boot Hydration: reconstruct state from decentralized memory blobs
  const hydrateFromWalrus = async (targetAddress?: string) => {
    if (isDegradedModeRef.current) return;
    const addr =
      targetAddress ||
      (accountType === "demo"
        ? (demoAddress || DEMO_SUI_ADDRESS)
        : accountType === "real"
        ? realAddress
        : linkedAddress);
    setIsHydrating(true);
    try {
      const res = await fetch(`/api/walrus/hydrate?address=${encodeURIComponent(addr || "")}`);
      const data = await res.json();
      if (data && data.success) {
        setHasHydratedFromWalrus(true);
        if (data.pact) {
          setHydratedPactId(data.pact.pact_id || data.pact.blob_id || null);
          const restoredInitial = data.pact.initial_deposit_sui;
          if (typeof restoredInitial === "number" && restoredInitial >= 0) {
            setInitialPledgeSui(restoredInitial);
          }
          const restoredEscrow = data.pact.x402_escrow_deposit_sui ?? data.pact.initial_deposit_sui;
          if (typeof restoredEscrow === "number" && restoredEscrow >= 0) {
            setEscrowDeposit(restoredEscrow);
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
              blobId: r.blob_id || `walrus_blob_rule_${r.rule_id || idx + 1}`,
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
          data.rules.forEach((r: any, idx: number) => {
            hydratedBlobs.push({
              blobId: r.blob_id || `walrus_blob_rule_${r.rule_id || idx + 1}`,
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
    if (isDegradedModeRef.current) return;
    const addr =
      targetAddress ||
      (accountType === "demo"
        ? (demoAddress || DEMO_SUI_ADDRESS)
        : accountType === "real"
        ? realAddress
        : linkedAddress);
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

  // Keep degraded-mode ref synced, abort pending Tatum/Walrus timers when disabled, and re-sync when re-enabled
  useEffect(() => {
    isDegradedModeRef.current = isDegradedMode;
    const wasDegraded = prevDegradedModeRef.current;
    prevDegradedModeRef.current = isDegradedMode;

    if (isDegradedMode) {
      balanceSyncTimersRef.current.forEach((id) => clearTimeout(id));
      balanceSyncTimersRef.current = [];
      setIsCheckingLiveBalance(false);
      setIsLoadingWallyBriefing(false);
      setIsAddResolutionOpen(false);
      setIsMemoryInspectorOpen(false);
    } else {
      setTatumDisabledNotice("");
      if (wasDegraded && step === 4) {
        refreshLiveBalance(undefined, accountType, { syncRetry: true });
        refreshInflowMetrics();
      }
    }
  }, [isDegradedMode]);

  // Run hydration, live balance sync, and Tatum on-chain telemetry when entering dashboard or switching active account
  useEffect(() => {
    if (step === 4 && !isDegradedModeRef.current) {
      refreshLiveBalance(undefined, accountType, { syncRetry: true });
      if (justCommittedGenesisRef.current) {
        justCommittedGenesisRef.current = false;
      } else {
        hydrateFromWalrus();
      }
      refreshInflowMetrics();
    }
  }, [step, accountType]);

  // Auto-sync live balance when returning to Home tab, switching browser tabs, or refocusing the window
  useEffect(() => {
    if (step !== 4 || isDegradedModeRef.current) return;
    if (activeTab === "home") {
      refreshLiveBalance(undefined, accountType);
    }
    const handleWindowFocus = () => {
      if (!isDegradedModeRef.current) {
        refreshLiveBalance(undefined, accountType);
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !isDegradedModeRef.current) {
        refreshLiveBalance(undefined, accountType);
      }
    };
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [step, accountType, activeTab]);

  // AI-Synthesized Wally Home Screen Briefing backed by Walrus Memory
  useEffect(() => {
    if (step !== 4 || isDegradedMode) return;

    if (briefingAbortRef.current) {
      briefingAbortRef.current.abort();
    }
    const controller = new AbortController();
    briefingAbortRef.current = controller;

    const activeAccountAddress =
      accountType === "demo"
        ? (demoAddress || DEMO_SUI_ADDRESS)
        : accountType === "real"
        ? realAddress
        : linkedAddress;

    const activeList = rules.filter((r) => r.title.trim().length > 0);
    setIsLoadingWallyBriefing(true);

    fetch("/api/wally-briefing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        walletAddress: activeAccountAddress,
        rules: activeList.map((r) => ({
          title: r.title,
          condition: r.condition,
          whyItMatters: r.whyItMatters,
          penalty: r.penalty,
          breaches: r.breaches || 0,
        })),
        infractions: infractions.slice(0, 10).map((i) => ({
          ruleTitle: i.ruleTitle,
          verdict: i.verdict,
          memo: i.memo,
          timestamp: i.timestamp,
          penaltySui: i.penaltySui,
          amount: i.amount,
        })),
        availableBalance,
        escrowDeposit,
        currentDateStr,
        activeMilestone,
        isVaultUnlocked,
        isVaultClaimed,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!controller.signal.aborted && data?.message) {
          setWallyBriefing(data.message);
        }
      })
      .catch((err) => {
        if (err?.name !== "AbortError") {
          console.warn("[Wally Briefing] Fetch notice:", err);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingWallyBriefing(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [
    step,
    accountType,
    isDegradedMode,
    activeMilestone,
    isVaultUnlocked,
    isVaultClaimed,
    briefingRefreshTick,
  ]);

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

  // Step 3 Submission to Walrus, Auto-Claim (2 SUI Testnet for Demo), & x402 Vault Lock
  const handleLockVault = async () => {
    const activeRules = rules.filter((r) => r.title.trim().length > 0);
    const activeAccountAddress =
      accountType === "demo"
        ? (demoAddress || DEMO_SUI_ADDRESS)
        : accountType === "real"
        ? realAddress
        : linkedAddress;

    if (accountType === "linked" && !isValidSuiAddress((activeAccountAddress || "").trim())) {
      triggerSnackbar(
        "Valid Mainnet Address Required",
        "Connect a Sui wallet extension or enter a valid 0x address before continuing."
      );
      return;
    }
    if (accountType === "real" && !isValidSuiAddress((activeAccountAddress || "").trim())) {
      triggerSnackbar("Mainnet Keypair Unavailable", "Could not derive self-custodial Mainnet address.");
      return;
    }

    setIsSubmitting(true);
    setSealingProgress(18);
    setSealingStage(
      accountType === "demo"
        ? "Checking Testnet balance..."
        : "Querying live Sui Mainnet balance..."
    );

    const targetGenesisPledgeSui = DEFAULT_GENESIS_PLEDGE_SUI;
    let actualGenesisPledge = 0;
    let vaultSettlement: Awaited<ReturnType<typeof executeX402VaultDeposit>> | null = null;
    let claimedDrops = 0;

    try {
      const initialBal = await refreshLiveBalance(activeAccountAddress, accountType);

      if (accountType === "demo") {
        // Demo Mode: Auto-claim up to 2.00 SUI Testnet Gas during onboarding loading
        let currentDemoBal = initialBal;
        if (currentDemoBal === null || currentDemoBal < 1.95) {
          const dropsNeeded = currentDemoBal !== null && currentDemoBal >= 0.95 ? 1 : 2;
          for (let drop = 1; drop <= dropsNeeded; drop++) {
            setSealingProgress(drop === 1 ? 40 : 60);
            setSealingStage(`Claiming 2.00 SUI Testnet gas (${drop}/${dropsNeeded})...`);
            const claimRes = await handleRequestFaucet(activeAccountAddress, {
              quietStartSnackbar: true,
              quietResultSnackbar: true,
              maxTimeoutMs: 115000,
            });
            if (!claimRes.success) {
              break;
            }
            claimedDrops++;
            if (drop < dropsNeeded) {
              await new Promise((r) => setTimeout(r, 600));
              const updatedBal = await refreshLiveBalance(activeAccountAddress, "demo");
              if (updatedBal !== null) currentDemoBal = updatedBal;
              if (currentDemoBal !== null && currentDemoBal >= 1.95) break;
            }
          }
          if (claimedDrops > 0) {
            await new Promise((r) => setTimeout(r, 1200));
          }
        }

        setSealingProgress(74);
        setSealingStage("Locking 0.20 SUI in Testnet x402 vault...");
        try {
          vaultSettlement = await executeX402VaultDeposit({
            amountSui: targetGenesisPledgeSui,
            reason: "Genesis Commitment Pledge",
            commitmentId: "pact_primary",
            walletMode: "demo",
            privateKeySecret: exportDemoPrivateKeyHex() || undefined,
            senderAddress: activeAccountAddress,
          });
        } catch (vaultDepositErr) {
          console.warn("[x402 Genesis Vault] Demo deposit notice:", vaultDepositErr);
        }
        actualGenesisPledge = targetGenesisPledgeSui;
      } else {
        // Strict Sui Mainnet Mode ("real" | "linked"):
        // Never fabricate an initial 0.20 SUI balance when the Mainnet wallet is unfunded.
        const knownBal = initialBal ?? 0;
        const minRequiredForInitialLock = targetGenesisPledgeSui + MAINNET_DUAL_TX_GAS_BUFFER_SUI;

        if (knownBal >= minRequiredForInitialLock) {
          if (accountType === "linked" && !detectInstalledSuiWallet()) {
            triggerSnackbar(
              "Extension Required",
              "Connect a Sui wallet extension to sign the 0.20 SUI Mainnet vault deposit."
            );
            return;
          }

          setSealingProgress(62);
          setSealingStage(
            accountType === "linked"
              ? "Approve 0.20 SUI Mainnet lock in wallet..."
              : "Locking 0.20 SUI on Sui Mainnet..."
          );

          try {
            const privateKey =
              accountType === "real" ? exportRealPrivateKeyHex() || undefined : undefined;
            const res = await executeX402VaultDeposit({
              amountSui: targetGenesisPledgeSui,
              reason: "Genesis Commitment Pledge",
              commitmentId: "pact_primary",
              walletMode: accountType,
              privateKeySecret: privateKey,
              senderAddress: activeAccountAddress,
            });
            if (!res.isRealOnChain || !res.txHash) {
              throw new Error("Mainnet x402 lock did not produce an on-chain digest.");
            }
            vaultSettlement = res;
            actualGenesisPledge = targetGenesisPledgeSui;
          } catch (mainnetLockErr) {
            const errMsg =
              mainnetLockErr instanceof Error
                ? mainnetLockErr.message
                : "Mainnet x402 deposit did not settle on-chain.";
            triggerSnackbar("Mainnet Vault Not Locked", errMsg);
            return;
          }
        } else {
          // Wallet has 0 SUI (or less than 0.205 SUI): enter with honest 0.00 SUI vault.
          actualGenesisPledge = 0;
          vaultSettlement = null;
        }
      }

      setSealingProgress(88);
      setSealingStage("Committing resolutions to Walrus Memory...");

      const walrusRes = await fetch("/api/walrus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          rules: activeRules,
          initialDepositSui: actualGenesisPledge,
          unlockDate: "2026-12-25",
          walletAddress: activeAccountAddress,
          accountType,
        }),
      })
        .then((r) => r.json())
        .catch((fetchErr) => {
          console.warn(`[Vault] Submission notice:`, fetchErr);
          return null;
        });

      const data =
        walrusRes && (walrusRes.success || walrusRes.genesisBlobId || walrusRes.primaryBlobId)
          ? walrusRes
          : null;

      let resolvedGenesisId = walrusBlobId;

      if (data && (data.genesisBlobId || data.primaryBlobId)) {
        const genesisId = data.genesisBlobId || data.primaryBlobId;
        resolvedGenesisId = genesisId;
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
            x402VaultLock:
              actualGenesisPledge > 0
                ? `${actualGenesisPledge.toFixed(2)} SUI until ${unlockDate}`
                : "0.00 SUI (Awaiting Mainnet funding)",
            isRealOnChain: Boolean(vaultSettlement?.isRealOnChain),
            vaultTxHash: vaultSettlement?.txHash || null,
            explorerUrl: vaultSettlement?.explorerUrl || null,
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
      }

      setInitialPledgeSui(actualGenesisPledge);
      setEscrowDeposit(actualGenesisPledge);
      setLatestSettlement(
        vaultSettlement?.isRealOnChain && vaultSettlement.txHash
          ? {
              isRealOnChain: true,
              settlementType: "on_chain_ptb",
              txHash: vaultSettlement.txHash,
              voucherSignature: vaultSettlement.voucherSignature,
              explorerUrl: vaultSettlement.explorerUrl,
              provider: vaultSettlement.provider,
              message: vaultSettlement.message,
            }
          : null
      );

      const syncedBal = await refreshLiveBalance(activeAccountAddress, accountType, { syncRetry: true });
      if (accountType === "demo" && vaultSettlement?.isRealOnChain && syncedBal === null) {
        setAvailableBalance((prev) => Math.max(0, prev - actualGenesisPledge));
      }

      setSealingProgress(100);
      justCommittedGenesisRef.current = true;
      setBriefingRefreshTick((t) => t + 1);

      if (accountType === "demo" && claimedDrops > 0) {
        triggerSnackbar(
          "Vault Locked & Testnet Funded",
          `Claimed ${claimedDrops === 2 ? "2.00" : "1.00"} SUI · 0.20 SUI locked in x402 vault`,
          resolvedGenesisId
        );
      } else if (accountType !== "demo" && actualGenesisPledge === 0) {
        triggerSnackbar(
          "Mainnet Pact Sealed · 0.00 SUI Vault",
          `Wallet holds ${(initialBal ?? 0).toFixed(2)} SUI · Fund via Receive to lock on-chain`,
          resolvedGenesisId
        );
      } else if (accountType !== "demo" && vaultSettlement?.txHash) {
        triggerSnackbar(
          "Mainnet Vault Locked (0.20 SUI)",
          `Tx #${vaultSettlement.txHash.slice(0, 10)}... · Saved to Walrus`,
          resolvedGenesisId
        );
      } else if (data && (data.genesisBlobId || data.primaryBlobId)) {
        triggerSnackbar(
          "Saved to Walrus",
          `Genesis Pact #${resolvedGenesisId.slice(0, 12)}...`,
          resolvedGenesisId
        );
      } else {
        triggerSnackbar("Vault Locked", "Entered dashboard with Tatum & Walrus active");
      }

      setStep(4);
      setActiveTab("home");
    } catch (err) {
      if (accountType === "demo") {
        triggerSnackbar("Notice", "Walrus memory connecting in background. Entering...");
        setStep(4);
        setActiveTab("home");
      } else {
        triggerSnackbar(
          "Mainnet Setup Failed",
          err instanceof Error ? err.message : "Could not initialize Mainnet pact."
        );
      }
    } finally {
      setIsSubmitting(false);
      setSealingStage("");
      setSealingProgress(0);
    }
  };

  // Vault Tab Action: Lock initial 0.20 SUI pledge on Mainnet after funding wallet
  const handleFundGenesisPledge = async () => {
    if (isDegradedModeRef.current || accountType === "demo" || initialPledgeSui > 0 || isLockingInitialPledge) {
      return;
    }

    const activeAccountAddress = accountType === "real" ? realAddress : linkedAddress;
    if (!isValidSuiAddress((activeAccountAddress || "").trim())) {
      triggerSnackbar("Valid Mainnet Address Required", "Connect or link a valid 0x Sui address first.");
      return;
    }

    if (accountType === "linked" && !detectInstalledSuiWallet()) {
      triggerSnackbar(
        "Extension Required",
        "Connect a Sui wallet extension to sign and broadcast this Mainnet pledge."
      );
      return;
    }

    setIsLockingInitialPledge(true);
    try {
      const freshBal = await refreshLiveBalance(activeAccountAddress, accountType);
      const minRequired = DEFAULT_GENESIS_PLEDGE_SUI + MAINNET_DUAL_TX_GAS_BUFFER_SUI;
      if (freshBal === null) {
        triggerSnackbar("Mainnet RPC Unavailable", "Unable to verify live balance via Tatum Gateway.");
        return;
      }
      if (freshBal < minRequired) {
        triggerSnackbar(
          "Insufficient Mainnet Funds",
          `Need at least ${minRequired.toFixed(3)} SUI including gas (${freshBal.toFixed(3)} SUI available).`
        );
        return;
      }

      const privateKey = accountType === "real" ? exportRealPrivateKeyHex() || undefined : undefined;
      const res = await executeX402VaultDeposit({
        amountSui: DEFAULT_GENESIS_PLEDGE_SUI,
        reason: "Genesis Commitment Pledge",
        commitmentId: hydratedPactId || "pact_primary",
        walletMode: accountType,
        privateKeySecret: privateKey,
        senderAddress: activeAccountAddress,
      });

      if (!res.isRealOnChain || !res.txHash) {
        throw new Error("Mainnet x402 transaction did not return an on-chain digest.");
      }

      setInitialPledgeSui(DEFAULT_GENESIS_PLEDGE_SUI);
      setEscrowDeposit((prev) => Number((prev + DEFAULT_GENESIS_PLEDGE_SUI).toFixed(4)));
      setLatestSettlement({
        isRealOnChain: true,
        settlementType: "on_chain_ptb",
        txHash: res.txHash,
        voucherSignature: res.voucherSignature,
        explorerUrl: res.explorerUrl,
        provider: res.provider,
        message: res.message,
      });

      await refreshLiveBalance(activeAccountAddress, accountType, { syncRetry: true });
      setBriefingRefreshTick((t) => t + 1);
      triggerSnackbar(
        "0.20 SUI Locked on Mainnet",
        `Tx #${res.txHash.slice(0, 10)}... · Confirmed via x402`
      );
    } catch (err) {
      triggerSnackbar(
        "Mainnet Lock Failed",
        err instanceof Error ? err.message : "Could not settle Mainnet vault pledge."
      );
    } finally {
      setIsLockingInitialPledge(false);
    }
  };

  // Drawer Action: Add another resolution to Walrus
  const handleCommitNewResolution = async () => {
    if (!newRuleTitle.trim() || isDegradedModeRef.current) return;
    setIsCommittingNewRule(true);
    try {
      const newRule: RuleItem = {
        id: Date.now().toString(),
        title: newRuleTitle.trim(),
        condition: newRuleCondition.trim(),
        penalty: newRulePenalty,
        breaches: 0,
      };

      const activeAccountAddress =
        accountType === "demo"
          ? (demoAddress || DEMO_SUI_ADDRESS)
          : accountType === "real"
          ? realAddress
          : linkedAddress;

      const res = await fetch("/api/walrus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rules: [newRule],
          initialDepositSui: escrowDeposit,
          unlockDate: "2026-12-25",
          walletAddress: activeAccountAddress,
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
      setBriefingRefreshTick((t) => t + 1);

      triggerSnackbar("Resolution Committed to Walrus", `Blob #${generatedBlobId.slice(0, 10)}...`, generatedBlobId);
    } catch {
      alert("Error committing resolution to Walrus memory.");
    } finally {
      setIsCommittingNewRule(false);
    }
  };

  // Interactive First-Entry Dashboard + Send Flow Guided Tour
  const appTourSteps: TourStepConfig[] = [
    {
      id: "wally",
      targetSelector: '[data-tour-id="tour-wally"]',
      body: "Wally pulls from your Walrus memory to brief you on your activity and spending habits. Watch this adapt as you use the app.",
      ctaLabel: "Next",
    },
    {
      id: "toggle",
      targetSelector: '[data-tour-id="tour-walrus-toggle"]',
      body: "Switch Walrus and Tatum off here anytime to compare against a stateless wallet with zero memory and zero checks.",
      ctaLabel: "Next",
    },
    ...(accountType === "demo"
      ? [
          {
            id: "timetravel" as const,
            targetSelector: '[data-tour-id="tour-timetravel"]',
            body: "Scrub ahead across dates to simulate months of real usage and see how accumulated memory reshapes Wally and your account.",
            ctaLabel: "Next",
            reserveBottomPx: 20,
          },
        ]
      : []),
    {
      id: "send",
      targetSelector: '[data-tour-id="tour-send-btn"]',
      body: "Make your first transaction. Tap Send to try an amount, address, and live rule enforcement.",
      hintText: "Tap Send",
    },
    {
      id: "send_setup",
      targetSelector: '[data-tour-id="tour-send-setup"]',
      body:
        accountType === "demo"
          ? "Try a small SUI amount within your balance and enter any Sui address or test contact name, then hit Continue."
          : "Enter a small SUI amount within your balance (leaving gas) and a valid 0x Sui Mainnet address, then hit Continue.",
      interactive: true,
      hintText: "Tap Continue",
      reserveBottomPx: 98,
    },
    {
      id: "send_memo",
      targetSelector: '[data-tour-id="tour-send-memo"]',
      body: "Enforced Memo. Every spend is audited against your Walrus rules first. Try breaking one—type 'cigs' or pick an option below—and tap Review & Check.",
      interactive: true,
      hintText: "Tap Review & Check",
      reserveBottomPx: 98,
    },
    {
      id: "hold_decision",
      targetSelector: '[data-tour-id="tour-hold-actions"]',
      body: "Your call. Cancel & Honor to protect your pact at 0 cost, or proceed anyway to pay the penalty to x402 and write the breach to Walrus.",
      ctaLabel: "Got it",
      dismissDelayMs: 2500,
      hideSkip: true,
    },
  ];

  const finishAppTour = () => {
    setIsTourOpen(false);
    setTourIndex(0);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(TOUR_STORAGE_KEY, "true");
      } catch {}
    }
  };

  const startAppTour = () => {
    setIsDegradedMode(false);
    setIsSendOpen(false);
    setActiveTab("home");
    setTourIndex(0);
    setTimeout(() => {
      setIsTourOpen(true);
    }, 260);
  };

  // Auto-start guided tour once upon entering dashboard for the first time
  useEffect(() => {
    if (
      step === 4 &&
      !isDegradedMode &&
      activeTab === "home" &&
      !isSendOpen &&
      typeof window !== "undefined"
    ) {
      try {
        if (localStorage.getItem(TOUR_STORAGE_KEY) !== "true") {
          const timer = setTimeout(() => {
            setTourIndex(0);
            setIsTourOpen(true);
          }, 420);
          return () => clearTimeout(timer);
        }
      } catch {}
    }
  }, [step]);

  // Keep tour synchronized with Send flow navigation through memo audit and Hold On decision
  useEffect(() => {
    if (!isTourOpen) return;
    const currentStep = appTourSteps[tourIndex];
    if (!currentStep) {
      finishAppTour();
      return;
    }

    if (isDegradedMode && !isSendOpen) {
      finishAppTour();
      return;
    }

    if (
      !isSendOpen &&
      (currentStep.id === "send_setup" ||
        currentStep.id === "send_memo" ||
        currentStep.id === "hold_decision")
    ) {
      finishAppTour();
      return;
    }

    if (isSendOpen) {
      if (sendSubStep === "amount" && currentStep.id !== "send_setup") {
        const idx = appTourSteps.findIndex((s) => s.id === "send_setup");
        if (idx !== -1) setTourIndex(idx);
      } else if (sendSubStep === "memo" && currentStep.id !== "send_memo") {
        const idx = appTourSteps.findIndex((s) => s.id === "send_memo");
        if (idx !== -1) setTourIndex(idx);
      } else if (sendSubStep === "checking") {
        // Keep tour state alive silently while transaction audit is in progress
      } else if (sendSubStep === "breach") {
        if (isSubmitting) {
          finishAppTour();
        } else if (currentStep.id !== "hold_decision") {
          const idx = appTourSteps.findIndex((s) => s.id === "hold_decision");
          if (idx !== -1) setTourIndex(idx);
        }
      } else if (
        sendSubStep === "approved" ||
        sendSubStep === "honored" ||
        sendSubStep === "penalty_recorded"
      ) {
        finishAppTour();
      }
    }
  }, [isTourOpen, isSendOpen, sendSubStep, isDegradedMode, isSubmitting, tourIndex]);

  // Open Send Flow
  const openSendFlow = () => {
    setSendSubStep("amount");
    setSendAmount("0.05");
    setSendRecipient("");
    setSendMemo("");
    setBreachReason("");
    setIsSendOpen(true);
    if (isTourOpen) {
      const setupIdx = appTourSteps.findIndex((s) => s.id === "send_setup");
      if (setupIdx !== -1) {
        setTourIndex(setupIdx);
      }
    }
  };

  // Close Send Flow
  const closeSendFlow = () => {
    setIsSendOpen(false);
    setSendSubStep("amount");
    if (!isDegradedModeRef.current) {
      refreshLiveBalance(undefined, accountType);
    }
    setBriefingRefreshTick((t) => t + 1);
  };

  // Handle Approved Transaction Recording to Walrus Memory & Tatum Sui Gateway
  const recordApprovedTransaction = async () => {
    const numAmount = parseFloat(sendAmount) || 0;
    const isMainnetStrict = accountType === "real" || accountType === "linked";

    const timestampStr = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date());

    // When Walrus & Tatum are disabled: bypass Tatum transfers, balance polling, and Walrus inscription
    if (isDegradedMode || isDegradedModeRef.current) {
      setAvailableBalance((prev) => Math.max(0, prev - numAmount));
      const statelessRecord: InfractionRecord = {
        id: `tx_offline_${Date.now()}`,
        ruleTitle: "Unchecked Transfer",
        ruleCondition: "Walrus Memory & Tatum disabled",
        amount: sendAmount,
        memo: sendMemo || "Unchecked transfer",
        timestamp: timestampStr,
        penaltySui: 0,
        blobId: "",
        dayOfYear: currentDayOfYear,
        verdict: "honored",
        recipient: sendRecipient,
        provider: "Offline Mode (Tatum & Walrus Disabled)",
        isUnfunded: false,
        isRealOnChain: false,
        isOffChainVoucher: false,
        source: "user",
      };
      setInfractions((prev) => [statelessRecord, ...prev]);

      setIsSendOpen(false);
      setSendSubStep("amount");
      triggerSnackbar(
        "Transfer Sent",
        `${sendAmount} SUI · Walrus & Tatum disabled — no resolution checks performed`
      );
      return;
    }

    const activeAccountAddress =
      accountType === "demo"
        ? (demoAddress || DEMO_SUI_ADDRESS)
        : accountType === "real"
        ? realAddress
        : linkedAddress;

    if (isMainnetStrict && !isValidSuiAddress(sendRecipient.trim())) {
      triggerSnackbar("Invalid Recipient", "Mainnet transfers require a valid 0x Sui address.");
      setSendSubStep("amount");
      return;
    }

    let txHash: string | undefined = undefined;
    let explorerUrl: string | undefined = undefined;
    let transferProvider =
      accountType === "demo" ? "Tatum Sui Testnet Gateway" : "Tatum Sui Mainnet Gateway";
    let isUnfunded = false;
    let isRealOnChain = false;

    // 1. If Linked wallet extension, execute on-chain directly via extension
    let preExecutedDigest: string | undefined = undefined;
    if (accountType === "linked") {
      if (!detectInstalledSuiWallet()) {
        triggerSnackbar(
          "Extension Required",
          "Connect a Sui wallet extension to broadcast Mainnet transfers."
        );
        setSendSubStep("amount");
        return;
      }
      try {
        const extResult = await executeTransferWithExtension({
          recipient: sendRecipient.trim(),
          amountSui: numAmount,
        });
        if (!extResult?.digest) {
          throw new Error("Connected extension did not return an on-chain transaction digest.");
        }
        preExecutedDigest = extResult.digest;
      } catch (extErr) {
        const extMsg =
          extErr instanceof Error ? extErr.message : "Extension transfer was declined or failed.";
        triggerSnackbar("Mainnet Transfer Cancelled", extMsg);
        setSendSubStep("amount");
        return;
      }
    }

    // 2. Execute / Inscribe PTB via Tatum Sui Gateway
    const privateKey =
      accountType === "demo"
        ? (exportDemoPrivateKeyHex() || undefined)
        : accountType === "real"
        ? (exportRealPrivateKeyHex() || undefined)
        : undefined;

    let ptbError: string | null = null;
    try {
      const ptbRes = await fetch("/api/sui-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
          senderAddress: activeAccountAddress,
          recipientAddress: sendRecipient.trim(),
          amountSui: numAmount,
          walletMode: accountType,
          privateKeySecret: privateKey,
          preExecutedDigest,
        }),
      });

      const ptbData = await ptbRes.json();
      if (ptbRes.ok && ptbData?.success && ptbData?.digest) {
        if (isMainnetStrict && ptbData.onChain !== true) {
          ptbError = ptbData?.error || "Mainnet transfer did not settle on-chain.";
        } else {
          txHash = ptbData.digest;
          explorerUrl = ptbData.explorerUrl || undefined;
          transferProvider = ptbData.provider || transferProvider;
          isUnfunded = Boolean(ptbData.unfunded);
          isRealOnChain = Boolean(ptbData.onChain);
        }
      } else if (ptbData?.error) {
        ptbError = ptbData.error;
      } else {
        ptbError = `Transfer request failed (HTTP ${ptbRes.status})`;
      }
    } catch (ptbErr) {
      ptbError = ptbErr instanceof Error ? ptbErr.message : "Sui transfer request failed";
      console.warn("[PTB Transfer] Tatum API notice:", ptbErr);
    }

    if (isMainnetStrict && (!isRealOnChain || !txHash)) {
      triggerSnackbar(
        "Mainnet Transfer Failed",
        ptbError || "Could not broadcast transfer on Sui Mainnet."
      );
      await refreshLiveBalance(activeAccountAddress, accountType);
      setSendSubStep("amount");
      return;
    }

    const syncedBal = await refreshLiveBalance(activeAccountAddress, accountType, { syncRetry: true });
    if (syncedBal === null) {
      setAvailableBalance((prev) => Math.max(0, prev - numAmount));
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
          is_real_on_chain: isRealOnChain,
          explorer_url: explorerUrl,
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
        isRealOnChain,
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

    // When Walrus & Tatum are disabled: do NOT check resolutions at all and NEVER stop transactions
    if (isDegradedMode || isDegradedModeRef.current) {
      setSendSubStep("approved");
      setTimeout(() => {
        recordApprovedTransaction();
      }, 700);
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
        : linkedAddress;

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
            blobId: r.blobId,
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
            (data.matchedRuleId && String(r.id) === String(data.matchedRuleId)) ||
            r.title.toLowerCase() === (data.matchedRule || "").toLowerCase() ||
            r.title.toLowerCase().includes((data.matchedRule || "").toLowerCase()) ||
            (data.matchedRule || "").toLowerCase().includes(r.title.toLowerCase())
        );
        setMatchedRuleMotivation(data.motivation || matchedRuleObj?.whyItMatters || "");
        setMatchedRuleCondition(matchedRuleObj?.condition || "");
        setMatchedRuleBlobId(
          data.matchedRuleBlobId ||
            matchedRuleObj?.blobId ||
            (matchedRuleObj?.id ? `walrus_blob_rule_${matchedRuleObj.id}` : "")
        );
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
      clearTimeout(stageTimer2);
      setSendSubStep("approved");
      setTimeout(() => {
        recordApprovedTransaction();
      }, 1400);
    }
  };

  // Handle Penalty Payment when Breach is Accepted via x402 Protocol & Execute Transfer
  const handlePayFineAndProceed = async () => {
    const isMainnetStrict = accountType === "real" || accountType === "linked";
    setIsSubmitting(true);
    setPayFineStage(
      isMainnetStrict ? "Checking Mainnet solvency..." : "Settling fine via x402..."
    );

    // Safety timeout: never auto-fabricate a recorded penalty if settlement hangs
    const safetyTimer = setTimeout(() => {
      console.warn("[Fine Settlement] Timeout reached before completion");
      setIsSubmitting(false);
      setPayFineStage("");
      triggerSnackbar(
        "Settlement Timed Out",
        isMainnetStrict
          ? "Check SuiScan before retrying in case a wallet signature was broadcast."
          : "Network busy — please retry settling this penalty."
      );
    }, 45000);

    try {
      const penaltyAmt = breachPenaltySui || 0.05;
      const transferAmt = parseFloat(sendAmount) || 0;
      const activeAccountAddress =
        accountType === "demo"
          ? (demoAddress || DEMO_SUI_ADDRESS)
          : accountType === "real"
          ? realAddress
          : linkedAddress;

      // Pre-flight Mainnet checks BEFORE sending real funds to the x402 vault
      if (isMainnetStrict) {
        if (!isValidSuiAddress((activeAccountAddress || "").trim())) {
          throw new Error("Mainnet sender address is missing or invalid.");
        }
        if (transferAmt > 0 && !isValidSuiAddress(sendRecipient.trim())) {
          throw new Error("Mainnet transfers require a valid 0x Sui address.");
        }
        if (accountType === "linked" && !detectInstalledSuiWallet()) {
          throw new Error(
            "Connect a Sui wallet extension to sign and broadcast Mainnet penalty and transfer transactions."
          );
        }

        const freshBal = await refreshLiveBalance(activeAccountAddress, accountType);
        if (freshBal === null) {
          throw new Error(
            "Unable to verify live Sui Mainnet balance via Tatum Gateway. No funds moved."
          );
        }

        const solvency = checkMainnetPenaltySolvency({
          accountType,
          transferAmountSui: transferAmt,
          penaltyAmountSui: penaltyAmt,
          availableBalance: freshBal,
        });
        if (!solvency.ok) {
          throw new Error(solvency.reason || "Insufficient Sui Mainnet funds.");
        }
      }

      // 1. Execute Real x402 Challenge-Response Flow with Sui Move Vault
      setPayFineStage(
        accountType === "linked"
          ? "Approve penalty deposit in wallet..."
          : isMainnetStrict
          ? "Settling penalty on Sui Mainnet via x402..."
          : "Settling fine via x402..."
      );

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

        if (isMainnetStrict && (!x402Result.isRealOnChain || !x402Result.txHash)) {
          throw new Error(
            x402Result.message ||
              "Sui Mainnet x402 settlement did not produce an on-chain transaction digest."
          );
        }

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
        if (isMainnetStrict) {
          throw x402Err instanceof Error
            ? x402Err
            : new Error("Mainnet x402 penalty settlement failed.");
        }
        console.warn("[x402] Challenge flow notice (demo fallback voucher):", x402Err);
      }

      // 2. Execute the actual purchase / transfer to the recipient
      let recipientTxHash: string | undefined = undefined;
      let recipientExplorerUrl: string | undefined = undefined;
      let recipientTransferCompleted = false;
      let recipientTransferError: string | null = null;

      if (transferAmt > 0 && sendRecipient) {
        setPayFineStage(
          accountType === "linked"
            ? "Approve recipient transfer in wallet..."
            : isMainnetStrict
            ? "Broadcasting SUI transfer on Mainnet..."
            : "Sending SUI to recipient..."
        );

        let preExecutedRecipientDigest: string | undefined = undefined;
        try {
          if (accountType === "linked") {
            const extRes = await executeTransferWithExtension({
              recipient: sendRecipient.trim(),
              amountSui: transferAmt,
            });
            if (!extRes?.digest) {
              throw new Error("Extension did not return recipient transfer digest.");
            }
            preExecutedRecipientDigest = extRes.digest;
          }

          const ptbRes = await fetch("/api/sui-transfer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(25000),
            body: JSON.stringify({
              senderAddress: activeAccountAddress,
              recipientAddress: sendRecipient.trim(),
              amountSui: transferAmt,
              walletMode: accountType,
              privateKeySecret,
              preExecutedDigest: preExecutedRecipientDigest,
            }),
          });
          const ptbData = await ptbRes.json();
          if (ptbRes.ok && ptbData?.success && ptbData?.digest && (!isMainnetStrict || ptbData.onChain)) {
            recipientTxHash = ptbData.digest;
            recipientExplorerUrl = ptbData.explorerUrl;
            recipientTransferCompleted = true;
            console.log("[Breach Transfer] Real Sui PTB transfer completed:", ptbData.digest);
          } else {
            recipientTransferError =
              ptbData?.error || `Recipient transfer failed (HTTP ${ptbRes.status})`;
          }
        } catch (tErr) {
          recipientTransferError =
            tErr instanceof Error ? tErr.message : "Recipient transfer did not complete.";
          console.warn("[Breach Transfer] Transfer dispatch notice:", tErr);
        }
      }

      setLatestSettlement({
        isRealOnChain,
        settlementType,
        txHash,
        voucherSignature,
        explorerUrl,
        recipientTxHash,
        recipientExplorerUrl,
        provider: settlementProvider,
        message: settlementMsg,
      });

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

      if (!isMainnetStrict || isRealOnChain) {
        setEscrowDeposit((prev) => Number((prev + penaltyAmt).toFixed(4)));
      }

      const syncedBal = await refreshLiveBalance(activeAccountAddress, accountType, { syncRetry: true });
      if (syncedBal === null) {
        const localSpent =
          (isMainnetStrict ? (isRealOnChain ? penaltyAmt : 0) : penaltyAmt) +
          (recipientTransferCompleted ? transferAmt : 0);
        setAvailableBalance((prev) => Math.max(0, prev - localSpent));
      }

      if (isMainnetStrict && transferAmt > 0 && !recipientTransferCompleted) {
        triggerSnackbar(
          "Penalty Locked · Transfer Incomplete",
          recipientTransferError || "Vault penalty settled on Mainnet, but recipient transfer did not complete."
        );
      }

      setBriefingRefreshTick((t) => t + 1);
      setLatestFineBlobId(fineBlobId);
      clearTimeout(safetyTimer);
      setSendSubStep("penalty_recorded");
    } catch (err) {
      if (isMainnetStrict) {
        const errMsg =
          err instanceof Error ? err.message : "Mainnet penalty transaction did not complete.";
        triggerSnackbar("Mainnet Penalty Not Settled", errMsg);
      } else {
        const fallbackBlobId = `blob_infr_${Date.now().toString(36)}`;
        setLatestFineBlobId(fallbackBlobId);
        setSendSubStep("penalty_recorded");
      }
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

  const handleReceiveClick = async () => {
    const addr =
      accountType === "demo"
        ? (demoAddress || DEMO_SUI_ADDRESS)
        : accountType === "real"
        ? realAddress
        : linkedAddress;

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
    setTimeout(() => setCopiedAddress(false), 2500);

    if (isDegradedMode || isDegradedModeRef.current) {
      triggerSnackbar(
        "Address Copied",
        "Tatum & Walrus are disabled — turn them back on to claim gas or sync balance"
      );
      return;
    }

    if (accountType === "demo") {
      if (isRequestingFaucet) {
        triggerSnackbar("Address Copied", "Already claiming 1.00 Testnet SUI for your address...");
        return;
      }
      triggerSnackbar(
        "Address Copied · Claiming Testnet SUI",
        `${addr.slice(0, 8)}...${addr.slice(-4)} · Requesting 1.00 SUI drop`
      );
      const result = await handleRequestFaucet(addr, {
        quietStartSnackbar: true,
        quietResultSnackbar: true,
      });
      if (result.success) {
        setBriefingRefreshTick((t) => t + 1);
        triggerSnackbar(
          "Address Copied · +1.00 SUI Claimed",
          `Tx #${result.digest?.slice(0, 10)}... · Balance updated`
        );
      } else {
        triggerSnackbar(
          "Address Copied",
          result.error || "Faucet busy right now — retry shortly"
        );
      }
      return;
    }

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

    await refreshLiveBalance(addr, accountType, { syncRetry: true });
    triggerSnackbar(
      "Address Copied · Balance Synced",
      dynamicTarget
        ? `Auditing "${activeInflowRule?.title}" (${dynamicTarget} via Tatum Gateway)`
        : "Audited on-chain via Tatum Sui Gateway"
    );
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
        : linkedAddress;

    const privateKey =
      accountType === "demo"
        ? (exportDemoPrivateKeyHex() || undefined)
        : accountType === "real"
        ? (exportRealPrivateKeyHex() || undefined)
        : undefined;

    const genesisBase = accountType === "demo" ? DEFAULT_GENESIS_PLEDGE_SUI : initialPledgeSui;

    if (milestone === "jan1") {
      setCurrentDateStr("Thur, Jan 1");
      setCurrentDayOfYear(1);
      setEscrowDeposit(genesisBase + userPenaltySum);
      setIsVaultUnlocked(false);
      setIsVaultClaimed(false);
      setInfractions([...userTransactions]);
      triggerSnackbar("Time Travel: Jan 1 (Genesis)", "Fresh New Year oaths sealed · 0 milestone breaches");
      return;
    }

    if (milestone === "feb14") {
      setCurrentDateStr("Sat, Feb 14");
      setCurrentDayOfYear(45);
      setIsVaultUnlocked(false);
      setIsVaultClaimed(false);

      if (isDegradedMode || isDegradedModeRef.current) {
        triggerSnackbar(
          "Time Travel: Feb 14",
          "Walrus & Tatum disabled — no memory log or x402 penalty applied"
        );
        return;
      }

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
          refreshLiveBalance(activeAccountAddress, accountType, { syncRetry: true });
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
      setEscrowDeposit(genesisBase + totalFines + userPenaltySum);
      setInfractions([...userTransactions, ...febInfrs]);
      triggerSnackbar(
        "Time Travel: Feb 14 (1st Breach)",
        `Breached '${primaryRule.title}' · ${(primaryRule.penalty || 0.05).toFixed(2)} SUI fine locked via x402`
      );
      return;
    }

    if (milestone === "jul20" || milestone === "dec25") {
      const isChristmas = milestone === "dec25";
      setCurrentDateStr(isChristmas ? "Fri, Dec 25" : "Mon, Jul 20");
      setCurrentDayOfYear(isChristmas ? 359 : 201);
      setIsVaultUnlocked(isChristmas);
      if (isChristmas) {
        setIsChristmasBannerDismissed(false);
      }

      if (isDegradedMode || isDegradedModeRef.current) {
        triggerSnackbar(
          isChristmas ? "🎅 Time Travel: Dec 25 (Christmas Unlock)" : "Time Travel: Jul 20",
          "Walrus & Tatum disabled — stateless view only"
        );
        return;
      }

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
          refreshLiveBalance(activeAccountAddress, accountType, { syncRetry: true });
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
      setEscrowDeposit(genesisBase + totalFines + userPenaltySum);
      setInfractions([...userTransactions, ...summerInfrs]);

      if (isChristmas) {
        triggerSnackbar(
          "🎅 Time Travel: Dec 25 (Christmas Unlock)",
          `Move vault time-lock mature! Claim your ${(genesisBase + totalFines + userPenaltySum).toFixed(2)} SUI savings.`
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
    setBriefingRefreshTick((t) => t + 1);
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
      <div
        ref={shellRef}
        className={`relative w-full max-w-[420px] h-full md:h-[860px] md:max-h-[92vh] bg-[#000000] md:border md:border-[#222226] md:rounded-[40px] flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-300 ${
          isDegradedMode ? "grayscale-[50%]" : ""
        }`}
      >
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
              {/* Detected Browser Session Restore */}
              {savedBrowserPact && (
                <div
                  onClick={handleRestoreFromBrowser}
                  className="bg-black/20 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 flex flex-col gap-2 cursor-pointer transition-all duration-200 active:scale-[0.99] border border-[#ebaf64]/45 hover:border-[#ebaf64]/75 shadow-[0_8px_32px_rgba(0,0,0,0.4)] group"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-base font-semibold text-[#ebaf64] tracking-[-0.01em]">
                      Restore from this browser
                    </div>
                    <div className="text-xs font-mono text-[#ebaf64]/90 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      <span>Enter</span>
                      <ArrowRight size={14} />
                    </div>
                  </div>
                  <div className="text-xs font-mono text-white/60 truncate">
                    {savedBrowserPact.accountType === "demo"
                      ? "Testnet"
                      : savedBrowserPact.accountType === "real"
                      ? "Mainnet"
                      : "Linked"}{" "}
                    · {savedBrowserPact.walletAddress.slice(0, 6)}...
                    {savedBrowserPact.walletAddress.slice(-4)} ·{" "}
                    {savedBrowserPact.rules.filter((r) => r.title.trim().length > 0).length}{" "}
                    resolutions
                  </div>
                </div>
              )}

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
                  <span className="text-xs text-white/70">Target Initial Deposit</span>
                  <span className="text-xs text-[#ebaf64] font-mono font-medium">
                    {escrowDeposit > 0 ? `${escrowDeposit.toFixed(2)} SUI` : `${DEFAULT_GENESIS_PLEDGE_SUI.toFixed(2)} SUI (if funded)`}
                  </span>
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
                  setLiveOnChainBalanceSui(null);
                  setAvailableBalance(0);
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
                  Sui Testnet sandbox. Auto-claims 2.00 test SUI when locking your vault to test real transfers and Time Travel risk-free.
                </p>
              </div>

              {/* Option 2: Real Account */}
              <div
                onClick={() => {
                  setAccountType("real");
                  setLiveOnChainBalanceSui(null);
                  setAvailableBalance(0);
                  if (realAddress) refreshLiveBalance(realAddress, "real");
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
                  Self-custodial Sui Mainnet wallet with real funds and cryptographic enforcement.
                </p>

                {accountType === "real" && realAddress && (
                  <div className="pt-2 border-t border-[#ebaf64]/15 flex items-center justify-between text-[11px] font-mono text-[#ebaf64]/85">
                    <span>
                      Mainnet · {realAddress.slice(0, 6)}...{realAddress.slice(-4)}
                    </span>
                    <span>
                      {isCheckingLiveBalance
                        ? "Checking..."
                        : `${(liveOnChainBalanceSui ?? 0).toFixed(2)} SUI`}
                    </span>
                  </div>
                )}
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
                      if (!showLinkInput) {
                        setAccountType("linked");
                        setLiveOnChainBalanceSui(null);
                        setAvailableBalance(0);
                      }
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
                        setLiveOnChainBalanceSui(null);
                        setAvailableBalance(0);
                        if (isValidSuiAddress(val)) {
                          refreshLiveBalance(val, "linked");
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
            {/* FLOATING CHRISTMAS UNLOCK BANNER (Semi-transparent overlay, does not push Home content down) */}
            {activeTab === "home" && isVaultUnlocked && !isChristmasBannerDismissed && (
              <div className="absolute top-[74px] sm:top-[84px] left-5 right-5 z-30 bg-black/65 backdrop-blur-2xl border border-[#ebaf64]/45 rounded-3xl p-4 sm:p-5 flex flex-col gap-3 shadow-[0_16px_48px_rgba(0,0,0,0.75)] animate-in fade-in slide-in-from-top-3 duration-200">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Gift size={16} className="text-[#ebaf64] shrink-0" />
                    <span className="text-xs font-semibold text-white uppercase tracking-wider truncate">
                      Christmas Vault Unlocked
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-mono text-[#ebaf64] bg-[#ebaf64]/15 px-2 py-0.5 rounded border border-[#ebaf64]/25">
                      {isVaultClaimed ? "Funds Claimed" : "Time-Lock Expired"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsChristmasBannerDismissed(true)}
                      className="text-white/55 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                      title="Dismiss reminder"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-[#D4D4D8] leading-relaxed">
                  {isVaultClaimed
                    ? `You claimed ${escrowDeposit.toFixed(2)} SUI back to your wallet. Full-year discipline cycle completed.`
                    : `Sui network clock reached December 25. You saved ${escrowDeposit.toFixed(2)} SUI from your impulsive self.`}
                </p>
                {!isVaultClaimed ? (
                  <button
                    type="button"
                    onClick={handleClaimChristmasVault}
                    className="w-full py-2.5 px-4 rounded-full bg-[#ebaf64] hover:bg-[#f3ba6f] text-black font-semibold text-xs transition-all duration-150 flex items-center justify-center gap-2 active:scale-[0.98] shadow-sm cursor-pointer"
                  >
                    <Gift size={14} />
                    <span>Claim Christmas Savings ({escrowDeposit.toFixed(2)} SUI)</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-mono text-[#10B981] bg-[#10B981]/10 p-2.5 rounded-2xl border border-[#10B981]/25">
                    <Check size={14} className="shrink-0" />
                    <span>{escrowDeposit.toFixed(2)} SUI released into available balance</span>
                  </div>
                )}
              </div>
            )}

            {/* TAB: HOME */}
            {activeTab === "home" && (
              <div className="flex-1 overflow-y-auto px-5 sm:px-7 pt-6 sm:pt-8 pb-36 flex flex-col gap-4 overscroll-contain">
                {/* 1. TOP HEADER: PROMINENT DATE + MINIMALIST WALRUS SWITCH */}
                <div className="flex items-center justify-between pt-1 pb-1">
                  <div className="text-[26px] sm:text-[30px] font-bold tracking-[0.02em] leading-tight text-[#ebaf64]">
                    {currentDateStr || "Mon, Nov 9"}
                  </div>
                  <div data-tour-id="tour-walrus-toggle" className="flex items-center gap-2.5">
                    <span className="text-xs font-mono text-white/70">Walrus</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!isDegradedMode}
                      onClick={() => setIsDegradedMode((prev) => !prev)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        !isDegradedMode ? "bg-[#ebaf64]" : "bg-white/20"
                      }`}
                      title={!isDegradedMode ? "Walrus & Tatum Active" : "Walrus & Tatum Disabled"}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ease-in-out ${
                          !isDegradedMode ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* 2. UNIFIED HERO CARD: BALANCE + ACTIONS + WALLY'S VOICE */}
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
                      <button
                        type="button"
                        data-tour-id="tour-send-btn"
                        onClick={openSendFlow}
                        className="py-2.5 px-4 rounded-full bg-[#ebaf64] hover:bg-[#f3ba6f] text-black font-semibold text-xs transition-all duration-150 flex items-center justify-center gap-1.5 active:scale-95 shadow-sm cursor-pointer"
                      >
                        <ArrowUpRight size={14} className="stroke-[2.5]" />
                        <span>Send</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleReceiveClick}
                        className="py-2.5 px-4 rounded-full bg-black/40 hover:bg-black/60 text-[#ebaf64] border border-[#ebaf64]/30 hover:border-[#ebaf64]/60 font-medium text-xs transition-all duration-150 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                        title={
                          isDegradedMode
                            ? "Copy address (Tatum & Walrus disabled)"
                            : accountType === "demo"
                            ? "Copy address & claim 1.00 Testnet SUI"
                            : "Copy address & sync live balance"
                        }
                      >
                        {isRequestingFaucet ? (
                          <span className="w-3 h-3 border border-[#ebaf64] border-t-transparent rounded-full animate-spin inline-block" />
                        ) : copiedAddress ? (
                          <Check size={14} className="text-[#ebaf64]" />
                        ) : (
                          <ArrowDownLeft size={14} />
                        )}
                        <span>
                          {isRequestingFaucet
                            ? "Claiming..."
                            : copiedAddress
                            ? "Copied"
                            : "Receive"}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div data-tour-id="tour-wally" className="flex flex-col gap-1.5 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#ebaf64]/80 uppercase tracking-wider font-semibold">
                        {!isDegradedMode ? "Wally · Walrus Memory" : "Wally · Memory Offline"}
                      </span>
                      {!isDegradedMode && isLoadingWallyBriefing && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ebaf64] animate-pulse" />
                      )}
                    </div>
                    <p className="text-sm text-white/90 leading-relaxed font-normal">
                      {isDegradedMode
                        ? "Stateless Session: Walrus Memory & Tatum are disabled. Transfers go through unchecked with zero resolution enforcement and nothing saved to memory."
                        : wallyBriefing ||
                          (isLoadingWallyBriefing
                            ? "Synthesizing Walrus Memory..."
                            : escrowDeposit > 0
                            ? `All ${activeRulesList.length} resolutions are anchored in Walrus Memory with ${escrowDeposit.toFixed(2)} SUI locked in your vault.`
                            : `All ${activeRulesList.length} resolutions are anchored in Walrus Memory. Vault is currently at 0.00 SUI awaiting Mainnet funding.`)}
                    </p>
                  </div>
                </div>

                {/* 3. ACTIVE RESOLUTIONS PREVIEW (Dark Glass Penalties Style) */}
                <div className="relative overflow-hidden bg-black/20 backdrop-blur-2xl border border-[#ebaf64]/25 rounded-3xl p-5 shadow-md">
                  <div
                    className={`flex flex-col gap-3.5 transition-all duration-300 ${
                      isDegradedMode ? "blur-md opacity-25 pointer-events-none select-none min-h-[130px]" : ""
                    }`}
                    aria-hidden={isDegradedMode}
                  >
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

                  {isDegradedMode && (
                    <div className="absolute inset-0 z-10 bg-black/45 backdrop-blur-xl rounded-3xl flex flex-col items-center justify-center p-6 text-center select-none">
                      <span className="text-lg sm:text-xl font-bold tracking-tight text-white">
                        What resolution?
                      </span>
                      <span className="text-[11px] font-mono text-white/55 mt-1.5">
                        Turn on Walrus Memory to recall your commitments
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: RESOLUTIONS */}
            {activeTab === "resolutions" && (
              <div className="flex-1 overflow-y-auto px-5 sm:px-7 pt-6 sm:pt-8 pb-36 flex flex-col gap-4 animate-in fade-in duration-200 overscroll-contain">
                <div className="text-[26px] sm:text-[30px] font-bold tracking-[0.02em] leading-tight text-[#ebaf64]">
                  Saved Resolutions
                </div>

                {isDegradedMode ? (
                  <div className="flex-1 flex items-center justify-center py-10">
                    <div className="w-full bg-black/20 backdrop-blur-2xl border border-white/15 rounded-3xl p-7 flex flex-col items-center text-center gap-3 shadow-md">
                      <div className="w-11 h-11 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white/60">
                        <Database size={18} />
                      </div>
                      <div className="text-base font-semibold text-white">
                        Nothing is saved
                      </div>
                      <p className="text-xs text-white/60 leading-relaxed max-w-[260px]">
                        Walrus memory is turned off. Turn on memory to recall and manage your saved resolutions.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsDegradedMode(false)}
                        className="mt-1 py-2.5 px-5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-medium transition-all active:scale-95 cursor-pointer border border-white/15"
                      >
                        Turn on Memory
                      </button>
                    </div>
                  </div>
                ) : (
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
                )}
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
                {(() => {
                  const vaultState = getVaultDisplayState({
                    accountType,
                    escrowDeposit,
                    initialPledgeSui,
                    availableBalance,
                    isDegradedMode,
                  });

                  return (
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
                          {vaultState.totalLockedSui.toFixed(2)}
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
                            {vaultState.initialPledgeSui.toFixed(2)} SUI
                          </span>
                        </div>
                        <div className="bg-black/30 border border-[#ebaf64]/15 rounded-2xl p-3.5 flex flex-col gap-0.5">
                          <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">
                            Infraction Tolls
                          </span>
                          <span className="text-sm font-mono font-semibold text-[#ebaf64]">
                            +{vaultState.infractionTollsSui.toFixed(2)} SUI
                          </span>
                        </div>
                      </div>

                      {/* Optional Initial Pledge CTA when funded on Mainnet */}
                      {vaultState.canFundGenesisPledge && (
                        <button
                          type="button"
                          onClick={handleFundGenesisPledge}
                          disabled={isLockingInitialPledge}
                          className="relative z-10 w-full py-3 px-4 rounded-full bg-[#ebaf64] hover:bg-[#f3ba6f] text-black font-semibold text-xs transition-all duration-150 flex items-center justify-center gap-2 active:scale-[0.98] shadow-sm cursor-pointer disabled:opacity-60"
                        >
                          <Lock size={13} />
                          <span>
                            {isLockingInitialPledge
                              ? "Locking 0.20 SUI on Mainnet..."
                              : "Lock 0.20 SUI Initial Pledge (Mainnet)"}
                          </span>
                        </button>
                      )}

                      {vaultState.isUnfundedMainnetVault && !vaultState.canFundGenesisPledge && !isDegradedMode && (
                        <p className="relative z-10 text-[11px] font-mono text-white/55 leading-relaxed">
                          No Mainnet funds locked yet. Send at least{" "}
                          {(DEFAULT_GENESIS_PLEDGE_SUI + MAINNET_DUAL_TX_GAS_BUFFER_SUI).toFixed(3)} SUI
                          to your address via Receive to lock a 0.20 SUI pledge on-chain, or start enforcing penalties directly once funded.
                        </p>
                      )}

                      {/* Contract Details Micro-Rows */}
                      <div className="flex flex-col gap-2 pt-3 border-t border-white/10 text-xs relative z-10">
                        <div className="flex items-center justify-between">
                          <span className="text-white/60">Escrow Contract</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(vaultState.vaultContractAddress);
                                triggerSnackbar("Contract Address Copied", vaultState.vaultContractAddress);
                              }}
                              className="font-mono text-[#ebaf64] hover:text-[#f3ba6f] flex items-center gap-1.5 transition-colors group"
                              title={vaultState.vaultContractAddress}
                            >
                              <span>
                                {vaultState.vaultContractAddress.slice(0, 6)}...
                                {vaultState.vaultContractAddress.slice(-4)}
                              </span>
                              <Copy size={11} className="text-white/40 group-hover:text-white transition-colors" />
                            </button>
                            <a
                              href={vaultState.explorerAccountUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-white/40 hover:text-white transition-colors"
                              title={`View on SuiScan ${vaultState.explorerNetwork === "mainnet" ? "Mainnet" : "Testnet"}`}
                            >
                              <ExternalLink size={11} />
                            </a>
                          </div>
                        </div>
                        {latestSettlement?.isRealOnChain && latestSettlement?.txHash && (
                          <div className="flex items-center justify-between">
                            <span className="text-white/60">Last Vault Tx</span>
                            <a
                              href={
                                latestSettlement.explorerUrl ||
                                `https://suiscan.xyz/${vaultState.explorerNetwork}/tx/${latestSettlement.txHash}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-[#ebaf64] hover:underline flex items-center gap-1"
                            >
                              <span>{latestSettlement.txHash.slice(0, 10)}...</span>
                              <ExternalLink size={10} />
                            </a>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-white/60">Release Trigger</span>
                          <span className="font-mono text-white/80">
                            Sui Network Epoch Clock (Dec 25)
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white/60">Settlement Gateway</span>
                          <span className="font-mono text-white/80 text-right">
                            {vaultState.settlementGatewayLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 2. 365-DAY DISCIPLINE GRID HEATMAP (Activity Visualizer) */}
                {!isDegradedMode && (
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
                      setFocusedMemoryBlobId(null);
                      setExpandedJsonBlobId(blobId);
                      setIsMemoryInspectorOpen(true);
                    }}
                  />
                )}

              </div>
            )}

            {/* TAB: SETTINGS */}
            {activeTab === "settings" && (
              <div className="flex-1 overflow-y-auto px-5 sm:px-7 pt-6 sm:pt-8 pb-36 flex flex-col gap-4 animate-in fade-in duration-200 overscroll-contain">
                <div className="text-[26px] sm:text-[30px] font-bold tracking-[0.02em] leading-tight text-[#ebaf64]">
                  Settings & Proofs
                </div>

                {/* Walrus Memory Proof Card */}
                {!isDegradedMode && (
                  <div className="bg-black/20 backdrop-blur-2xl border border-[#ebaf64]/25 rounded-3xl p-5 flex flex-col gap-3 shadow-md">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">
                        Walrus Memory Proof
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setFocusedMemoryBlobId(null);
                          setIsMemoryInspectorOpen(true);
                        }}
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
                )}

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
                          : accountType === "real"
                          ? `https://suiscan.xyz/mainnet/account/${realAddress}`
                          : `https://suiscan.xyz/mainnet/account/${linkedAddress}`}
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
                      <span className={`text-xs font-mono font-medium ${isDegradedMode ? "text-white/50" : "text-white"}`}>
                        {isDegradedMode
                          ? "Tatum disabled"
                          : accountType === "demo"
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
                          if (isDegradedMode) {
                            const msg = "Cannot query live balance because Tatum is disabled.";
                            setTatumDisabledNotice(msg);
                            triggerSnackbar(
                              "Cannot Query Live Balance",
                              "Tatum is disabled. Turn Walrus & Tatum back on to refresh."
                            );
                            return;
                          }
                          if (accountType === "demo") {
                            refreshLiveBalance(demoAddress || DEMO_SUI_ADDRESS, "demo");
                          } else if (accountType === "linked") {
                            refreshLiveBalance(linkedAddress, "linked");
                          } else {
                            refreshLiveBalance(realAddress, "real");
                          }
                        }}
                        disabled={isCheckingLiveBalance && !isDegradedMode}
                        className="text-[#ebaf64]/80 hover:text-[#ebaf64] text-xs transition-colors cursor-pointer"
                        title={isDegradedMode ? "Tatum is disabled — click for status" : "Refresh on-chain balance"}
                      >
                        ↻
                      </button>
                    </div>
                  </div>

                  {isDegradedMode && tatumDisabledNotice && (
                    <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2 text-[11px] font-mono text-amber-200/90 animate-in fade-in duration-150">
                      {tatumDisabledNotice}
                    </div>
                  )}

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
                            {accountType === "demo" ? "Testnet" : "Mainnet"} Secret Key:
                          </span>
                          <div className="bg-black/60 p-2.5 rounded-xl text-[10px] font-mono text-[#ebaf64] break-all select-all border border-[#ebaf64]/20">
                            {exportedKey}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Replay Tour & Reset Pact Actions */}
                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={startAppTour}
                    className="w-full py-3.5 px-4 rounded-full bg-black/20 hover:bg-black/40 border border-[#ebaf64]/25 hover:border-[#ebaf64]/50 text-xs font-medium text-[#ebaf64]/85 hover:text-[#ebaf64] transition-all text-center active:scale-[0.99] shadow-sm cursor-pointer"
                  >
                    Replay Guided Tour
                  </button>

                  {/* Reset Pact Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsDegradedMode(false);
                      isDegradedModeRef.current = false;
                      setEscrowDeposit(0);
                      setInitialPledgeSui(0);
                      setLatestSettlement(null);
                      setIsVaultClaimed(false);
                      setIsVaultUnlocked(false);
                      setActiveMilestone("jan1");
                      setInfractions([]);
                      setLiveOnChainBalanceSui(null);
                      setAvailableBalance(0);
                      setStep(1);
                      setActiveTab("home");
                    }}
                    className="w-full py-3.5 px-4 rounded-full bg-black/20 hover:bg-black/40 border border-[#ebaf64]/25 hover:border-[#ebaf64]/50 text-xs font-medium text-white/70 hover:text-white transition-all text-center active:scale-[0.99] shadow-sm"
                  >
                    Reset & Create New Pact
                  </button>
                </div>
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
                  <div data-tour-id="tour-send-setup" className="flex flex-col gap-4">
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

                      {/* Insufficient Balance or Gas Buffer Indicator */}
                      {(() => {
                        const parsed = parseFloat(sendAmount || "0");
                        const isMainnetStrict = accountType === "real" || accountType === "linked";
                        if (parsed > availableBalance) {
                          return (
                            <span className="text-[11px] font-mono text-red-400 mt-1">
                              Insufficient balance (Wallet: {availableBalance.toFixed(2)} SUI)
                            </span>
                          );
                        }
                        if (
                          isMainnetStrict &&
                          parsed > 0 &&
                          parsed + MAINNET_MIN_GAS_BUFFER_SUI > availableBalance
                        ) {
                          return (
                            <span className="text-[11px] font-mono text-red-400 mt-1">
                              Keep at least {MAINNET_MIN_GAS_BUFFER_SUI} SUI for Mainnet gas fees
                            </span>
                          );
                        }
                        return null;
                      })()}
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
                        placeholder={
                          accountType === "demo"
                            ? "Enter Sui address or contact name..."
                            : "Enter valid Sui Mainnet address (0x...)"
                        }
                        className="w-full bg-black/20 backdrop-blur-2xl border border-[#ebaf64]/25 hover:border-[#ebaf64]/50 focus:border-[#ebaf64] rounded-2xl px-4 py-3.5 text-xs font-mono text-white placeholder-white/30 outline-none transition-colors shadow-sm"
                      />
                      {(accountType === "real" || accountType === "linked") &&
                        sendRecipient.trim().length > 0 &&
                        !isValidSuiAddress(sendRecipient.trim()) && (
                          <span className="text-[11px] font-mono text-red-400 px-1">
                            Sui Mainnet requires a valid 0x address (64 hex chars)
                          </span>
                        )}
                    </div>
                  </div>
                </div>

                <div className="p-5 sm:p-7 pt-2 pb-8 sm:pb-9 bg-transparent shrink-0 flex flex-col items-center">
                  {(() => {
                    const parsed = parseFloat(sendAmount) || 0;
                    const trimmedRecip = sendRecipient.trim();
                    const transferCheck = checkMainnetTransferReadiness({
                      accountType,
                      amountSui: parsed,
                      availableBalance,
                      recipient: trimmedRecip,
                    });
                    const isMainnetStrict = accountType === "real" || accountType === "linked";
                    const isBalanceIssue = availableBalance <= 0 || parsed > availableBalance;
                    const isGasIssue =
                      !isBalanceIssue &&
                      isMainnetStrict &&
                      parsed > 0 &&
                      parsed + MAINNET_MIN_GAS_BUFFER_SUI > availableBalance;
                    const isInvalidMainnetAddr =
                      isMainnetStrict && trimmedRecip.length > 0 && !isValidSuiAddress(trimmedRecip);
                    const buttonLabel = isBalanceIssue
                      ? "Insufficient SUI Balance"
                      : isGasIssue
                      ? `Need ${MAINNET_MIN_GAS_BUFFER_SUI} SUI Gas Reserve`
                      : isInvalidMainnetAddr
                      ? "Invalid 0x Sui Address"
                      : "Continue";

                    return (
                      <button
                        type="button"
                        onClick={() => setSendSubStep("memo")}
                        disabled={!transferCheck.ready}
                        className={`w-full py-4 px-6 rounded-full font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] ${
                          transferCheck.ready
                            ? "bg-[#ebaf64] text-black hover:bg-[#f3bc75] shadow-lg shadow-black/60 cursor-pointer"
                            : "bg-black/40 text-white/40 border border-white/10 cursor-not-allowed"
                        }`}
                      >
                        <span>{buttonLabel}</span>
                        {transferCheck.ready && <ArrowRight size={16} />}
                      </button>
                    );
                  })()}
                  <span className="text-[11px] font-mono text-white/35 text-center tracking-tight mt-2.5">
                    {isDegradedMode
                      ? "Walrus Memory & Tatum disabled · Unchecked transfer"
                      : "Walrus Memory validated · Tatum Sui RPC resolved"}
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
                  <div data-tour-id="tour-send-memo" className="flex flex-col gap-4">
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
                    <span>{isDegradedMode ? "Send Transfer" : "Review & Check"}</span>
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
                  {isDegradedMode
                    ? "Walrus & Tatum disabled · No resolution checks performed"
                    : "Resolution adherence verified · 0 penalties applied"}
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

                <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-2 flex flex-col gap-3.5 pb-2 overscroll-contain">
                  <div className="bg-black/20 backdrop-blur-2xl border border-[#ebaf64]/25 rounded-3xl p-6 flex flex-col gap-4 shadow-md shrink-0">
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
                        const warnedRule = activeRulesList.find(
                          (r) =>
                            (matchedRuleBlobId && r.blobId === matchedRuleBlobId) ||
                            r.title.toLowerCase() === (matchedRuleTitle || "").toLowerCase()
                        );
                        const targetBlob =
                          matchedRuleBlobId ||
                          warnedRule?.blobId ||
                          `walrus_blob_rule_${warnedRule?.id || "breach"}`;
                        // Ensure exact warned resolution blob exists in walrusBlobs
                        setWalrusBlobs((prev) => {
                          if (prev.some((b) => b.blobId === targetBlob)) return prev;
                          return [
                            {
                              blobId: targetBlob,
                              type: "resolution_contract",
                              title: `Resolution: ${warnedRule?.title || matchedRuleTitle || "Committed Oath"}`,
                              timestamp: "Genesis",
                              payload: {
                                protocol: "Yearbound v1",
                                storage: "Walrus Memory (MemWal)",
                                type: "commitment_rule",
                                ruleId: warnedRule?.id,
                                title: warnedRule?.title || matchedRuleTitle,
                                behavioralRule: matchedRuleCondition || warnedRule?.condition,
                                why_it_matters: matchedRuleMotivation || warnedRule?.whyItMatters,
                                penaltySui: breachPenaltySui || warnedRule?.penalty || 0.05,
                                status: "active",
                              },
                            },
                            ...prev,
                          ];
                        });
                        setFocusedMemoryBlobId(targetBlob);
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

                  <div className="flex-1 min-h-[220px] flex items-center justify-center pt-1 pb-1 select-none pointer-events-none shrink-0">
                    <img
                      src="/assets/mascot/wally_memories.gif"
                      alt="Wally checking Memories"
                      className="w-72 sm:w-80 h-auto max-h-[360px] object-contain"
                      draggable={false}
                    />
                  </div>
                </div>

                {/* Actions: Cancel vs Pay Fine */}
                <div className="p-5 sm:p-7 pt-2 pb-8 sm:pb-9 bg-transparent shrink-0 flex flex-col items-center">
                  <div
                    data-tour-id="tour-hold-actions"
                    className="w-full flex flex-col gap-2.5 items-center"
                  >
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
                        <span>Proceed anyway & pay {breachPenaltySui || 0.05} SUI penalty</span>
                      )}
                    </button>
                  </div>
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

                <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-2 flex flex-col gap-3.5 pb-2 overscroll-contain">
                  <div className="bg-black/20 backdrop-blur-2xl border border-[#ebaf64]/25 rounded-3xl p-5 flex flex-col gap-3.5 shadow-md shrink-0">
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
                      <span className="text-xs font-mono font-semibold text-[#ebaf64]">{breachPenaltySui || 0.05} SUI</span>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/10 pt-2.5">
                      <span className="text-xs text-white/50">Memory Ledger</span>
                      <span className="text-xs font-mono text-white/70">No Infraction Committed</span>
                    </div>
                  </div>

                  <div className="flex-1 min-h-[220px] flex items-center justify-center pt-1 pb-1 select-none pointer-events-none shrink-0">
                    <img
                      src="/assets/mascot/wally_thumbs.gif"
                      alt="Wally approving your discipline"
                      className="w-72 sm:w-80 h-auto max-h-[360px] object-contain"
                      draggable={false}
                    />
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
                    {breachPenaltySui || 0.05} SUI penalty has been processed via x402 and inscribed to Walrus memory.
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-2 flex flex-col gap-3.5 pb-2 overscroll-contain">
                  <div className="bg-black/20 backdrop-blur-2xl border border-[#ebaf64]/25 rounded-3xl p-5 flex flex-col gap-3.5 shadow-md shrink-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-[#ebaf64]">
                        Infraction Log
                      </span>
                      <span className="text-xs font-mono text-red-400">Breach Enforced</span>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/10 pt-3">
                      <span className="text-xs text-white/70">Penalty Deposit</span>
                      <span className="text-xs font-mono font-semibold text-white">
                        {breachPenaltySui || 0.05} SUI → x402 Vault
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/10 pt-2.5">
                      <span className="text-xs text-white/70">Settlement Engine</span>
                      <span className="text-xs font-mono text-white/80">
                        {latestSettlement?.isRealOnChain
                          ? accountType === "demo"
                            ? "Sui Testnet PTB (Tatum Gateway)"
                            : "Sui Mainnet PTB (Tatum Gateway)"
                          : "Agent Cryptographic Debt Voucher"}
                      </span>
                    </div>

                    {latestSettlement?.isRealOnChain && latestSettlement?.txHash && (
                      <div className="flex items-center justify-between border-t border-white/10 pt-2.5">
                        <span className="text-xs text-white/70">Vault Penalty Digest</span>
                        <a
                          href={
                            latestSettlement.explorerUrl ||
                            `https://suiscan.xyz/${accountType === "demo" ? "testnet" : "mainnet"}/tx/${latestSettlement.txHash}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-mono text-[#ebaf64] hover:underline flex items-center gap-1"
                        >
                          <span>{latestSettlement.txHash.slice(0, 10)}...</span>
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    )}

                    {latestSettlement?.recipientTxHash && (
                      <div className="flex items-center justify-between border-t border-white/10 pt-2.5">
                        <span className="text-xs text-white/70">Recipient Transfer</span>
                        <a
                          href={
                            latestSettlement.recipientExplorerUrl ||
                            `https://suiscan.xyz/${accountType === "demo" ? "testnet" : "mainnet"}/tx/${latestSettlement.recipientTxHash}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-mono text-[#ebaf64] hover:underline flex items-center gap-1"
                        >
                          <span>{latestSettlement.recipientTxHash.slice(0, 10)}...</span>
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    )}

                    {accountType !== "demo" &&
                      parseFloat(sendAmount || "0") > 0 &&
                      !latestSettlement?.recipientTxHash && (
                        <div className="flex items-center justify-between border-t border-white/10 pt-2.5">
                          <span className="text-xs text-amber-300/90">Recipient Transfer</span>
                          <span className="text-[11px] font-mono text-amber-300/90">
                            Not completed on-chain
                          </span>
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

                  <div className="flex-1 min-h-[220px] flex items-center justify-center pt-1 pb-1 select-none pointer-events-none shrink-0">
                    <img
                      src="/assets/mascot/wally_bad.gif"
                      alt="Wally recording infraction in Memories"
                      className="w-72 sm:w-80 h-auto max-h-[360px] object-contain"
                      draggable={false}
                    />
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
          <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
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
        {isMemoryInspectorOpen && (() => {
          const inspectorBlobs = focusedMemoryBlobId
            ? walrusBlobs.filter((b) => b.blobId === focusedMemoryBlobId).slice(0, 1)
            : walrusBlobs;
          return (
          <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-[420px] max-h-[85vh] bg-[#0A0A0C] border border-[#222226] rounded-t-[32px] sm:rounded-[32px] p-6 flex flex-col gap-4 shadow-2xl animate-in slide-in-from-bottom-6 duration-300 overflow-hidden">
              <div className="flex items-center justify-between shrink-0">
                <div className="flex flex-col">
                  <span className="text-base font-semibold text-white">
                    {focusedMemoryBlobId ? "Resolution Memory Payload" : "Walrus Total Recall Memory"}
                  </span>
                  <span className="text-[11px] font-mono text-[#71717A]">
                    {focusedMemoryBlobId
                      ? "Exact Walrus commitment blob triggering this warning"
                      : "Immutable decentralized autonomous agent memory"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsMemoryInspectorOpen(false);
                    setFocusedMemoryBlobId(null);
                  }}
                  className="p-1.5 text-[#71717A] hover:text-white rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Memory History List */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1 overscroll-contain">
                {inspectorBlobs.length === 0 ? (
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
                      Blob #{focusedMemoryBlobId || walrusBlobId || "d4a97f2e8c9b4e11a2f6"}
                    </div>
                    <a
                      href={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${focusedMemoryBlobId || walrusBlobId || "d4a97f2e8c9b4e11a2f6"}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-white hover:underline flex items-center gap-1 mt-1 font-mono"
                    >
                      <span>View on Walrus Aggregator</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                ) : (
                  inspectorBlobs.map((item, idx) => {
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
          );
        })()}

        {/* ==================================================================
            FIRST-ENTRY INTERACTIVE APP TOUR
            ================================================================== */}
        {step === 4 && (
          <AppTour
            isOpen={isTourOpen}
            steps={appTourSteps}
            currentIndex={tourIndex}
            shellRef={shellRef}
            onNext={() => {
              if (tourIndex + 1 < appTourSteps.length) {
                const nextStep = appTourSteps[tourIndex + 1];
                if (
                  nextStep?.id === "send_setup" ||
                  nextStep?.id === "send_memo" ||
                  nextStep?.id === "hold_decision"
                ) {
                  finishAppTour();
                } else {
                  setTourIndex((prev) => prev + 1);
                }
              } else {
                finishAppTour();
              }
            }}
            onSkip={finishAppTour}
          />
        )}

        {/* ==================================================================
            UNIFIED FEEDBACK SNACKBAR
            ================================================================== */}
        {showSnackbar && (
          <div className="absolute bottom-24 left-5 right-5 z-[70] bg-[#141417] border border-[#3F3F46] rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
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
