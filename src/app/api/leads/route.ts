import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { triggerAutoResponse } from "@/lib/automation/engine";

const CreateLeadSchema = z.object({
  campaignId: z.string().uuid(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  source: z.enum(["manual", "meta_lead_ad", "form", "second_street"]).default("manual"),
  notes: z.string().optional(),
});

/** GET /api/leads — list leads, optionally filtered by campaignId */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaignId");
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

    const where: Record<string, unknown> = {};
    if (campaignId) where.campaignId = campaignId;
    if (status) where.status = status;

    const leads = await prisma.lead.findMany({
      where,
      include: {
        events: { orderBy: { createdAt: "desc" }, take: 3 },
        campaign: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ ok: true, data: leads });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** POST /api/leads — create a new lead (manual entry or form submission) */
export async function POST(req: Request) {
  try {
    const body = CreateLeadSchema.parse(await req.json());

    const lead = await prisma.lead.create({
      data: {
        campaignId: body.campaignId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        source: body.source,
        notes: body.notes,
        status: "new",
      },
    });

    // Log the lead creation event
    await prisma.leadEvent.create({
      data: {
        leadId: lead.id,
        eventType: "lead_created",
        message: `New lead from ${body.source}: ${[body.firstName, body.lastName].filter(Boolean).join(" ") || "Unknown"}`,
      },
    });

    // Trigger auto-response (non-blocking)
    triggerAutoResponse(lead.id).catch(console.error);

    return NextResponse.json({ ok: true, data: lead }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
