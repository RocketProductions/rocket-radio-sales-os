"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AssetToolbar } from "@/components/campaigns/AssetToolbar";
import { Radio } from "lucide-react";
import type { UseAssetReturn } from "@/hooks/useAsset";

interface ScriptData {
  script:           string;
  wordCount:        number;
  estimatedSeconds: number;
  hook:             string;
  cta:              string;
  framework?:       string | null;
  frameworkReason?: string | null;
  directionNotes?:  string | null;
}

interface EditableScriptProps {
  asset: UseAssetReturn<ScriptData>;
}

export function EditableScript({ asset }: EditableScriptProps) {
  const { data, status, editMode, setEditMode, saveEdits, approve } = asset;
  const [draft, setDraft] = useState<ScriptData | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data && !draft) setDraft({ ...data });
  }, [data, draft]);

  if (!data || !draft) return null;

  async function handleSaveEdits() {
    if (!draft) return;
    setSaving(true);
    await saveEdits(draft as unknown as Record<string, unknown>);
    setSaving(false);
    setEditMode(false);
  }

  function handleCancel() {
    setDraft(data ? { ...data } : null);
    setEditMode(false);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Radio className="h-5 w-5 text-rocket-accent shrink-0" />
            <CardTitle className="text-lg">30-Second Radio Script</CardTitle>
          </div>
          {data.framework && (
            <Badge
              variant="outline"
              className="shrink-0 text-xs border-rocket-accent/40 text-rocket-accent bg-rocket-accent/5"
              title={data.frameworkReason ?? undefined}
            >
              {data.framework}
            </Badge>
          )}
        </div>
        <CardDescription className="flex items-center gap-3">
          <span>{data.wordCount} words · ~{data.estimatedSeconds} seconds</span>
          {data.frameworkReason && (
            <span className="text-xs text-rocket-muted italic">
              — {data.frameworkReason}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {editMode ? (
          /* ── Edit mode ── */
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-rocket-muted">Script</label>
              <textarea
                className="w-full rounded-md border border-rocket-border bg-rocket-bg px-3 py-2 font-mono text-sm leading-relaxed resize-y min-h-[160px] focus:outline-none focus:ring-2 focus:ring-rocket-accent/40"
                value={draft.script}
                onChange={(e) => setDraft((d) => d ? { ...d, script: e.target.value } : d)}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-rocket-muted">Hook</label>
                <input
                  className="w-full rounded-md border border-rocket-border bg-rocket-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rocket-accent/40"
                  value={draft.hook}
                  onChange={(e) => setDraft((d) => d ? { ...d, hook: e.target.value } : d)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-rocket-muted">CTA</label>
                <input
                  className="w-full rounded-md border border-rocket-border bg-rocket-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rocket-accent/40"
                  value={draft.cta}
                  onChange={(e) => setDraft((d) => d ? { ...d, cta: e.target.value } : d)}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-rocket-muted">
                Direction Notes (optional)
              </label>
              <input
                className="w-full rounded-md border border-rocket-border bg-rocket-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rocket-accent/40"
                value={draft.directionNotes ?? ""}
                onChange={(e) => setDraft((d) => d ? { ...d, directionNotes: e.target.value || null } : d)}
                placeholder="e.g. Warm, conversational tone. Pause after hook."
              />
            </div>
          </div>
        ) : (
          /* ── Read mode ── */
          <div className="space-y-4">
            <div className="rounded-md bg-rocket-bg p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap">
              {draft.script}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-rocket-muted mb-1">Hook</p>
                <p className="text-sm">{draft.hook}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-rocket-muted mb-1">CTA</p>
                <p className="text-sm">{draft.cta}</p>
              </div>
            </div>
            {draft.directionNotes && (
              <p className="text-xs text-rocket-muted">
                <strong>Direction:</strong> {draft.directionNotes}
              </p>
            )}
          </div>
        )}

        <AssetToolbar
          status={status}
          editMode={editMode}
          onEdit={() => setEditMode(true)}
          onCancelEdit={handleCancel}
          onSaveEdits={handleSaveEdits}
          onApprove={approve}
          saving={saving}
        />
      </CardContent>
    </Card>
  );
}
