/**
 * assistant/tools.ts — Tool definitions for the AI assistant.
 *
 * These are passed to the Anthropic API so Claude can request data lookups
 * and navigation actions during a conversation.
 */

import type { ClaudeTool } from "@/lib/claude";

export const ASSISTANT_TOOLS: ClaudeTool[] = [
  {
    name: "query_leads",
    description:
      "Search leads by date range, status, or business name. Returns count and top results.",
    input_schema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Look back this many days (default 7)",
        },
        status: {
          type: "string",
          description: "Filter by lead status (new, contacted, qualified, won, lost)",
        },
        search: {
          type: "string",
          description: "Search by business name or lead name",
        },
      },
    },
  },
  {
    name: "query_campaigns",
    description: "List active campaigns with lead counts and status.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description: "Filter by campaign status (active, paused, completed, draft)",
        },
      },
    },
  },
  {
    name: "query_metrics",
    description:
      "Get aggregate metrics: total leads, conversion rates, revenue estimates.",
    input_schema: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["today", "week", "month", "all"],
          description: "Time period for metrics",
        },
      },
    },
  },
  {
    name: "navigate_to",
    description: "Generate a dashboard URL for the user to navigate to.",
    input_schema: {
      type: "object",
      properties: {
        page: {
          type: "string",
          description:
            "Page name: dashboard, leads, campaigns, prospects, settings, proposals, content, reports",
        },
        id: {
          type: "string",
          description: "Optional entity ID for detail pages",
        },
      },
      required: ["page"],
    },
  },
  {
    name: "list_alerts",
    description: "List unresolved client alerts with recommendations.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
];
