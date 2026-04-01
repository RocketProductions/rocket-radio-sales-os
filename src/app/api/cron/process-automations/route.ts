/**
 * GET /api/cron/process-automations
 *
 * Called by Vercel Cron every 5 minutes.
 * Picks up any automation_runs with status="pending" and scheduled_for <= now,
 * sends the text or email, and marks the run as sent/failed.
 *
 * Protected by CRON_SECRET — Vercel sets this automatically in the
 * Authorization header when invoking cron jobs.
 */

import { NextRequest, NextResponse } from "next/server";
import { processPendingAutomations } from "@/lib/automation/engine";

export const runtime = "nodejs";
export const maxDuration = 60; // seconds — enough for 50 runs

export async function GET(req: NextRequest) {
  // Verify this is a legitimate Vercel cron call
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const processed = await processPendingAutomations();
    console.log(`[cron] Processed ${processed} automation run(s)`);
    return NextResponse.json({ ok: true, processed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[cron] process-automations failed:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
