/**
 * Auto-Response Engine
 *
 * When a lead arrives, this engine:
 * 1. Sends an instant response (text and/or email)
 * 2. Schedules follow-up steps in automation_runs
 * 3. Each scheduled step is picked up later by a cron/worker
 *
 * The client sees: "We texted Sarah at 2:03pm" — not "automation triggered"
 *
 * Lead lookup order: lp_leads (primary) → leads (Meta webhook fallback)
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendText, sendEmail } from "./actions";
import { DEFAULT_SEQUENCE, type LeadContext } from "./sequences";

type LeadRow = {
  id: string;
  firstName: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  businessName: string | null;
  table: "lp_leads" | "leads";
};

/** Fetch lead from lp_leads first, fall back to leads table */
async function fetchLead(leadId: string): Promise<LeadRow | null> {
  const supabase = getSupabaseAdmin();

  // Primary: lp_leads (landing page form submissions)
  const { data: lpLead } = await supabase
    .from("lp_leads")
    .select(`id, name, phone, email, status, landing_pages ( business_name )`)
    .eq("id", leadId)
    .single();

  if (lpLead) {
    const lp = lpLead as unknown as {
      id: string; name: string | null; phone: string | null; email: string | null;
      status: string; landing_pages: { business_name: string | null } | null;
    };
    return {
      id: lp.id,
      firstName: lp.name?.split(" ")[0] ?? null,
      phone: lp.phone,
      email: lp.email,
      status: lp.status,
      businessName: lp.landing_pages?.business_name ?? null,
      table: "lp_leads",
    };
  }

  // Fallback: leads table (Meta Lead Ads)
  const { data: metaLead } = await supabase
    .from("leads")
    .select("id, first_name, phone, email, status")
    .eq("id", leadId)
    .single();

  if (metaLead) {
    const m = metaLead as { id: string; first_name: string | null; phone: string | null; email: string | null; status: string };
    return {
      id: m.id,
      firstName: m.first_name,
      phone: m.phone,
      email: m.email,
      status: m.status,
      businessName: null,
      table: "leads",
    };
  }

  return null;
}

/** Mark lead as contacted after first response */
async function markContacted(lead: LeadRow): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (lead.table === "lp_leads") {
    await supabase.from("lp_leads").update({ status: "contacted" }).eq("id", lead.id);
  } else {
    await supabase.from("leads").update({ status: "contacted" }).eq("id", lead.id);
  }
}

/**
 * Triggered when a new lead is created.
 * Sends instant response and schedules follow-ups.
 */
export async function triggerAutoResponse(leadId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const lead = await fetchLead(leadId);
  if (!lead) {
    console.warn(`[AUTO-RESPONSE] Lead ${leadId} not found`);
    return;
  }

  const ctx: LeadContext = {
    firstName: lead.firstName ?? "there",
    businessName: lead.businessName ?? "the business",
    offer: "our services",
  };

  const now = new Date();

  for (const step of DEFAULT_SEQUENCE) {
    const scheduledFor = new Date(now.getTime() + step.delayMinutes * 60_000);

    if (step.delayMinutes === 0) {
      // Execute instant step immediately
      try {
        const msg = step.buildMessage(ctx);

        if (step.channel === "text" && lead.phone) {
          await sendText(leadId, lead.phone, msg.body);
        } else if (step.channel === "email" && lead.email) {
          await sendEmail(leadId, lead.email, msg.subject ?? "Thanks for reaching out", msg.body);
        }

        await supabase.from("automation_runs").insert({
          lead_id: leadId,
          sequence_step: step.step,
          action_type: step.channel,
          status: "sent",
          scheduled_for: scheduledFor.toISOString(),
          executed_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error(`[AUTO-RESPONSE] Step ${step.step} failed:`, err);
        await supabase.from("automation_runs").insert({
          lead_id: leadId,
          sequence_step: step.step,
          action_type: step.channel,
          status: "failed",
          scheduled_for: scheduledFor.toISOString(),
          error_message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    } else {
      // Schedule future step
      await supabase.from("automation_runs").insert({
        lead_id: leadId,
        sequence_step: step.step,
        action_type: step.channel,
        status: "pending",
        scheduled_for: scheduledFor.toISOString(),
      });
    }
  }

  // Mark lead as contacted (we've responded)
  await markContacted(lead);
}

/**
 * Process pending automation runs that are due.
 * Called by a cron job or scheduled task.
 */
export async function processPendingAutomations(): Promise<number> {
  const supabase = getSupabaseAdmin();
  const now = new Date();

  const { data: pendingRuns } = await supabase
    .from("automation_runs")
    .select("id, lead_id, sequence_step, action_type")
    .eq("status", "pending")
    .lte("scheduled_for", now.toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(50);

  if (!pendingRuns?.length) return 0;

  let processed = 0;

  for (const run of pendingRuns as { id: string; lead_id: string; sequence_step: number; action_type: string }[]) {
    const lead = await fetchLead(run.lead_id);

    if (!lead) {
      await supabase
        .from("automation_runs")
        .update({ status: "skipped", executed_at: new Date().toISOString(), error_message: "Lead not found" })
        .eq("id", run.id);
      continue;
    }

    // Skip if lead is already booked, closed, or lost
    if (lead.status === "booked" || lead.status === "closed" || lead.status === "lost") {
      await supabase
        .from("automation_runs")
        .update({ status: "skipped", executed_at: new Date().toISOString(), error_message: `Lead status: ${lead.status}` })
        .eq("id", run.id);
      continue;
    }

    const ctx: LeadContext = {
      firstName: lead.firstName ?? "there",
      businessName: lead.businessName ?? "the business",
      offer: "our services",
    };

    const step = DEFAULT_SEQUENCE.find((s) => s.step === run.sequence_step);
    if (!step) continue;

    try {
      const msg = step.buildMessage(ctx);

      if (step.channel === "text" && lead.phone) {
        await sendText(lead.id, lead.phone, msg.body);
      } else if (step.channel === "email" && lead.email) {
        await sendEmail(lead.id, lead.email, msg.subject ?? "Following up", msg.body);
      }

      await supabase
        .from("automation_runs")
        .update({ status: "sent", executed_at: new Date().toISOString() })
        .eq("id", run.id);

      processed++;
    } catch (err) {
      await supabase
        .from("automation_runs")
        .update({
          status: "failed",
          executed_at: new Date().toISOString(),
          error_message: err instanceof Error ? err.message : "Unknown error",
        })
        .eq("id", run.id);
    }
  }

  return processed;
}
