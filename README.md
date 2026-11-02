# 🏆 Yearbound

> **Make a pact with your future self.**  
> An autonomous commitment & accountability protocol powered by **Walrus Memory on Mainnet**, **Tatum Sui RPCs**, and **x402 Agent Micropayments**.

Built for the **Tatum × Walrus Memory: "Total Recall" Hackathon** (Consumer Finance Track).

---

## 🌟 Overview

Every January, millions make New Year's resolutions. By February, over 80% have quit.

**Yearbound** transforms resolutions into year-long programmable financial commitments by attaching real monetary stakes to broken promises. 

Whenever a commitment is broken, the agreed penalty is automatically deposited into a **personal time-locked vault on the Sui blockchain**, where it remains locked until **December 31**. 

> **The Principle:** Breaking a commitment doesn't make you poorer — it makes your money temporarily inaccessible.

---

## 🧠 Total Recall: The Persistent Memory Architecture

Unlike typical chatbots that start from zero context every session, Yearbound uses **Walrus Memory (`@mysten-incubation/memwal`)** to construct a permanent, sovereign cognitive profile across four evolving layers:

1. **Commitment Rules:** Explicit targets, deadlines, penalty amounts, and agreed exceptions.
2. **Accountability Log:** Every check-in, slip-up, and penalty execution.
3. **Behavioral Patterns:** Patterns synthesized over months (e.g. *"User skips gym on Friday evenings following high-stress work days"*).
4. **Emotional Context & Reflections:** The user's own reflections recorded during previous failures.

---

## 🛠️ Architecture & Tech Stack

```
                              ┌────────────────────────────────────────┐
                              │           YEARBOUND CLIENT             │
                              │        Next.js 14 + Tailwind           │
                              └──────────────────┬─────────────────────┘
                                                 │
                                                 ▼
                              ┌────────────────────────────────────────┐
                              │         AI AGENT REASONING             │
                              │     Google Gemini + Vercel AI SDK      │
                              └───────┬──────────────────────┬─────────┘
                                      │                      │
                   ┌──────────────────▼──────┐        ┌──────▼──────────────────┐
                   │     WALRUS MEMORY       │        │     TATUM SUI RPC       │
                   │   (@mysten-incubation/  │        │   (Object Inspection &  │
                   │        memwal)          │        │    Transaction Feed)    │
                   └─────────────────────────┘        └──────┬──────────────────┘
                                                             │
                                                             ▼
                                                      ┌─────────────────────────┐
                                                      │  x402 VAULT PROTOCOL    │
                                                      │ (HTTP 402 → PTB Settle  │
                                                      │   → Sui Move Vault)     │
                                                      └─────────────────────────┘
```

- **Frontend & API Routes:** Next.js 16 (App Router) + Strict TypeScript + Tailwind CSS
- **AI Agent Engine:** Google Gemini via Vercel AI SDK with multi-step tool execution
- **Decentralized Memory Layer:** Walrus Memory (`@mysten-incubation/memwal`)
- **Blockchain Infrastructure:** Tatum Sui RPC Gateway (`api.tatum.io`)
- **Escrow Smart Contract:** Sui Move time-locked vault (`contracts/yearbound/sources/vault.move`)
- **Agent Payments:** x402 Micropayment Protocol (`app/api/vault/route.ts`)

---

## 🚀 Quickstart

### 1. Prerequisites
- Node.js $\ge 20$
- npm $\ge 10$

### 2. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Populate the keys:
- `GOOGLE_GENERATIVE_AI_API_KEY`: From [Google AI Studio](https://aistudio.google.com)
- `TATUM_API_KEY`: From [Tatum Dashboard](https://dashboard.tatum.io)
- `WALRUS_DELEGATE_KEY` & `WALRUS_ACCOUNT_ID`: From Walrus Developer Portal

*(Note: If credentials are not supplied, the app gracefully falls back to deterministic local preview mode via `MemWalMock` and public Sui RPC).*

### 3. Install & Run
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start your commitment year.

---

## 📜 Smart Contract (Sui Move)

The vault contract is located at [`contracts/yearbound/sources/vault.move`](./contracts/yearbound/sources/vault.move).

Key Entry Functions:
- `create_vault(unlock_timestamp_ms)`: Deploys a new shared time-locked vault.
- `deposit_penalty(vault, payment)`: Autonomously called by the agent via x402 when a commitment is broken.
- `withdraw(vault, clock)`: Reclaims 100% of accumulated funds after the unlock timestamp (Dec 31).

---

## 🏆 Hackathon Tracks & Bounties Targeted
- **Consumer Finance Track (1st Place):** Programmable personal escrow & behavioral financial guardrails.
- **Best Walrus Memory ($500):** Deepest cross-session learning loop altering agent behavior over time.
- **Best Agent Payments ($500):** Real HTTP 402 challenge → signed Sui settlement flow.
- **Best Tatum AI Builder ($500):** Full-stack Sui infrastructure powered by Tatum RPC endpoints.
