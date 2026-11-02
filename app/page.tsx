"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import {
  ShieldAlert,
  Brain,
  Lock,
  Flame,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Coins,
  History,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolInvocations?: Array<{
    toolName: string;
    args: Record<string, unknown>;
    result?: unknown;
  }>;
}

export default function YearboundApp() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    "Commit to running 4x a week. 10 SUI penalty per missed run.",
    "No impulse online purchases over $50. 25 SUI penalty.",
    "I skipped my gym session today because I worked late.",
    "How much money is currently locked in my Sui vault?",
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body received from chat agent.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      const assistantMessageId = `asst_${Date.now()}`;

      // Insert initial empty assistant message
      setMessages((prev) => [
        ...prev,
        { id: assistantMessageId, role: "assistant", content: "" },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantText += chunk;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: assistantText }
              : msg
          )
        );
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to communicate with agent.";
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "assistant",
          content: `⚠️ Notice: ${errorMsg}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void handleSendMessage(input);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Navigation */}
      <header className="border-b border-neutral-800/80 bg-neutral-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Lock className="w-5 h-5 text-neutral-950" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-amber-200 via-neutral-100 to-neutral-300 bg-clip-text text-transparent">
                YEARBOUND
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-mono text-neutral-400 border border-neutral-700/60 rounded px-1.5 py-0.5">
                Total Recall Edition
              </span>
            </div>
          </div>

          {/* Infrastructure Health Badges */}
          <div className="flex items-center gap-2 sm:gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 bg-neutral-800/80 border border-neutral-700/50 rounded-full px-3 py-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <Brain className="w-3.5 h-3.5" />
              <span>Walrus Memory</span>
            </div>
            <div className="flex items-center gap-1.5 bg-neutral-800/80 border border-neutral-700/50 rounded-full px-3 py-1 text-amber-300">
              <Coins className="w-3.5 h-3.5" />
              <span>Tatum Sui RPC</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="max-w-6xl mx-auto px-4 py-6 flex-1 w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sidebar: Vault & Commitments Summary */}
        <aside className="space-y-5 lg:col-span-1">
          {/* Personal Escrow Vault Card */}
          <div className="rounded-2xl border border-neutral-800 bg-gradient-to-b from-neutral-900 to-neutral-950 p-5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-neutral-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                Sui Escrow Vault
              </span>
              <span className="text-[11px] font-mono text-amber-400/90 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded-full">
                Locked till Dec 31
              </span>
            </div>

            <div className="my-3">
              <div className="text-3xl font-extrabold tracking-tight text-neutral-50 flex items-baseline gap-2">
                15.00 <span className="text-sm font-semibold text-amber-400 font-mono">SUI</span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Accumulated from 2 broken commitments. Released automatically to your wallet at year-end.
              </p>
            </div>

            <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400 font-mono">
              <span>Status: Active Escrow</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> x402 Enforced
              </span>
            </div>
          </div>

          {/* Active Commitments Feed */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" /> Active Pacts
              </h3>
              <span className="text-xs text-neutral-400 font-mono">2 Pacts</span>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-neutral-200">Gym 4x Weekly</span>
                  <span className="font-mono text-amber-400 font-semibold">10 SUI/miss</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                  <span className="text-emerald-400 flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3" /> 3 Honored
                  </span>
                  <span>•</span>
                  <span className="text-rose-400 flex items-center gap-0.5">
                    <AlertTriangle className="w-3 h-3" /> 1 Missed
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-neutral-200">No Online Impulse &gt; $50</span>
                  <span className="font-mono text-amber-400 font-semibold">25 SUI/miss</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                  <span className="text-emerald-400 flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3" /> 100% Honored
                  </span>
                  <span>•</span>
                  <span>Monitored via Tatum</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-neutral-950/40 p-3 border border-neutral-800/50 text-[11px] text-neutral-400">
              💡 <span className="font-medium text-neutral-300">The Principle:</span> Breaking a commitment doesn&apos;t make you poorer; it makes your funds temporarily inaccessible.
            </div>
          </div>
        </aside>

        {/* Right Area: Interactive Agent Chat & Memory Execution */}
        <section className="lg:col-span-2 flex flex-col h-[750px] rounded-2xl border border-neutral-800 bg-neutral-900/40 backdrop-blur-sm overflow-hidden shadow-2xl">
          {/* Chat Header */}
          <div className="px-5 py-4 border-b border-neutral-800/80 bg-neutral-900/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse"></div>
              <div>
                <h2 className="text-sm font-semibold text-neutral-200">Yearbound Co-Pilot</h2>
                <p className="text-xs text-neutral-400 font-mono">
                  Autonomous Memory Layer: Walrus Mainnet
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-neutral-400 bg-neutral-800/60 px-2.5 py-1 rounded-md border border-neutral-700/50">
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span>Cross-Session Total Recall</span>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4 text-neutral-400">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-1">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-neutral-200">
                  Make a pact with your future self.
                </h3>
                <p className="text-xs leading-relaxed">
                  Establish your commitment year. State your goals, assign penalties, and let your sovereign agent hold your money accountable until December 31.
                </p>

                {/* Quick Starters */}
                <div className="w-full grid grid-cols-1 gap-2 pt-2 text-left">
                  {quickPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => void handleSendMessage(prompt)}
                      className="p-2.5 rounded-xl border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800/70 hover:border-neutral-700 text-xs text-neutral-300 transition-all flex items-center justify-between group"
                    >
                      <span className="truncate">{prompt}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-amber-400 transition-colors shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex flex-col ${
                    message.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <span className="text-[11px] font-mono text-neutral-500 mb-1">
                    {message.role === "user" ? "You" : "Yearbound Co-Pilot"}
                  </span>
                  <div
                    className={`p-3.5 rounded-2xl text-xs sm:text-sm max-w-[85%] leading-relaxed ${
                      message.role === "user"
                        ? "bg-amber-600 text-neutral-950 font-medium"
                        : "bg-neutral-800/80 border border-neutral-700/60 text-neutral-200 whitespace-pre-wrap"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400/80 italic">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                Recalling Walrus context and evaluating commitments...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={handleSubmit}
            className="p-3 border-t border-neutral-800/80 bg-neutral-900/90 flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Check in on your goal or set a new commitment..."
              className="flex-1 bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0"
            >
              <span>Send</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
