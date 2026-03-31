"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Pencil, X, Save, Loader2, AlertCircle } from "lucide-react";
import type { AssetStatus } from "@/hooks/useAsset";

interface AssetToolbarProps {
  status: AssetStatus;
  editMode: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdits: () => void;
  onApprove: () => void;
  saving?: boolean;
}

const STATUS_LABELS: Record<AssetStatus, { label: string; className: string }> = {
  unsaved:  { label: "Not saved",   className: "text-rocket-muted" },
  saving:   { label: "Saving…",     className: "text-rocket-muted" },
  saved:    { label: "Auto-saved",  className: "text-rocket-success" },
  edited:   { label: "Edited",      className: "text-rocket-accent" },
  approved: { label: "Approved ✓",  className: "text-rocket-success font-semibold" },
  error:    { label: "Save failed", className: "text-rocket-danger" },
};

export function AssetToolbar({
  status,
  editMode,
  onEdit,
  onCancelEdit,
  onSaveEdits,
  onApprove,
  saving,
}: AssetToolbarProps) {
  const { label, className } = STATUS_LABELS[status];

  return (
    <div className="flex items-center justify-between gap-3 pt-2 border-t border-rocket-border mt-4">
      {/* Save status */}
      <div className="flex items-center gap-1.5 text-xs">
        {status === "saving" && <Loader2 className="h-3 w-3 animate-spin text-rocket-muted" />}
        {status === "error"  && <AlertCircle className="h-3 w-3 text-rocket-danger" />}
        {status === "approved" && <CheckCircle2 className="h-3.5 w-3.5 text-rocket-success" />}
        <span className={className}>{label}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {status === "approved" ? (
          <Badge variant="success" className="text-xs px-3 py-1">
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            Approved
          </Badge>
        ) : editMode ? (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={onCancelEdit}
              className="h-7 text-xs"
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={onSaveEdits}
              disabled={saving}
              className="h-7 text-xs"
            >
              {saving ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-3.5 w-3.5" />
              )}
              Save Changes
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={onEdit}
              className="h-7 text-xs"
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              size="sm"
              onClick={onApprove}
              disabled={status === "unsaved" || status === "saving"}
              className="h-7 text-xs bg-rocket-success hover:bg-rocket-success/90 text-white"
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              Approve
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
