import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";
import { LeadStatusUpdater } from "@/components/leads/LeadStatusUpdater";
import { FunnelProgress } from "@/components/leads/FunnelProgress";
import { LeadTimeline } from "@/components/leads/LeadTimeline";
import { DEFAULT_SEQUENCE } from "@/lib/automation/sequences";
import { ArrowLeft, Phone, Mail, Calendar, User } from "lucide-react";

export const dynamic = "force-dynamic";

const STEP_LABELS: Record<number, string> = {
  1: "Instant text",
  2: "Day 1 email",
  3: "Day 3 text",
  4: "Day 7 email",
  5: "Day 14 text",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  // Try leads table first (automation-connected leads)
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

  // Fallback to lp_leads
  let lead: {
    id: string; firstName: string | null; lastName: string | null;
    email: string | null; phone: string | null; status: string;
    notes: string | null; source: string; businessName: string | null;
    createdAt: string;
  } | null = null;

  if (!leadRes.error && leadRes.data) {
    const d = leadRes.data as {
      id: string; first_name: string | null; last_name: string | null;
      email: string | null; phone: string | null; status: string;
      notes: string | null; source: string; created_at: string; campaign_id: string;
    };
    lead = {
      id: d.id,
      firstName: d.first_name,
      lastName: d.last_name,
      email: d.email,
      phone: d.phone,
      status: d.status,
      notes: d.notes,
      source: d.source,
      businessName: null,
      createdAt: d.created_at,
    };
  } else {
    const { data: lpLead, error: lpError } = await supabase
      .from("lp_leads")
      .select(`id, name, email, phone, status, notes, created_at,
               landing_pages ( business_name )`)
      .eq("id", id)
      .single();

    if (lpError || !lpLead) return notFound();

    const lp = lpLead as unknown as {
      id: string; name: string | null; email: string | null; phone: string | null;
      status: string; notes: string | null; created_at: string;
      landing_pages: { business_name: string | null } | null;
    };

    lead = {
      id: lp.id,
      firstName: lp.name?.split(" ")[0] ?? null,
      lastName: lp.name?.split(" ").slice(1).join(" ") ?? null,
      email: lp.email,
      phone: lp.phone,
      status: lp.status,
      notes: lp.notes,
      source: "form",
      businessName: lp.landing_pages?.business_name ?? null,
      createdAt: lp.created_at,
    };
  }

  // Enrich automation runs with labels + previews
  const ctx = {
    firstName: lead.firstName ?? "there",
    businessName: lead.businessName ?? "your business",
    offer: "our services",
  };

  type RawRun = {
    id: string; sequence_step: number; action_type: string; status: string;
    scheduled_for: string; executed_at: string | null;
    message_preview: string | null; error_message: string | null;
  };

  const allRuns = ((automationRes.data ?? []) as RawRun[]).map((run) => {
    const step = DEFAULT_SEQUENCE.find((s) => s.step === run.sequence_step);
    let preview = run.message_preview;
    if (!preview && step) {
      const msg = step.buildMessage(ctx);
      preview = msg.subject ? `${msg.subject}: ${msg.body}` : msg.body;
    }
    return {
      id: run.id,
      sequenceStep: run.sequence_step,
      stepLabel: STEP_LABELS[run.sequence_step] ?? `Step ${run.sequence_step}`,
      actionType: run.action_type,
      status: run.status,
      scheduledFor: run.scheduled_for,
      executedAt: run.executed_at,
      preview: preview ?? null,
      errorMessage: run.error_message,
    };
  });

  const pending   = allRuns.filter((r) => r.status === "pending");
  const completed = allRuns.filter((r) => r.status !== "pending");

  type EventRow = { id: string; event_type: string; message: string | null; metadata: Record<string, unknown> | null; created_at: string };
  const events = (eventsRes.data ?? []) as EventRow[];

  const displayName = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Unknown";

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Back */}
      <Link
        href="/dashboard/leads"
        className="inline-flex items-center gap-1.5 text-sm text-rocket-muted hover:text-rocket-dark transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        All Leads
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-rocket-dark">{displayName}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-rocket-muted">
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-rocket-dark">
                <Phone className="h-3.5 w-3.5" />
                {lead.phone}
              </a>
            )}
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="flex items-center gap-1 hover:text-rocket-dark">
                <Mail className="h-3.5 w-3.5" />
                {lead.email}
              </a>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(lead.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
            </span>
            {lead.businessName && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {lead.businessName}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LeadStatusBadge status={lead.status} />
          <LeadStatusUpdater leadId={lead.id} currentStatus={lead.status} />
        </div>
      </div>

      {/* Funnel progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-rocket-muted uppercase tracking-wide">
            Where they are
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          <FunnelProgress status={lead.status as "new" | "contacted" | "booked" | "closed" | "lost"} />
        </CardContent>
      </Card>

      {/* Timeline + automation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-rocket-muted uppercase tracking-wide">
            Follow-up activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LeadTimeline
            leadId={lead.id}
            events={events}
            pending={pending}
            completed={completed}
          />
        </CardContent>
      </Card>

      {/* Notes */}
      {lead.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-rocket-muted uppercase tracking-wide">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-rocket-dark whitespace-pre-wrap">{lead.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
