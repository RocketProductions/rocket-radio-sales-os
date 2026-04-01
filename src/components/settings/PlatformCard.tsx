"use client";

import { useState } from "react";
import { CheckCircle2, AlertTriangle, RefreshCw, Unplug } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SocialAccountSafe } from "@/types/social";

type SupportedPlatform = "meta" | "linkedin" | "tiktok" | "pinterest";

interface PlatformMeta {
  label: string;
  color: string;
  description: string;
}

const PLATFORM_CONFIG: Record<SupportedPlatform, PlatformMeta> = {
  meta: {
    label: "Meta (Facebook & Instagram)",
    color: "#1877F2",
    description:
      "Connect to publish posts, manage leads, and run ads from Facebook Pages and Instagram.",
  },
  linkedin: {
    label: "LinkedIn",
    color: "#0A66C2",
    description:
      "Share campaign content and reach professional audiences.",
  },
  tiktok: {
    label: "TikTok",
    color: "#000000",
    description:
      "Publish short-form video content to your TikTok Business account.",
  },
  pinterest: {
    label: "Pinterest",
    color: "#E60023",
    description:
      "Create Pins and reach users searching for your products and services.",
  },
};

interface PlatformCardProps {
  platform: SupportedPlatform;
  connection: SocialAccountSafe | null;
  onDisconnect: () => void;
}

export function PlatformCard({
  platform,
  connection,
  onDisconnect,
}: PlatformCardProps) {
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

  const config = PLATFORM_CONFIG[platform];
  const isConnected = connection !== null && !connection.isExpired;
  const isExpired = connection !== null && connection.isExpired;

  async function handleDisconnect() {
    setDisconnecting(true);
    setDisconnectError(null);
    try {
      const res = await fetch(`/api/social/disconnect/${platform}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Disconnect failed");
      onDisconnect();
    } catch (err) {
      setDisconnectError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="rounded-xl border border-rocket-border bg-white p-5 shadow-sm space-y-4">
      {/* Platform header */}
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 inline-block h-3.5 w-3.5 rounded-full shrink-0"
          style={{ backgroundColor: config.color }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-rocket-dark leading-snug">
            {config.label}
          </p>
          <p className="text-xs text-rocket-muted mt-0.5 leading-relaxed">
            {config.description}
          </p>
        </div>
      </div>

      {/* Status */}
      {isConnected && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            <span className="text-xs font-semibold text-green-800">Connected</span>
          </div>
          {connection.account_name && (
            <p className="text-xs text-green-700 pl-5">{connection.account_name}</p>
          )}
          {connection.page_name && (
            <p className="text-xs text-green-700 pl-5">
              Page: {connection.page_name}
            </p>
          )}
          {connection.connected_at && (
            <p className="text-xs text-green-600 pl-5">
              Connected{" "}
              {new Date(connection.connected_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
        </div>
      )}

      {isExpired && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="text-xs font-semibold text-amber-800">Token Expired</span>
          </div>
          {connection.account_name && (
            <p className="text-xs text-amber-700 pl-5">{connection.account_name}</p>
          )}
        </div>
      )}

      {disconnectError && (
        <p className="text-xs text-red-600">{disconnectError}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {!isConnected && !isExpired && (
          <a
            href={`/api/social/connect/${platform}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rocket-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rocket-blue/90"
          >
            Connect
          </a>
        )}

        {isExpired && (
          <a
            href={`/api/social/connect/${platform}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
          >
            <RefreshCw className="h-4 w-4" />
            Reconnect
          </a>
        )}

        {(isConnected || isExpired) && (
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border border-rocket-border px-4 py-2 text-sm font-medium text-rocket-muted transition-colors",
              disconnecting
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-rocket-bg hover:text-rocket-dark"
            )}
          >
            <Unplug className="h-4 w-4" />
            {disconnecting ? "Disconnecting..." : "Disconnect"}
          </button>
        )}
      </div>
    </div>
  );
}
