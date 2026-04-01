"use client";

import { useRef, useState } from "react";
import { UploadCloud, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { UploadedAsset } from "@/types/assets";

type FileCategory = "logo" | "photo" | "document";

const CATEGORY_TABS: { value: FileCategory; label: string }[] = [
  { value: "logo", label: "Logo" },
  { value: "photo", label: "Photo" },
  { value: "document", label: "Document" },
];

interface UploadDropZoneProps {
  onUploaded: (asset: UploadedAsset) => void;
  sessionId?: string;
}

export function UploadDropZone({ onUploaded, sessionId }: UploadDropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [selectedCategory, setSelectedCategory] = useState<FileCategory>("photo");
  const inputRef = useRef<HTMLInputElement>(null);

  function detectCategory(file: File): FileCategory {
    if (selectedCategory === "logo") return "logo";
    if (file.type.startsWith("image/")) return "photo";
    return "document";
  }

  async function uploadFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploading(true);
    setProgress({ done: 0, total: fileArray.length });

    for (const file of fileArray) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", detectCategory(file));
      if (sessionId) formData.append("sessionId", sessionId);

      try {
        const res = await fetch("/api/assets/upload", {
          method: "POST",
          body: formData,
        });
        const json = await res.json();
        if (json.ok && json.asset) {
          onUploaded(json.asset as UploadedAsset);
        }
      } catch (err) {
        console.error("Upload failed for", file.name, err);
      }

      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    setUploading(false);
    setProgress({ done: 0, total: 0 });
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) {
      uploadFiles(e.dataTransfer.files);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) {
      uploadFiles(e.target.files);
      // Reset the input so the same file can be re-selected
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-3">
      {/* Category selector */}
      <div className="flex gap-1 border-b border-slate-200">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setSelectedCategory(tab.value)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              selectedCategory === tab.value
                ? "border-rocket-blue text-rocket-blue"
                : "border-transparent text-rocket-muted hover:text-rocket-dark"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
          dragging
            ? "border-rocket-blue bg-rocket-blue/5"
            : "border-slate-300 hover:border-rocket-blue hover:bg-slate-50",
          uploading && "pointer-events-none opacity-70"
        )}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 text-rocket-blue animate-spin" />
            <p className="text-sm font-medium text-rocket-dark">
              Uploading {progress.done + 1} of {progress.total}…
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <UploadCloud className="h-8 w-8 text-slate-400" />
            <p className="text-sm font-medium text-rocket-dark">
              Drop files here or{" "}
              <span className="text-rocket-blue underline">click to upload</span>
            </p>
            <p className="text-xs text-rocket-muted">
              Images, PDFs, DOCX — up to 10 MB each
            </p>
            <Button variant="outline" size="sm" className="mt-2" tabIndex={-1}>
              Choose Files
            </Button>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}
