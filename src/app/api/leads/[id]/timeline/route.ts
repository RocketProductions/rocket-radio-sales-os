/**
 * GET /api/leads/[id]/timeline
 *
 * Returns the full lead context for the detail view:
 * - Lead data
 * - Past events (activity log)
 * - Pending automation runs with message previews
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { DEFAULT_SEQUENCE } from "@/lib/automation/sequences";

const STEP_LABELS: Record<number, string> = {
  1: "Instant text",
  2: "Day 1 email",
  3: "Day 3 text",
  4: "Day 7 email",
  5: "Day 14 text",
};

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    // Fetch lead + landing page context in parallel with events + automation
    const [leadRes, eventsRes, automationRes] = await Promise.all([
      supabase
        .from("leads")
        .select("id, first_name, last_name, email, phone, status, notes, source, created_at, updated_at, campaign_id")
        .eq("id", id)
        .single(),

      supabase
        .from("lead_events")
        .select("id, event_type, message, metadata, created_at")
        .eq("lead_id", id)
        .order("created_at", { ascending: true }),

      supabase
        .from("automation_runs")
        .select("id, sequence_step, action_type, status, scheduled_for, executed_at, message_preview, error_message")
        .eq("lead_id", id)
        .order("sequence_step", { ascending: true }),
    ]);

    if (leadRes.error || !leadRes.data) {
      // Try lp_leads as fallback (landing page form submissions)
      const { data: lpLead, error: lpError } = await supabase
        .from("lp_leads")
        .select(`id, name, email, phone, status, notes, extra_fields, created_at, updated_at,
                 landing_pages ( id, business_name, slug )`)
        .eq("id", id)
        .single();

      if (lpError || !lpLead) {
        return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });
      }

      const lp = lpLead as unknown as {
        id: string; name: string | null; email: string | null; phone: string | null;
        status: string; notes: string | null; extra_fields: Record<string, unknown> | null;
        created_at: string; updated_at: string;
        landing_pages: { id: string; business_name: string | null; slug: string } | null;
      };

      return NextResponse.json({
        ok: true,
        lead: {
          id: lp.id,
          firstName: lp.name?.split(" ")[0] ?? null,
          lastName:  lp.name?.split(" ").slice(1).join(" ") ?? null,
          email:     lp.email,
          phone:     lp.phone,
          status:    lp.status,
          notes:     lp.notes,
          source:    "form",
          businessName: (lp.landing_pages as { business_name?: string | null } | null)?.business_name ?? null,
          createdAt: lp.created_at,
          updatedAt: lp.updated_at,
        },
        events:    [],
        pending:   [],
        completed: [],
      });
    }

    const lead = leadRes.data as {
      id: string; first_name: string | null; last_name: string | null;
      email: string | null; phone: string | null; status: string;
      notes: string | null; source: string; created_at: string; updated_at: string;
      campaign_id: string;
    };

    // Enrich automation runs with step labels + message previews
    const allRuns = (automationRes.data ?? []) as {
      id: string; sequence_step: number; action_type: string; status: string;
      scheduled_for: string; executed_at: string | null;
      message_preview: string | null; error_message: string | null;
    }[];

    // Build message previews for pending steps that don't have one stored
    const ctx = {
      firstName: lead.first_name ?? "there",
      businessName: "your business", // will be enriched by campaign lookup if needed
      offer: "our services",
    };

    const enrichedRuns = allRuns.map((run) => {
      const step = DEFAULT_SEQUENCE.find((s) => s.step === run.sequence_step);
      let preview = run.message_preview;

      if (!preview && step) {
        const msg = step.buildMessage(ctx);
        preview = msg.subject ? `${msg.subject}: ${msg.body}` : msg.body;
      }

      return {
        id:           run.id,
        sequenceStep: run.sequence_step,
        stepLabel:    STEP_LABELS[run.sequence_step] ?? `Step ${run.sequence_step}`,
        actionType:   run.action_type,
        status:       run.status,
        scheduledFor: run.scheduled_for,
        executedAt:   run.executed_at,
        preview:      preview ?? null,
        errorMessage: run.error_message,
      };
    });

    const pending   = enrichedRuns.filter((r) => r.status === "pending");
    const completed = enrichedRuns.filter((r) => r.status !== "pending");

    return NextResponse.json({
      ok: true,
      lead: {
        id:           lead.id,
        firstName:    lead.first_name,
        lastName:     lead.last_name,
        email:        lead.email,
        phone:        lead.phone,
        status:       lead.status,
        notes:        lead.notes,
        source:       lead.source,
        createdAt:    lead.created_at,
        updatedAt:    lead.updated_at,
      },
      events:    eventsRes.data ?? [],
      pending,
      completed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
