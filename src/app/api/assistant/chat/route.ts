/**
 * POST /api/assistant/chat — Multi-turn AI assistant chat endpoint.
 *
 * Accepts: { message: string, conversationId?: string }
 * Returns: { ok: true, response: string, conversationId: string, actions?: Array<{ type: string, url?: string }> }
 *
 * If Claude returns tool calls, executes them and feeds results back for a final response.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { chatWithClaude } from "@/lib/claude";
import type { ChatMessage } from "@/lib/claude";
import { buildAssistantContext } from "@/lib/assistant/context";
import { ASSISTANT_TOOLS } from "@/lib/assistant/tools";
import { executeToolCall } from "@/lib/assistant/actions";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const SYSTEM_PROMPT_BASE =
  "You are the AI assistant for Rocket Radio Sales, a radio advertising platform. " +
  "You help the platform owner manage their business. You have access to real-time data " +
  "about leads, campaigns, team members, and alerts. Be concise, direct, and actionable. " +
  "When you reference data, cite specific numbers. When you suggest an action, offer to navigate there.";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    const tenantId = payload.tenantId;
    const userId = payload.sub;

    const body = await req.json();
    const userMessage = body.message as string;
    let conversationId = body.conversationId as string | undefined;

    if (!userMessage || typeof userMessage !== "string") {
      return NextResponse.json(
        { ok: false, error: "message is required" },
        { status: 400 },
      );
    }

    const sb = getSupabaseAdmin();

    // Load or create conversation history
    let history: ChatMessage[] = [];

    if (conversationId) {
      const { data: conv } = await sb
        .from("assistant_conversations")
        .select("messages")
        .eq("id", conversationId)
        .eq("tenant_id", tenantId)
        .single();

      if (conv?.messages) {
        history = conv.messages as ChatMessage[];
      }
    }

    // Build context-enriched system prompt
    const context = await buildAssistantContext(tenantId, userId);
    const systemPrompt = `${SYSTEM_PROMPT_BASE}\n\nHere is the current platform status:\n${context}`;

    // Add user message to history
    history.push({ role: "user", content: userMessage });

    // First Claude call — may return tool calls
    const firstResponse = await chatWithClaude({
      system: systemPrompt,
      messages: history,
      tools: ASSISTANT_TOOLS,
    });

    let finalText = firstResponse.text;
    const actions: Array<{ type: string; url?: string }> = [];

    // If Claude wants to use tools, execute them and get final response
    if (firstResponse.toolCalls && firstResponse.toolCalls.length > 0) {
      // Execute all tool calls
      const toolResults: string[] = [];
      for (const tc of firstResponse.toolCalls) {
        const result = await executeToolCall(tc.name, tc.input, tenantId);
        toolResults.push(`[Tool: ${tc.name}]\n${result}`);

        // Check for navigation actions
        if (tc.name === "navigate_to") {
          try {
            const parsed = JSON.parse(result);
            if (parsed.action === "navigate") {
              actions.push({ type: "navigate", url: parsed.url });
            }
          } catch {
            // Not JSON — just text result
          }
        }
      }

      // Feed tool results back to Claude for a final natural-language response
      const toolContext = toolResults.join("\n\n");
      history.push({
        role: "assistant",
        content: firstResponse.text || "Let me look that up for you.",
      });
      history.push({
        role: "user",
        content: `[Tool results — relay these to me in a helpful, concise way]\n${toolContext}`,
      });

      const secondResponse = await chatWithClaude({
        system: systemPrompt,
        messages: history,
      });

      finalText = secondResponse.text;

      // Remove the synthetic tool-result messages from saved history
      history.pop(); // tool results
      history.pop(); // assistant intermediate
    }

    // Add final assistant response to history
    history.push({ role: "assistant", content: finalText });

    // Save conversation
    if (conversationId) {
      await sb
        .from("assistant_conversations")
        .update({ messages: history, updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    } else {
      const { data: newConv } = await sb
        .from("assistant_conversations")
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          messages: history,
        })
        .select("id")
        .single();

      conversationId = newConv?.id ?? crypto.randomUUID();
    }

    return NextResponse.json({
      ok: true,
      response: finalText,
      conversationId,
      actions: actions.length > 0 ? actions : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
