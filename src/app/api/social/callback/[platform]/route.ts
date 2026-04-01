import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { encryptToken } from "@/lib/crypto";

export const runtime = "nodejs";

const VALID_PLATFORMS = ["meta", "linkedin", "tiktok", "pinterest"] as const;
type Platform = (typeof VALID_PLATFORMS)[number];

function isPlatform(value: string): value is Platform {
  return (VALID_PLATFORMS as readonly string[]).includes(value);
}

// ─── Meta ────────────────────────────────────────────────────────────────────

interface MetaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

interface MetaPage {
  id: string;
  name: string;
  access_token: string;
}

interface MetaAccountsResponse {
  data: MetaPage[];
}

async function exchangeMeta(
  code: string,
  callbackUrl: string
): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  accountName: string | null;
  pageName: string | null;
  pageId: string | null;
  pageToken: string | null;
  scopes: string[];
}> {
  const appId = process.env.META_APP_ID ?? "";
  const appSecret = process.env.META_APP_SECRET ?? "";

  // Step 1: exchange code for short-lived token
  const tokenParams = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: callbackUrl,
    code,
  });
  const shortRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?${tokenParams.toString()}`
  );
  if (!shortRes.ok) {
    const errBody = await shortRes.text();
    throw new Error(`Meta token exchange failed: ${errBody}`);
  }
  const shortData: MetaTokenResponse = await shortRes.json();
  const shortLivedToken = shortData.access_token;

  // Step 2: exchange short-lived for long-lived
  const llParams = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });
  const llRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?${llParams.toString()}`
  );
  if (!llRes.ok) {
    const errBody = await llRes.text();
    throw new Error(`Meta long-lived token exchange failed: ${errBody}`);
  }
  const llData: MetaTokenResponse = await llRes.json();
  const longLivedToken = llData.access_token;
  const expiresAt = llData.expires_in
    ? new Date(Date.now() + llData.expires_in * 1000).toISOString()
    : null;

  // Step 3: fetch pages
  const pagesRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?access_token=${longLivedToken}`
  );
  const pagesData: MetaAccountsResponse = pagesRes.ok
    ? await pagesRes.json()
    : { data: [] };
  const firstPage = pagesData.data?.[0] ?? null;

  // Step 4: get account name
  const meRes = await fetch(
    `https://graph.facebook.com/v21.0/me?fields=name&access_token=${longLivedToken}`
  );
  const meData: { name?: string } = meRes.ok ? await meRes.json() : {};

  return {
    accessToken: longLivedToken,
    refreshToken: null,
    expiresAt,
    accountName: meData.name ?? null,
    pageName: firstPage?.name ?? null,
    pageId: firstPage?.id ?? null,
    pageToken: firstPage?.access_token ?? null,
    scopes: ["pages_manage_posts", "pages_read_engagement", "pages_show_list", "leads_retrieval"],
  };
}

// ─── LinkedIn ─────────────────────────────────────────────────────────────────

async function exchangeLinkedIn(
  code: string,
  callbackUrl: string
): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  accountName: string | null;
  pageName: string | null;
  pageId: string | null;
  pageToken: string | null;
  scopes: string[];
}> {
  const clientId = process.env.LINKEDIN_CLIENT_ID ?? "";
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET ?? "";

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: callbackUrl,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    throw new Error(`LinkedIn token exchange failed: ${errBody}`);
  }

  const tokenData: { access_token: string; expires_in?: number; refresh_token?: string } =
    await tokenRes.json();

  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    : null;

  // Fetch profile
  const profileRes = await fetch("https://api.linkedin.com/v2/me", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      "cache-control": "no-cache",
      "X-Restli-Protocol-Version": "2.0.0",
    },
  });

  const profileData: {
    localizedFirstName?: string;
    localizedLastName?: string;
  } = profileRes.ok ? await profileRes.json() : {};

  const accountName =
    profileData.localizedFirstName && profileData.localizedLastName
      ? `${profileData.localizedFirstName} ${profileData.localizedLastName}`
      : null;

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token ?? null,
    expiresAt,
    accountName,
    pageName: null,
    pageId: null,
    pageToken: null,
    scopes: ["r_liteprofile", "r_emailaddress", "w_member_social"],
  };
}

// ─── TikTok ──────────────────────────────────────────────────────────────────

async function exchangeTikTok(
  code: string,
  codeVerifier: string,
  callbackUrl: string
): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  accountName: string | null;
  pageName: string | null;
  pageId: string | null;
  pageToken: string | null;
  scopes: string[];
}> {
  const clientKey = process.env.TIKTOK_CLIENT_KEY ?? "";
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET ?? "";

  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: callbackUrl,
    code_verifier: codeVerifier,
  });

  const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    throw new Error(`TikTok token exchange failed: ${errBody}`);
  }

  const tokenData: {
    data?: {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      open_id?: string;
    };
  } = await tokenRes.json();

  const data = tokenData.data;
  if (!data?.access_token) {
    throw new Error("TikTok token exchange returned no access_token");
  }

  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : null;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt,
    accountName: data.open_id ?? null,
    pageName: null,
    pageId: null,
    pageToken: null,
    scopes: ["user.info.basic", "video.publish"],
  };
}

// ─── Pinterest ────────────────────────────────────────────────────────────────

async function exchangePinterest(
  code: string,
  callbackUrl: string
): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  accountName: string | null;
  pageName: string | null;
  pageId: string | null;
  pageToken: string | null;
  scopes: string[];
}> {
  const appId = process.env.PINTEREST_APP_ID ?? "";
  const appSecret = process.env.PINTEREST_APP_SECRET ?? "";

  const credentials = Buffer.from(`${appId}:${appSecret}`).toString("base64");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: callbackUrl,
  });

  const tokenRes = await fetch("https://api.pinterest.com/v5/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: body.toString(),
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    throw new Error(`Pinterest token exchange failed: ${errBody}`);
  }

  const tokenData: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  } = await tokenRes.json();

  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    : null;

  // Fetch user info
  const userRes = await fetch("https://api.pinterest.com/v5/user_account", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const userData: { username?: string } = userRes.ok ? await userRes.json() : {};

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token ?? null,
    expiresAt,
    accountName: userData.username ?? null,
    pageName: null,
    pageId: null,
    pageToken: null,
    scopes: ["boards:read", "pins:read", "pins:write"],
  };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET(
  req: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  try {
    const { platform: rawPlatform } = await params;

    if (!isPlatform(rawPlatform)) {
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings/connections?error=invalid_platform`,
          baseUrl
        )
      );
    }

    const platform = rawPlatform as Platform;
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      const oauthError = url.searchParams.get("error") ?? "missing_code_or_state";
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings/connections?error=${encodeURIComponent(oauthError)}`,
          baseUrl
        )
      );
    }

    const supabase = getSupabaseAdmin();

    // Look up and validate state
    const { data: stateRow, error: stateErr } = await supabase
      .from("oauth_states")
      .select("*")
      .eq("state", state)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (stateErr || !stateRow) {
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings/connections?error=invalid_or_expired_state`,
          baseUrl
        )
      );
    }

    // Delete state (one-time use)
    await supabase.from("oauth_states").delete().eq("state", state);

    const tenantId: string = stateRow.tenant_id;
    const callbackUrl = `${baseUrl}/api/social/callback/${platform}`;

    // Exchange code for tokens
    let exchangeResult: {
      accessToken: string;
      refreshToken: string | null;
      expiresAt: string | null;
      accountName: string | null;
      pageName: string | null;
      pageId: string | null;
      pageToken: string | null;
      scopes: string[];
    };

    switch (platform) {
      case "meta":
        exchangeResult = await exchangeMeta(code, callbackUrl);
        break;
      case "linkedin":
        exchangeResult = await exchangeLinkedIn(code, callbackUrl);
        break;
      case "tiktok":
        if (!stateRow.code_verifier) {
          throw new Error("Missing code_verifier for TikTok PKCE flow");
        }
        exchangeResult = await exchangeTikTok(code, stateRow.code_verifier, callbackUrl);
        break;
      case "pinterest":
        exchangeResult = await exchangePinterest(code, callbackUrl);
        break;
    }

    // Encrypt tokens
    const encryptedAccess = encryptToken(exchangeResult.accessToken);
    const encryptedRefresh = exchangeResult.refreshToken
      ? encryptToken(exchangeResult.refreshToken)
      : null;
    const encryptedPage = exchangeResult.pageToken
      ? encryptToken(exchangeResult.pageToken)
      : null;

    // Upsert social_accounts
    const now = new Date().toISOString();
    const { error: upsertErr } = await supabase
      .from("social_accounts")
      .upsert(
        {
          tenant_id: tenantId,
          platform,
          access_token: encryptedAccess,
          refresh_token: encryptedRefresh,
          expires_at: exchangeResult.expiresAt,
          account_name: exchangeResult.accountName,
          page_name: exchangeResult.pageName,
          page_id: exchangeResult.pageId,
          page_token: encryptedPage,
          scopes: exchangeResult.scopes,
          connected_at: now,
          updated_at: now,
        },
        { onConflict: "tenant_id,platform" }
      );

    if (upsertErr) {
      throw new Error(`Failed to save connection: ${upsertErr.message}`);
    }

    return NextResponse.redirect(
      new URL(
        `/dashboard/settings/connections?connected=${platform}`,
        baseUrl
      )
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[social/callback] Error:`, message);
    return NextResponse.redirect(
      new URL(
        `/dashboard/settings/connections?error=${encodeURIComponent(message.slice(0, 120))}`,
        baseUrl
      )
    );
  }
}
