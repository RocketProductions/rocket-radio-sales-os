"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { PlatformCard } from "./PlatformCard";
import type { SocialAccountSafe } from "@/types/social";

const PLATFORMS = ["meta", "linkedin", "tiktok", "pinterest"] as const;
type SupportedPlatform = (typeof PLATFORMS)[number];

interface ConnectionsManagerProps {
  initialConnections: SocialAccountSafe[];
  initialSuccess?: string;
}

export function ConnectionsManager({
  initialConnections,
  initialSuccess,
}: ConnectionsManagerProps) {
  const [connections, setConnections] =
    useState<SocialAccountSafe[]>(initialConnections);
  const [successPlatform, setSuccessPlatform] = useState<string | null>(
    initialSuccess ?? null
  );

  // Auto-dismiss success toast after 4 seconds
  useEffect(() => {
    if (!successPlatform) return;
    const timer = setTimeout(() => setSuccessPlatform(null), 4000);
    return () => clearTimeout(timer);
  }, [successPlatform]);

  function handleDisconnect(platform: SupportedPlatform) {
    setConnections((prev) => prev.filter((c) => c.platform !== platform));
  }

  function getConnection(platform: SupportedPlatform): SocialAccountSafe | null {
    return connections.find((c) => c.platform === platform) ?? null;
  }

  const platformLabel = successPlatform
    ? successPlatform.charAt(0).toUpperCase() + successPlatform.slice(1)
    : null;

  return (
    <div className="space-y-6">
      {/* Success toast */}
      {successPlatform && platformLabel && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            <span className="text-sm font-medium text-green-800">
              {platformLabel} connected successfully!
            </span>
          </div>
          <button
            onClick={() => setSuccessPlatform(null)}
            className="text-green-600 hover:text-green-800 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Platform grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PLATFORMS.map((platform) => (
          <PlatformCard
            key={platform}
            platform={platform}
            connection={getConnection(platform)}
            onDisconnect={() => handleDisconnect(platform)}
          />
        ))}
      </div>
    </div>
  );
}
