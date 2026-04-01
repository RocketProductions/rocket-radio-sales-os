"use client";

import { useState } from "react";
import { Share2, Lightbulb, Copy, Check, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SocialShareOutput } from "@/ai/modes/socialShare";

interface SocialSharePanelProps {
  lpUrl: string;
  businessName: string;
  offer: string;
  headline?: string;
  targetAudience?: string;
  brandContext?: string;
  industry?: string;
}

interface PlatformConfig {
  key: keyof Omit<SocialShareOutput, "boostTip">;
  label: string;
  color: string;
  dotColor: string;
  getSharerUrl: (post: string, lpUrl: string) => string | null;
  sharerLabel: string;
  sharerHref: string | null;
  noSharerNote: string | null;
}

const PLATFORMS: PlatformConfig[] = [
  {
    key: "facebook",
    label: "Facebook",
    color: "#1877F2",
    dotColor: "bg-[#1877F2]",
    getSharerUrl: (_post, url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    sharerLabel: "Share on Facebook",
    sharerHref: null,
    noSharerNote: null,
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    color: "#0A66C2",
    dotColor: "bg-[#0A66C2]",
    getSharerUrl: (_post, url) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    sharerLabel: "Share on LinkedIn",
    sharerHref: null,
    noSharerNote: null,
  },
  {
    key: "instagram",
    label: "Instagram",
    color: "#E1306C",
    dotColor: "bg-[#E1306C]",
    getSharerUrl: () => null,
    sharerLabel: "Open Instagram",
    sharerHref: "https://instagram.com",
    noSharerNote: "Copy text above, then paste into your Instagram caption",
  },
  {
    key: "twitter",
    label: "Twitter / X",
    color: "#000000",
    dotColor: "bg-black",
    getSharerUrl: (post, url) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(post)}&url=${encodeURIComponent(url)}`,
    sharerLabel: "Post on X",
    sharerHref: null,
    noSharerNote: null,
  },
];

export function SocialSharePanel({
  lpUrl,
  businessName,
  offer,
  headline,
  targetAudience,
  brandContext,
  industry,
}: SocialSharePanelProps) {
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<SocialShareOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/campaigns/social-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          offer,
          landingPageUrl: lpUrl,
          headline,
          targetAudience,
          brandContext,
          industry,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Generation failed");
      setPosts(data.posts as SocialShareOutput);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    }
  }

  return (
    <div className="rounded-xl border border-rocket-border bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-rocket-border">
        <Share2 className="h-5 w-5 text-rocket-blue" />
        <h3 className="text-base font-semibold text-rocket-dark">
          Share Your Campaign
        </h3>
      </div>

      <div className="p-6 space-y-6">
        {/* Generate button */}
        {!posts && (
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-sm text-rocket-muted text-center max-w-sm">
              Generate platform-native social posts for Facebook, LinkedIn, Instagram, and Twitter/X.
            </p>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors",
                loading
                  ? "bg-rocket-blue/60 cursor-not-allowed"
                  : "bg-rocket-blue hover:bg-rocket-blue/90"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating posts...
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" />
                  Generate Social Posts
                </>
              )}
            </button>
            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}
          </div>
        )}

        {/* Platform sections */}
        {posts && (
          <>
            <div className="space-y-5">
              {PLATFORMS.map((platform) => {
                const postText = posts[platform.key];
                const sharerUrl =
                  platform.sharerHref ??
                  platform.getSharerUrl(postText, lpUrl);
                const isCopied = copied === platform.key;

                return (
                  <div
                    key={platform.key}
                    className="rounded-lg border border-rocket-border p-4 space-y-3"
                  >
                    {/* Platform header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-block h-3 w-3 rounded-full",
                            platform.dotColor
                          )}
                        />
                        <span className="text-sm font-bold text-rocket-dark">
                          {platform.label}
                        </span>
                      </div>
                      <span className="rounded-full bg-rocket-bg px-2 py-0.5 text-xs text-rocket-muted font-medium">
                        {postText.length} chars
                      </span>
                    </div>

                    {/* Post textarea */}
                    <textarea
                      readOnly
                      value={postText}
                      rows={4}
                      className="w-full resize-none rounded-md border border-rocket-border bg-rocket-bg px-3 py-2 text-sm text-rocket-dark focus:outline-none"
                    />

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleCopy(platform.key, postText)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                          isCopied
                            ? "border-green-300 bg-green-50 text-green-700"
                            : "border-rocket-border bg-white text-rocket-dark hover:bg-rocket-bg"
                        )}
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copy Text
                          </>
                        )}
                      </button>

                      {platform.noSharerNote && (
                        <p className="text-xs text-rocket-muted italic">
                          {platform.noSharerNote}
                        </p>
                      )}

                      {sharerUrl && (
                        <a
                          href={sharerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-md border border-rocket-border bg-white px-3 py-1.5 text-xs font-medium text-rocket-dark transition-colors hover:bg-rocket-bg"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {platform.sharerLabel}
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Boost Tip */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 mb-1">
                    Boost Tip
                  </p>
                  <p className="text-sm text-amber-700">{posts.boostTip}</p>
                </div>
              </div>
            </div>

            {/* Regenerate */}
            <div className="flex justify-end">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-rocket-muted transition-colors border border-rocket-border",
                  loading
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-rocket-bg hover:text-rocket-dark"
                )}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
                Regenerate
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
