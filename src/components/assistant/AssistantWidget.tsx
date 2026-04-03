"use client";

import { useState, useRef, useEffect, useCallback } from "react";

/* ── Types ────────────────────────────────────────────────────────────── */

interface SummarySection {
  type: string;
  count?: number;
  items?: string[];
  label: string;
}

interface ChatAction {
  type: string;
  url?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  actions?: ChatAction[];
}

/* ── Component ────────────────────────────────────────────────────────── */

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummarySection[]>([]);
  const [summaryLoaded, setSummaryLoaded] = useState(false);
  const [attentionCount, setAttentionCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Fetch summary on first open
  const fetchSummary = useCallback(async () => {
    if (summaryLoaded) return;
    try {
      const res = await fetch("/api/assistant/summary");
      const data = await res.json();
      if (data.ok && data.sections) {
        setSummary(data.sections);
        const total = data.sections.reduce(
          (acc: number, s: SummarySection) => acc + (s.count ?? s.items?.length ?? 0),
          0,
        );
        setAttentionCount(total);
      }
    } catch {
      // Silently fail — summary is optional
    }
    setSummaryLoaded(true);
  }, [summaryLoaded]);

  // Fetch summary on mount (for badge count) and on open
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  function handleOpen() {
    setOpen(true);
    fetchSummary();
  }

  async function handleSend() {
    const msg = input.trim();
    if (!msg || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          conversationId,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response,
            actions: data.actions,
          },
        ]);
        if (data.conversationId) setConversationId(data.conversationId);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Sorry, something went wrong: ${data.error ?? "Unknown error"}`,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Network error. Please try again." },
      ]);
    }

    setLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  /* ── Collapsed: floating button ─────────────────────────────────────── */
  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2"
        style={{
          backgroundColor: "#0B1D3A",
          color: "#D4A853",
        }}
        aria-label="Open AI Assistant"
      >
        {/* Rocket icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
          <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
          <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
          <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
        </svg>

        {/* Badge */}
        {attentionCount > 0 && (
          <span
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold"
            style={{ backgroundColor: "#D4A853", color: "#0B1D3A" }}
          >
            {attentionCount > 99 ? "99+" : attentionCount}
          </span>
        )}

        {/* Pulse animation when items need attention */}
        {attentionCount > 0 && (
          <span
            className="absolute inset-0 animate-ping rounded-full opacity-30"
            style={{ backgroundColor: "#D4A853" }}
          />
        )}
      </button>
    );
  }

  /* ── Expanded: chat panel ───────────────────────────────────────────── */
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden rounded-xl shadow-2xl"
      style={{
        width: 400,
        height: 600,
        maxHeight: "calc(100vh - 3rem)",
        backgroundColor: "#0B1D3A",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: "#0B1D3A", borderBottom: "1px solid rgba(212,168,83,0.2)" }}
      >
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#D4A853"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
          </svg>
          <span className="text-sm font-semibold" style={{ color: "#D4A853" }}>
            Rocket Radio Assistant
          </span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-white/10"
          style={{ color: "#D4A853" }}
          aria-label="Close assistant"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 1l12 12M13 1L1 13" />
          </svg>
        </button>
      </div>

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3"
        style={{ backgroundColor: "#0f2847" }}
      >
        {/* Summary cards (shown once on first open) */}
        {summary.length > 0 && messages.length === 0 && (
          <div className="mb-4 space-y-2">
            {summary.map((section, i) => (
              <div
                key={i}
                className="rounded-lg px-3 py-2 text-sm"
                style={{
                  backgroundColor: "rgba(212,168,83,0.1)",
                  border: "1px solid rgba(212,168,83,0.2)",
                  color: "#e2d5b8",
                }}
              >
                <div className="flex items-center justify-between">
                  <span>{section.label}</span>
                  {section.count !== undefined && (
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-bold"
                      style={{ backgroundColor: "#D4A853", color: "#0B1D3A" }}
                    >
                      {section.count}
                    </span>
                  )}
                </div>
                {section.items && (
                  <div className="mt-1 text-xs opacity-80">
                    {section.items.join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`mb-3 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className="max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap"
              style={
                msg.role === "user"
                  ? {
                      backgroundColor: "#D4A853",
                      color: "#0B1D3A",
                      borderBottomRightRadius: 4,
                    }
                  : {
                      backgroundColor: "rgba(255,255,255,0.08)",
                      color: "#e2d5b8",
                      borderBottomLeftRadius: 4,
                    }
              }
            >
              {msg.content}

              {/* Navigation action cards */}
              {msg.actions?.map((action, j) =>
                action.url ? (
                  <a
                    key={j}
                    href={action.url}
                    className="mt-2 flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: "rgba(212,168,83,0.15)",
                      border: "1px solid rgba(212,168,83,0.3)",
                      color: "#D4A853",
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 6h10M7 2l4 4-4 4" />
                    </svg>
                    Go to {action.url.replace("/dashboard/", "").replace("/dashboard", "Dashboard")}
                  </a>
                ) : null,
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="mb-3 flex justify-start">
            <div
              className="flex items-center gap-1 rounded-lg px-4 py-3"
              style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
            >
              <span
                className="h-2 w-2 animate-bounce rounded-full"
                style={{ backgroundColor: "#D4A853", animationDelay: "0ms" }}
              />
              <span
                className="h-2 w-2 animate-bounce rounded-full"
                style={{ backgroundColor: "#D4A853", animationDelay: "150ms" }}
              />
              <span
                className="h-2 w-2 animate-bounce rounded-full"
                style={{ backgroundColor: "#D4A853", animationDelay: "300ms" }}
              />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderTop: "1px solid rgba(212,168,83,0.2)", backgroundColor: "#0B1D3A" }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything..."
          className="flex-1 rounded-lg border-0 px-3 py-2 text-sm outline-none"
          style={{
            backgroundColor: "rgba(255,255,255,0.08)",
            color: "#e2d5b8",
          }}
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-lg transition-opacity disabled:opacity-40"
          style={{ backgroundColor: "#D4A853", color: "#0B1D3A" }}
          aria-label="Send message"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 8h14M9 2l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
