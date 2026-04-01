import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendLeadNotification } from "@/lib/smsProviders";

const Schema = z.object({
  landingPageId: z.string().uuid(),
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  extraFields: z.record(z.string()).optional(),
});

export async function POST(req: Request) {
  try {
    const body = Schema.parse(await req.json());
    const supabase = getSupabaseAdmin();

    // Save lead
    const { data: lead, error } = await supabase
      .from("lp_leads")
      .insert({
        landing_page_id: body.landingPageId,
        name:            body.name        ?? null,
        phone:           body.phone       ?? null,
        email:           body.email       ?? null,
        extra_fields:    body.extraFields ?? {},
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    // Fetch landing page metadata (business_name, tenant_id, slug) for notification
    const { data: page } = await supabase
      .from("landing_pages")
      .select("tenant_id, business_name, slug, lead_count")
      .eq("id", body.landingPageId)
      .single();

    if (page) {
      // Increment lead count
      await supabase
        .from("landing_pages")
        .update({ lead_count: ((page as { lead_count: number }).lead_count ?? 0) + 1 })
        .eq("id", body.landingPageId);

      // Fire SMS notification — fire-and-forget, never blocks the response
      const tenantId     = (page as { tenant_id: string }).tenant_id;
      const businessName = (page as { business_name: string | null }).business_name ?? "the business";
      const slug         = (page as { slug: string }).slug;
      const pageUrl      = `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://rocket-radio-sales-os.vercel.app"}/lp/${slug}`;

      sendLeadNotification(tenantId, {
        name:         body.name,
        phone:        body.phone,
        email:        body.email,
        businessName,
        pageUrl,
        submittedAt:  new Date().toISOString(),
      }).catch((err) => console.error("[leads] Notification error:", err));
    }

    return NextResponse.json({ ok: true, id: (lead as { id: string }).id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
