"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AssetToolbar } from "@/components/campaigns/AssetToolbar";
import { FileText, CheckCircle2 } from "lucide-react";
import type { UseAssetReturn } from "@/hooks/useAsset";

interface FormField {
  name: string;
  type: string;
  required: boolean;
  placeholder?: string | null;
}

interface FunnelData {
  headline: string;
  subheadline: string;
  bodyCopy: string[];
  trustElements: string[];
  ctaText: string;
  formFields: FormField[];
}

interface EditableFunnelProps {
  asset: UseAssetReturn<FunnelData>;
}

export function EditableFunnel({ asset }: EditableFunnelProps) {
  const { data, status, editMode, setEditMode, saveEdits, approve } = asset;
  const [draft, setDraft] = useState<FunnelData | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data && !draft) setDraft(JSON.parse(JSON.stringify(data)));
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
    setDraft(data ? JSON.parse(JSON.stringify(data)) : null);
    setEditMode(false);
  }

  function updateBodyPara(i: number, val: string) {
    setDraft((d) => {
      if (!d) return d;
      const bodyCopy = [...d.bodyCopy];
      bodyCopy[i] = val;
      return { ...d, bodyCopy };
    });
  }

  function updateTrust(i: number, val: string) {
    setDraft((d) => {
      if (!d) return d;
      const trustElements = [...d.trustElements];
      trustElements[i] = val;
      return { ...d, trustElements };
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-rocket-accent" />
          <CardTitle className="text-lg">Landing Page Copy</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {editMode ? (
          /* ── Edit mode ── */
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-rocket-muted">Headline</label>
              <input
                className="w-full rounded-md border border-rocket-border bg-rocket-bg px-3 py-2 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-rocket-accent/40"
                value={draft.headline}
                onChange={(e) => setDraft((d) => d ? { ...d, headline: e.target.value } : d)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-rocket-muted">Subheadline</label>
              <input
                className="w-full rounded-md border border-rocket-border bg-rocket-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rocket-accent/40"
                value={draft.subheadline}
                onChange={(e) => setDraft((d) => d ? { ...d, subheadline: e.target.value } : d)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-rocket-muted">Body Copy</label>
              <div className="space-y-2">
                {draft.bodyCopy.map((p, i) => (
                  <textarea
                    key={i}
                    className="w-full rounded-md border border-rocket-border bg-rocket-bg px-3 py-2 text-sm resize-y min-h-[72px] focus:outline-none focus:ring-2 focus:ring-rocket-accent/40"
                    value={p}
                    onChange={(e) => updateBodyPara(i, e.target.value)}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-rocket-muted">Trust Elements</label>
              <div className="space-y-2">
                {draft.trustElements.map((t, i) => (
                  <input
                    key={i}
                    className="w-full rounded-md border border-rocket-border bg-rocket-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rocket-accent/40"
                    value={t}
                    onChange={(e) => updateTrust(i, e.target.value)}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-rocket-muted">CTA Button Text</label>
              <input
                className="w-full rounded-md border border-rocket-border bg-rocket-bg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-rocket-accent/40"
                value={draft.ctaText}
                onChange={(e) => setDraft((d) => d ? { ...d, ctaText: e.target.value } : d)}
              />
            </div>
          </div>
        ) : (
          /* ── Read mode ── */
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase text-rocket-muted mb-1">Headline</p>
              <p className="text-2xl font-bold">{draft.headline}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-rocket-muted mb-1">Subheadline</p>
              <p className="text-base text-rocket-muted">{draft.subheadline}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-rocket-muted mb-1">Body Copy</p>
              <div className="space-y-2">
                {draft.bodyCopy.map((p, i) => <p key={i} className="text-sm">{p}</p>)}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-rocket-muted mb-1">Trust Elements</p>
              <ul className="space-y-1">
                {draft.trustElements.map((t, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-rocket-success shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xs font-semibold uppercase text-rocket-muted">CTA Button:</p>
              <Badge variant="success">{draft.ctaText}</Badge>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-rocket-muted mb-2">Form Fields</p>
              <div className="flex flex-wrap gap-2">
                {draft.formFields.map((f, i) => (
                  <Badge key={i} variant={f.required ? "default" : "outline"}>
                    {f.name} ({f.type}){f.required ? " *" : ""}
                  </Badge>
                ))}
              </div>
            </div>
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
