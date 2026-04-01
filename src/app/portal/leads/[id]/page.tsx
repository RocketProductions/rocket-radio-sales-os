import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";
import { LeadStatusUpdater } from "@/components/leads/LeadStatusUpdater";
import { FunnelProgress } from "@/components/leads/FunnelProgress";
import { LeadTimeline } from "@/components/leads/LeadTimeline";
import { DEFAULT_SEQUENCE } from "@/lib/automation/sequences";
import { ArrowLeft, Phone, Mail, Calendar } from "lucide-react";

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

export default async function PortalLeadDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const [leadRes, eventsRes, automationRes] = await Promise.all([
    supabase
      .from("lp_leads")
      .select("id, name, email, phone, status, notes, created_at, landing_pages ( business_name )")
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

  if (leadRes.error || !leadRes.data) return notFound();

  const lp = leadRes.data as unknown as {
    id: string; name: string | null; email: string | null; phone: string | null;
    status: string; notes: string | null; created_at: string;
    landing_pages: { business_name: string | null } | null;
  };

  const firstName = lp.name?.split(" ")[0] ?? "there";
  const businessName = lp.landing_pages?.business_name ?? "the business";

  const ctx = { firstName, businessName, offer: "our services" };

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

  const displayName = lp.name || "Unknown";

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Back */}
      <Link
        href="/portal"
        className="inline-flex items-center gap-1.5 text-sm text-rocket-muted hover:text-rocket-dark transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Your Leads
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-rocket-dark">{displayName}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-rocket-muted">
            {lp.phone && (
              <a href={`tel:${lp.phone}`} className="flex items-center gap-1 hover:text-rocket-dark">
                <Phone className="h-3.5 w-3.5" />
                {lp.phone}
              </a>
            )}
            {lp.email && (
              <a href={`mailto:${lp.email}`} className="flex items-center gap-1 hover:text-rocket-dark">
                <Mail className="h-3.5 w-3.5" />
                {lp.email}
              </a>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(lp.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LeadStatusBadge status={lp.status} />
          <LeadStatusUpdater leadId={lp.id} currentStatus={lp.status} />
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
          <FunnelProgress status={lp.status as "new" | "contacted" | "booked" | "closed" | "lost"} />
        </CardContent>
      </Card>

      {/* Follow-up activity — read-only for clients */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-rocket-muted uppercase tracking-wide">
            Follow-up activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LeadTimeline
            leadId={lp.id}
            events={events}
            pending={pending}
            completed={completed}
            readOnly
          />
        </CardContent>
      </Card>

      {/* Notes */}
      {lp.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-rocket-muted uppercase tracking-wide">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-rocket-dark whitespace-pre-wrap">{lp.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
