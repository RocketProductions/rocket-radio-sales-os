"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AssetToolbar } from "@/components/campaigns/AssetToolbar";
import { MessageSquare } from "lucide-react";
import type { UseAssetReturn } from "@/hooks/useAsset";

interface FollowUpMessage {
  step: number;
  timing: string;
  channel: string;
  subject?: string | null;
  body: string;
  angle: string;
}

interface FollowUpData {
  messages: FollowUpMessage[];
  conversionGoal: string;
  toneNotes?: string | null;
}

interface EditableFollowUpProps {
  asset: UseAssetReturn<FollowUpData>;
}

export function EditableFollowUp({ asset }: EditableFollowUpProps) {
  const { data, status, editMode, setEditMode, saveEdits, approve } = asset;
  const [draft, setDraft] = useState<FollowUpData | null>(null);
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

  function updateMessage(index: number, field: keyof FollowUpMessage, value: string) {
    setDraft((d) => {
      if (!d) return d;
      const messages = d.messages.map((m, i) =>
        i === index ? { ...m, [field]: value } : m
      );
      return { ...d, messages };
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-rocket-accent" />
          <CardTitle className="text-lg">Follow-Up Sequence</CardTitle>
        </div>
        <CardDescription>Goal: {draft.conversionGoal}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {draft.messages.map((msg, index) => (
          <div key={msg.step} className="rounded-md border border-rocket-border p-4 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="default">Step {msg.step}</Badge>
              <Badge variant="outline">{msg.timing}</Badge>
              <Badge variant={msg.channel === "text" ? "success" : "warning"}>
                {msg.channel}
              </Badge>
              <span className="text-xs text-rocket-muted italic">{msg.angle}</span>
            </div>

            {editMode ? (
              <div className="space-y-2 pt-1">
                {msg.channel === "email" && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-rocket-muted">
                      Subject Line
                    </label>
                    <input
                      className="w-full rounded-md border border-rocket-border bg-rocket-bg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rocket-accent/40"
                      value={draft.messages[index].subject ?? ""}
                      onChange={(e) => updateMessage(index, "subject", e.target.value)}
                      placeholder="Email subject line..."
                    />
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-rocket-muted">
                    Message Body
                  </label>
                  <textarea
                    className="w-full rounded-md border border-rocket-border bg-rocket-bg px-3 py-2 text-sm resize-y min-h-[96px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-rocket-accent/40"
                    value={draft.messages[index].body}
                    onChange={(e) => updateMessage(index, "body", e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <>
                {msg.subject && (
                  <p className="text-xs font-semibold text-rocket-muted">Subject: {msg.subject}</p>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
              </>
            )}
          </div>
        ))}

        {draft.toneNotes && !editMode && (
          <p className="text-xs text-rocket-muted border-t pt-3">
            <strong>Tone notes:</strong> {draft.toneNotes}
          </p>
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
