/**
 * PATCH /api/brand/[id]  — update a brand kit
 * GET   /api/brand/[id]  — fetch a single brand kit
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const PatchSchema = z.object({
  businessDescription: z.string().min(1).optional(),
  tagline:             z.string().nullish(),
  logoUrl:             z.string().nullish(),
  primaryColor:        z.string().regex(/^#[0-9a-fA-F]{6}$/).nullish(),
  secondaryColor:      z.string().regex(/^#[0-9a-fA-F]{6}$/).nullish(),
  accentColor:         z.string().regex(/^#[0-9a-fA-F]{6}$/).nullish(),
  toneWords:           z.array(z.string()).optional(),
  keyPhrases:          z.array(z.string()).optional(),
  targetAudience:      z.string().min(1).optional(),
  uniqueValueProp:     z.string().min(1).optional(),
  industry:            z.string().min(1).optional(),
  fontHeadline:        z.string().nullish(),
  fontBody:            z.string().nullish(),
  trackingPhone:       z.string().nullish(),
  metaPixelId:         z.string().nullish(),
  smsKeyword:          z.string().nullish(),
  googleAdsId:         z.string().nullish(),
  tiktokPixelId:       z.string().nullish(),
  calendarUrl:         z.string().nullish(),
  calendarProvider:    z.string().nullish(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("brand_kits")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = PatchSchema.parse(await req.json());
    const supabase = getSupabaseAdmin();

    const updates: Record<string, unknown> = {};
    if (body.businessDescription !== undefined) updates.business_description = body.businessDescription;
    if (body.tagline             !== undefined) updates.tagline              = body.tagline;
    if (body.logoUrl             !== undefined) updates.logo_url             = body.logoUrl;
    if (body.primaryColor        !== undefined) updates.primary_color        = body.primaryColor;
    if (body.secondaryColor      !== undefined) updates.secondary_color      = body.secondaryColor;
    if (body.accentColor         !== undefined) updates.accent_color         = body.accentColor;
    if (body.toneWords           !== undefined) updates.tone_words           = body.toneWords;
    if (body.keyPhrases          !== undefined) updates.key_phrases          = body.keyPhrases;
    if (body.targetAudience      !== undefined) updates.target_audience      = body.targetAudience;
    if (body.uniqueValueProp     !== undefined) updates.unique_value_prop    = body.uniqueValueProp;
    if (body.industry            !== undefined) updates.industry             = body.industry;
    if (body.fontHeadline        !== undefined) updates.font_headline        = body.fontHeadline;
    if (body.fontBody            !== undefined) updates.font_body            = body.fontBody;
    if (body.trackingPhone       !== undefined) updates.tracking_phone       = body.trackingPhone;
    if (body.metaPixelId         !== undefined) updates.meta_pixel_id        = body.metaPixelId;
    if (body.smsKeyword          !== undefined) updates.sms_keyword          = body.smsKeyword;
    if (body.googleAdsId         !== undefined) updates.google_ads_id        = body.googleAdsId;
    if (body.tiktokPixelId       !== undefined) updates.tiktok_pixel_id      = body.tiktokPixelId;
    if (body.calendarUrl         !== undefined) updates.calendar_url         = body.calendarUrl;
    if (body.calendarProvider    !== undefined) updates.calendar_provider    = body.calendarProvider;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: false, error: "Nothing to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("brand_kits")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
