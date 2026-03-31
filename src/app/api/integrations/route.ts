/**
 * Integrations Status API
 *
 * GET /api/integrations — returns the status of all integrations
 * Used by the internal dashboard to show what's live vs. in stub mode.
 */

import { NextResponse } from "next/server";
import { getIntegrationStatuses } from "@/integrations/registry";

export async function GET() {
  const statuses = getIntegrationStatuses();
  const liveCount = statuses.filter((s) => s.mode === "live").length;

  return NextResponse.json({
    integrations: statuses,
    summary: {
      total: statuses.length,
      live: liveCount,
      stub: statuses.length - liveCount,
    },
  });
}
