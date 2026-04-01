import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const VALID_PLATFORMS = ["meta", "linkedin", "tiktok", "pinterest"] as const;
type Platform = (typeof VALID_PLATFORMS)[number];

function isPlatform(value: string): value is Platform {
  return (VALID_PLATFORMS as readonly string[]).includes(value);
}

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function buildAuthUrl(
  platform: Platform,
  state: string,
  callbackUrl: string,
  codeChallenge?: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const cb = `${baseUrl}/api/social/callback/${platform}`;
  void callbackUrl; // callbackUrl param kept for signature consistency; cb built inline

  switch (platform) {
    case "meta": {
      const metaAppId = process.env.META_APP_ID ?? "";
      const params = new URLSearchParams({
        client_id: metaAppId,
        redirect_uri: cb,
        scope:
          "pages_manage_posts,pages_read_engagement,pages_show_list,leads_retrieval",
        state,
        response_type: "code",
      });
      return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
    }
    case "linkedin": {
      const linkedinClientId = process.env.LINKEDIN_CLIENT_ID ?? "";
      const params = new URLSearchParams({
        response_type: "code",
        client_id: linkedinClientId,
        redirect_uri: cb,
        scope: "r_liteprofile r_emailaddress w_member_social",
        state,
      });
      return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
    }
    case "tiktok": {
      const tiktokClientKey = process.env.TIKTOK_CLIENT_KEY ?? "";
      const params = new URLSearchParams({
        client_key: tiktokClientKey,
        scope: "user.info.basic,video.publish",
        response_type: "code",
        redirect_uri: cb,
        state,
        code_challenge: codeChallenge ?? "",
        code_challenge_method: "S256",
      });
      return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
    }
    case "pinterest": {
      const pinterestAppId = process.env.PINTEREST_APP_ID ?? "";
      const params = new URLSearchParams({
        client_id: pinterestAppId,
        redirect_uri: cb,
        response_type: "code",
        scope: "boards:read,pins:read,pins:write",
        state,
      });
      return `https://www.pinterest.com/oauth/?${params.toString()}`;
    }
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { platform: rawPlatform } = await params;

    if (!isPlatform(rawPlatform)) {
      return NextResponse.json(
        { ok: false, error: `Invalid platform: ${rawPlatform}. Must be one of: ${VALID_PLATFORMS.join(", ")}` },
        { status: 400 }
      );
    }

    const platform = rawPlatform as Platform;

    // Read tenant/user from headers (set by middleware)
    const reqHeaders = new Headers(_req.headers);
    const tenantId = reqHeaders.get("x-tenant-id") ?? "default";
    const userId = reqHeaders.get("x-user-id") ?? "anonymous";

    // Generate state
    const state = randomBytes(32).toString("hex");

    // PKCE for TikTok
    let codeVerifier: string | undefined;
    let codeChallenge: string | undefined;
    if (platform === "tiktok") {
      const verifierBytes = randomBytes(32);
      codeVerifier = base64url(verifierBytes).slice(0, 43);
      const challengeHash = createHash("sha256")
        .update(codeVerifier)
        .digest();
      codeChallenge = base64url(challengeHash);
    }

    // Save state to DB
    const supabase = getSupabaseAdmin();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const { error: insertError } = await supabase
      .from("oauth_states")
      .insert({
        state,
        tenant_id: tenantId,
        user_id: userId,
        platform,
        redirect_to: `/dashboard/settings/connections`,
        code_verifier: codeVerifier ?? null,
        expires_at: expiresAt,
      });

    if (insertError) {
      return NextResponse.json(
        { ok: false, error: `Failed to save OAuth state: ${insertError.message}` },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const callbackUrl = `${baseUrl}/api/social/callback/${platform}`;
    const authorizationUrl = buildAuthUrl(platform, state, callbackUrl, codeChallenge);

    return NextResponse.redirect(authorizationUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
