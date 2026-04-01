"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UploadedAsset } from "@/types/assets";

interface AddNoteModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (asset: UploadedAsset) => void;
  sessionId?: string;
  ownerType?: "client" | "agency";
}

export function AddNoteModal({ open, onClose, onSaved, sessionId, ownerType }: AddNoteModalProps) {
  const [title, setTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSave() {
    if (!title.trim() || !noteContent.trim()) {
      setError("Both title and note content are required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/assets/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          noteContent: noteContent.trim(),
          sessionId,
          ownerType: ownerType ?? "client",
        }),
      });

      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error ?? "Failed to save note");
      }

      onSaved(json.asset as UploadedAsset);
      setTitle("");
      setNoteContent("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl p-6 mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-rocket-dark">Add Note</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-rocket-muted hover:text-rocket-dark hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-rocket-dark mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Brand voice guidelines"
              className={cn(
                "w-full rounded-lg border border-rocket-border px-3 py-2 text-sm text-rocket-dark",
                "placeholder:text-rocket-muted focus:outline-none focus:ring-2 focus:ring-rocket-blue"
              )}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-rocket-dark mb-1">
              Note Content
            </label>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={6}
              placeholder="Write your note here…"
              className={cn(
                "w-full rounded-lg border border-rocket-border px-3 py-2 text-sm text-rocket-dark resize-none",
                "placeholder:text-rocket-muted focus:outline-none focus:ring-2 focus:ring-rocket-blue"
              )}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Note"}
          </Button>
        </div>
      </div>
    </div>
  );
}
