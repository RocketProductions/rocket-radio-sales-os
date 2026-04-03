/**
 * Shared Claude client for AI agent tasks (triage, ops report, client success).
 *
 * Campaign content generation stays on OpenAI (GPT-4o) — see ai/providers/openaiProvider.ts.
 * Agents use Claude for analysis, scoring, and report writing.
 *
 * Lazy initialization — never crashes at import time if ANTHROPIC_API_KEY is missing.
 */

import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (_client) return _client;

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set — agent features require it");

  _client = new Anthropic({ apiKey: key });
  return _client;
}

/**
 * Simple ask: one system prompt + one user message → string response.
 * Used by most agents for scoring, analysis, and report generation.
 */
export async function askClaude(
  system: string,
  message: string,
  opts?: { maxTokens?: number; temperature?: number },
): Promise<string> {
  const client = getClient();

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: opts?.maxTokens ?? 2048,
    temperature: opts?.temperature ?? 0.3,
    system,
    messages: [{ role: "user", content: message }],
  });

  const block = response.content[0];
  if (block.type === "text") return block.text;
  return "";
}

/**
 * Ask Claude and parse JSON response.
 * Strips markdown fences if present.
 */
/* ── Types for multi-turn chat with tool use ─────────────────────────── */

export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Multi-turn chat with optional tool use.
 * Returns the text response and any tool calls Claude wants to make.
 */
export async function chatWithClaude(opts: {
  system: string;
  messages: ChatMessage[];
  tools?: ClaudeTool[];
  maxTokens?: number;
}): Promise<{
  text: string;
  toolCalls?: Array<{ name: string; input: Record<string, unknown> }>;
}> {
  const client = getClient();

  // Build the messages.create() call with optional tools
  const mappedMessages = opts.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const mappedTools = opts.tools?.length
    ? opts.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema as Anthropic.Tool.InputSchema,
      }))
    : undefined;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: opts.maxTokens ?? 4096,
    temperature: 0.3,
    system: opts.system,
    messages: mappedMessages,
    ...(mappedTools ? { tools: mappedTools } : {}),
  });

  let text = "";
  const toolCalls: Array<{ name: string; input: Record<string, unknown> }> = [];

  for (const block of response.content) {
    if (block.type === "text") {
      text += block.text;
    } else if (block.type === "tool_use") {
      toolCalls.push({
        name: block.name,
        input: block.input as Record<string, unknown>,
      });
    }
  }

  return {
    text,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
  };
}

/**
 * Ask Claude and parse JSON response.
 * Strips markdown fences if present.
 */
export async function askClaudeJson<T = unknown>(
  system: string,
  message: string,
  opts?: { maxTokens?: number; temperature?: number },
): Promise<T> {
  const raw = await askClaude(system, message, opts);
  // Strip markdown code fences if Claude wraps the response
  const cleaned = raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
  return JSON.parse(cleaned) as T;
}
