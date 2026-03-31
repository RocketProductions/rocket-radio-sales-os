"use client";

import { useState } from "react";
import { CheckCircle2, Radio, FileText, MessageSquare, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Asset {
  id: string;
  asset_type: string;
  content: Record<string, unknown>;
  edited_content?: Record<string, unknown> | null;
  status: string;
}

interface ReviewSession {
  id: string;
  token: string;
  status: string;
  business_name: string | null;
  rep_message: string | null;
  client_notes: string | null;
}

interface ReviewClientProps {
  token: string;
  session: ReviewSession;
  assets: Asset[];
}

const ASSET_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  "brief":                { label: "Campaign Brief",      icon: <Sparkles className="h-5 w-5" />,      color: "text-violet-600" },
  "radio-script":         { label: "Radio Script",        icon: <Radio className="h-5 w-5" />,          color: "text-blue-600"   },
  "funnel-copy":          { label: "Landing Page Copy",   icon: <FileText className="h-5 w-5" />,       color: "text-orange-500" },
  "follow-up-sequence":   { label: "Follow-Up Messages",  icon: <MessageSquare className="h-5 w-5" />,  color: "text-green-600"  },
};

export function ReviewClient({ token, session, assets }: ReviewClientProps) {
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"approved" | "changes_requested" | null>(
    session.status === "approved" ? "approved" :
    session.status === "changes_requested" ? "changes_requested" : null
  );
  const [error, setError] = useState("");

  async function respond(action: "approve" | "request_changes") {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/review/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes: notes.trim() || undefined }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setResult(action === "approve" ? "approved" : "changes_requested");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (result === "approved") {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 bg-slate-50">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-3">Campaign Approved!</h1>
          <p className="text-slate-500 text-lg">
            Your campaign is approved and ready to launch. Your Federated Media team will be in touch shortly.
          </p>
        </div>
      </div>
    );
  }

  if (result === "changes_requested") {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 bg-slate-50">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
            <AlertCircle className="h-10 w-10 text-amber-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-3">Feedback Received</h1>
          <p className="text-slate-500 text-lg">
            Your notes have been sent to your Federated Media rep. We&apos;ll revise and send you an updated version.
          </p>
          {notes && (
            <div className="mt-4 rounded-lg bg-white border border-slate-200 p-4 text-left">
              <p className="text-xs font-semibold uppercase text-slate-400 mb-1">Your Notes</p>
              <p className="text-sm text-slate-700">{notes}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold">R</div>
            <span className="text-sm font-semibold text-slate-500">Federated Media / 95.3 MNC</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            Campaign Review{session.business_name ? ` — ${session.business_name}` : ""}
          </h1>
          <p className="text-slate-500 mt-1">
            Review your campaign assets below. Approve them to move forward, or leave notes for changes.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">

        {/* Rep message */}
        {session.rep_message && (
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-5">
            <p className="text-xs font-semibold uppercase text-blue-500 mb-1">Note from your rep</p>
            <p className="text-sm text-blue-800">{session.rep_message}</p>
          </div>
        )}

        {/* Asset cards */}
        {assets.map((asset) => {
          const meta = ASSET_META[asset.asset_type] ?? { label: asset.asset_type, icon: null, color: "text-slate-600" };
          const display = asset.edited_content ?? asset.content;

          return (
            <div key={asset.id} className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-sm">
              <div className={`flex items-center gap-3 px-6 py-4 border-b border-slate-100`}>
                <span className={meta.color}>{meta.icon}</span>
                <h2 className="font-semibold text-slate-800">{meta.label}</h2>
              </div>
              <div className="px-6 py-5">
                <AssetContent type={asset.asset_type} content={display} />
              </div>
            </div>
          );
        })}

        {/* Notes + action */}
        <div className="rounded-xl bg-white border border-slate-200 p-6 space-y-5 shadow-sm">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Notes or Change Requests <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed resize-y min-h-[100px] focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400"
              placeholder="e.g. Change the phone number to 555-1234, or adjust the headline to mention our spring discount…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <p className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </p>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => respond("request_changes")}
              disabled={submitting}
              className="flex-1 border-slate-300 text-slate-600 hover:bg-slate-50"
            >
              Request Changes
            </Button>
            <Button
              onClick={() => respond("approve")}
              disabled={submitting}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold text-base py-5"
            >
              {submitting ? "Submitting…" : (
                <><CheckCircle2 className="mr-2 h-5 w-5" />Approve Campaign</>
              )}
            </Button>
          </div>
          <p className="text-xs text-slate-400 text-center">
            By approving, you confirm the campaign assets are ready to launch.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Asset content renderers ───────────────────────────────────────────────

function AssetContent({ type, content }: { type: string; content: Record<string, unknown> }) {
  switch (type) {
    case "brief":
      return <BriefContent c={content} />;
    case "radio-script":
      return <ScriptContent c={content} />;
    case "funnel-copy":
      return <FunnelContent c={content} />;
    case "follow-up-sequence":
      return <FollowUpContent c={content} />;
    default:
      return <pre className="text-xs text-slate-500 overflow-auto">{JSON.stringify(content, null, 2)}</pre>;
  }
}

function BriefContent({ c }: { c: Record<string, unknown> }) {
  const offer = c.offerDefinition as Record<string, unknown> | undefined;
  const audience = c.targetAudience as Record<string, unknown> | undefined;
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase text-slate-400 mb-1">Big Idea</p>
        <p className="text-lg font-semibold text-slate-800">{String(c.bigIdea ?? "")}</p>
      </div>
      {offer && (
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400 mb-1">Offer</p>
          <p className="text-sm text-slate-700">{String(offer.offer ?? "")}</p>
        </div>
      )}
      {audience && (
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400 mb-1">Target Audience</p>
          <p className="text-sm font-medium text-slate-700">{String(audience.primary ?? "")}</p>
          <p className="text-sm text-slate-500 mt-0.5">{String(audience.whyTheyRespond ?? "")}</p>
        </div>
      )}
    </div>
  );
}

function ScriptContent({ c }: { c: Record<string, unknown> }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-slate-50 border border-slate-100 p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap text-slate-800">
        {String(c.script ?? "")}
      </div>
      <div className="flex gap-2 flex-wrap text-xs text-slate-500">
        <Badge variant="outline">{Number(c.wordCount ?? 0)} words</Badge>
        <Badge variant="outline">~{Number(c.estimatedSeconds ?? 0)} seconds</Badge>
      </div>
    </div>
  );
}

function FunnelContent({ c }: { c: Record<string, unknown> }) {
  const bodyArr = Array.isArray(c.bodyCopy) ? (c.bodyCopy as string[]) : [];
  const trustArr = Array.isArray(c.trustElements) ? (c.trustElements as string[]) : [];
  return (
    <div className="space-y-4">
      <div>
        <p className="text-2xl font-bold text-slate-800">{String(c.headline ?? "")}</p>
        <p className="text-base text-slate-500 mt-1">{String(c.subheadline ?? "")}</p>
      </div>
      <div className="space-y-2">
        {bodyArr.map((p, i) => <p key={i} className="text-sm text-slate-700">{p}</p>)}
      </div>
      <ul className="space-y-1.5">
        {trustArr.map((t, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />{t}
          </li>
        ))}
      </ul>
      <div>
        <span className="inline-block rounded-full bg-orange-500 px-4 py-1.5 text-sm font-semibold text-white">
          {String(c.ctaText ?? "Get Started")}
        </span>
      </div>
    </div>
  );
}

function FollowUpContent({ c }: { c: Record<string, unknown> }) {
  const msgs = Array.isArray(c.messages) ? (c.messages as Record<string, unknown>[]) : [];
  return (
    <div className="space-y-3">
      {msgs.map((msg, i) => (
        <div key={i} className="rounded-lg bg-slate-50 border border-slate-100 p-4">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="default" className="text-xs">Step {Number(msg.step ?? i + 1)}</Badge>
            <Badge variant="outline" className="text-xs">{String(msg.timing ?? "")}</Badge>
            <Badge variant="outline" className="text-xs capitalize">{String(msg.channel ?? "")}</Badge>
          </div>
          {msg.subject && (
            <p className="text-xs font-semibold text-slate-500 mb-1">Subject: {String(msg.subject)}</p>
          )}
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{String(msg.body ?? "")}</p>
        </div>
      ))}
    </div>
  );
}
