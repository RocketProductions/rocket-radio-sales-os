"use client";

import { useState, useCallback } from "react";

export type AssetStatus = "unsaved" | "saving" | "saved" | "edited" | "approved" | "error";

export interface AssetSeed<T> {
  data: T;
  dbId: string;
  status: AssetStatus;
}

export interface UseAssetReturn<T> {
  data: T | null;
  dbId: string | null;
  status: AssetStatus;
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  /** Call after AI generation — saves to DB and returns the db ID */
  saveNew: (content: T, meta?: { businessName?: string; brandKitId?: string }) => Promise<string | null>;
  /** Call after user edits — patches editedContent in DB */
  saveEdits: (editedContent: Record<string, unknown>) => Promise<void>;
  /** Mark asset as approved */
  approve: () => Promise<void>;
}

export function useAsset<T>(
  assetType: "brief" | "radio-script" | "funnel-copy" | "follow-up-sequence",
  sessionId: string,
  seed?: AssetSeed<T>
): UseAssetReturn<T> {
  const [data, setData] = useState<T | null>(seed?.data ?? null);
  const [dbId, setDbId] = useState<string | null>(seed?.dbId ?? null);
  const [status, setStatus] = useState<AssetStatus>(seed?.status ?? "unsaved");
  const [editMode, setEditMode] = useState(false);

  const saveNew = useCallback(
    async (content: T, meta?: { businessName?: string; brandKitId?: string }) => {
      setData(content);
      setStatus("saving");
      try {
        const res = await fetch("/api/campaigns/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            assetType,
            content,
            businessName: meta?.businessName,
            brandKitId: meta?.brandKitId,
          }),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error);
        setDbId(json.id);
        setStatus("saved");
        return json.id as string;
      } catch {
        setStatus("error");
        return null;
      }
    },
    [assetType, sessionId]
  );

  const saveEdits = useCallback(
    async (editedContent: Record<string, unknown>) => {
      if (!dbId) return;
      setStatus("saving");
      try {
        const res = await fetch(`/api/campaigns/assets/${dbId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ editedContent, status: "edited" }),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error);
        setStatus("edited");
      } catch {
        setStatus("error");
      }
    },
    [dbId]
  );

  const approve = useCallback(async () => {
    if (!dbId) return;
    try {
      const res = await fetch(`/api/campaigns/assets/${dbId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      const json = await res.json();
      if (json.ok) setStatus("approved");
    } catch {
      // silently ignore — optimistic update is fine here
    }
  }, [dbId]);

  return { data, dbId, status, editMode, setEditMode, saveNew, saveEdits, approve };
}
