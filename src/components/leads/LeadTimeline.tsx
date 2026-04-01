"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageSquare, Mail, Calendar, CheckCircle2, XCircle,
  Clock, AlertTriangle, Ban, SkipForward, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LeadEvent {
  id:         string;
  event_type: string;
  message:    string | null;
  metadata:   Record<string, unknown> | null;
  created_at: string;
}

export interface AutomationRun {
  id:           string;
  sequenceStep: number;
  stepLabel:    string;
  actionType:   string;
  status:       string;
  scheduledFor: string;
  executedAt:   string | null;
  preview:      string | null;
  errorMessage: string | null;
}

interface LeadTimelineProps {
  leadId:    string;
  events:    LeadEvent[];
  pending:   AutomationRun[];
  completed: AutomationRun[];
  onUpdate?: () => void;
  /** Client portal mode — hides stop/skip controls */
  readOnly?: boolean;
}

// ── Icon helpers ──────────────────────────────────────────────────────────────

function eventIcon(type: string) {
  if (type.includes("text") || type === "auto_text") return <MessageSquare className="h-3.5 w-3.5" />;
  if (type === "email_opened")  return <Mail className="h-3.5 w-3.5" />;
  if (type === "email_clicked") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (type === "email_bounced") return <AlertTriangle className="h-3.5 w-3.5" />;
  if (type.includes("email") || type === "auto_email") return <Mail className="h-3.5 w-3.5" />;
  if (type === "booked") return <Calendar className="h-3.5 w-3.5" />;
  if (type === "automation_stopped" || type === "automation_step_skipped") return <Ban className="h-3.5 w-3.5" />;
  if (type.includes("status")) return <CheckCircle2 className="h-3.5 w-3.5" />;
  return <Clock className="h-3.5 w-3.5" />;
}

function eventColor(type: string) {
  if (type.includes("text") || type === "auto_text") return "text-rocket-blue bg-rocket-blue/10";
  if (type === "email_opened")  return "text-green-600 bg-green-50";
  if (type === "email_clicked") return "text-green-700 bg-green-100";
  if (type === "email_bounced") return "text-red-500 bg-red-50";
  if (type.includes("email") || type === "auto_email") return "text-violet-600 bg-violet-50";
  if (type === "booked") return "text-green-600 bg-green-50";
  if (type.includes("stopped") || type.includes("skipped")) return "text-slate-500 bg-slate-100";
  return "text-slate-500 bg-slate-100";
}

function actionIcon(type: string) {
  if (type === "text") return <MessageSquare className="h-3.5 w-3.5" />;
  if (type === "email") return <Mail className="h-3.5 w-3.5" />;
  return <Clock className="h-3.5 w-3.5" />;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatFutureDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Due now";
  if (diffDays === 1) return "Tomorrow";
  return `In ${diffDays} days (${d.toLocaleDateString([], { month: "short", day: "numeric" })})`;
}

// ── Main component ─────────────────────────────────────────────────────────────

export function LeadTimeline({ leadId, events, pending, completed, onUpdate, readOnly = false }: LeadTimelineProps) {
  const [stoppingAll, setStoppingAll]     = useState(false);
  const [skippingId, setSkippingId]       = useState<string | null>(null);
  const [localPending, setLocalPending]   = useState(pending);
  const [stopped, setStopped]             = useState(false);

  async function stopAll() {
    setStoppingAll(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/stop-automation`, { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        setLocalPending([]);
        setStopped(true);
        onUpdate?.();
      }
    } finally {
      setStoppingAll(false);
    }
  }

  async function skipStep(runId: string) {
    setSkippingId(runId);
    try {
      const res = await fetch(`/api/leads/${leadId}/stop-automation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      });
      const json = await res.json();
      if (json.ok) {
        setLocalPending((p) => p.filter((r) => r.id !== runId));
        onUpdate?.();
      }
    } finally {
      setSkippingId(null);
    }
  }

  return (
    <div className="space-y-5">

      {/* ── Upcoming automation ────────────────────────────────────────────── */}
      {localPending.length > 0 && !stopped && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-rocket-muted">
              Scheduled ({localPending.length})
            </p>
            {!readOnly && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 px-2"
                onClick={stopAll}
                disabled={stoppingAll}
              >
                {stoppingAll
                  ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Stopping…</>
                  : <><Ban className="h-3 w-3 mr-1" />Stop all</>
                }
              </Button>
            )}
          </div>
          <div className="space-y-1.5">
            {localPending.map((run) => (
              <div
                key={run.id}
                className="flex items-start gap-2 rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2"
              >
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                  {actionIcon(run.actionType)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-rocket-dark">{run.stepLabel}</span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1 border-slate-300 text-slate-500">
                      {formatFutureDate(run.scheduledFor)}
                    </Badge>
                  </div>
                  {run.preview && (
                    <p className="mt-0.5 text-xs text-rocket-muted line-clamp-2 italic">
                      "{run.preview.slice(0, 120)}{run.preview.length > 120 ? "…" : ""}"
                    </p>
                  )}
                </div>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 shrink-0 text-xs text-slate-400 hover:text-red-500 px-1.5"
                    onClick={() => skipStep(run.id)}
                    disabled={skippingId === run.id}
                    title="Skip this step"
                  >
                    {skippingId === run.id
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <SkipForward className="h-3 w-3" />
                    }
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {stopped && (
        <div className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600 flex items-center gap-2">
          <Ban className="h-3.5 w-3.5 shrink-0" />
          Automation stopped — no more follow-up messages will be sent.
        </div>
      )}

      {/* ── Activity timeline ──────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-rocket-muted mb-2">
          Activity
        </p>

        {events.length === 0 && completed.length === 0 ? (
          <p className="text-xs text-rocket-muted italic py-2">
            No activity yet. Activity appears here as messages are sent.
          </p>
        ) : (
          <div className="relative space-y-0">
            {/* Combine events + completed runs, sorted by date */}
            {[
              ...events.map((e) => ({ type: "event" as const, date: e.created_at, data: e })),
              ...completed.map((r) => ({ type: "run"   as const, date: r.executedAt ?? r.scheduledFor, data: r })),
            ]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((item, i, arr) => (
                <div key={item.type === "event" ? item.data.id : item.data.id} className="flex gap-3">
                  {/* Timeline line */}
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                        item.type === "event"
                          ? eventColor(item.data.event_type)
                          : item.data.status === "sent"   ? "text-green-600 bg-green-50"
                          : item.data.status === "failed" ? "text-red-500 bg-red-50"
                          : "text-slate-400 bg-slate-100"
                      )}
                    >
                      {item.type === "event"
                        ? eventIcon(item.data.event_type)
                        : item.data.status === "sent"   ? actionIcon(item.data.actionType)
                        : item.data.status === "failed" ? <AlertTriangle className="h-3.5 w-3.5" />
                        : <XCircle className="h-3.5 w-3.5" />
                      }
                    </div>
                    {i < arr.length - 1 && (
                      <div className="w-px flex-1 bg-slate-100 my-0.5 min-h-[16px]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="pb-3 flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-rocket-dark leading-tight">
                        {item.type === "event"
                          ? item.data.message
                          : item.data.status === "sent"
                            ? `${item.data.stepLabel} sent`
                            : item.data.status === "failed"
                              ? `${item.data.stepLabel} failed: ${item.data.errorMessage ?? "unknown error"}`
                              : `${item.data.stepLabel} skipped`
                        }
                      </p>
                      <span className="shrink-0 text-xs text-rocket-muted whitespace-nowrap">
                        {formatDate(item.date)}
                      </span>
                    </div>
                    {/* Show message preview for sent automation runs */}
                    {item.type === "run" && item.data.status === "sent" && item.data.preview && (
                      <p className="mt-0.5 text-xs text-rocket-muted italic line-clamp-2">
                        "{item.data.preview.slice(0, 120)}{item.data.preview.length > 120 ? "…" : ""}"
                      </p>
                    )}
                  </div>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
}
