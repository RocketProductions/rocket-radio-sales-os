import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const UpdateLeadSchema = z.object({
  status: z.enum(["new", "contacted", "booked", "closed", "lost"]).optional(),
  notes: z.string().optional(),
});

/** GET /api/leads/[id] — get a single lead with full event timeline */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        events: { orderBy: { createdAt: "desc" } },
        campaign: { select: { id: true, name: true, brandId: true } },
      },
    });

    if (!lead) {
      return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: lead });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** PATCH /api/leads/[id] — update lead status (one-tap: called, booked, closed) */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = UpdateLeadSchema.parse(await req.json());

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.notes !== undefined && { notes: body.notes }),
        updatedAt: new Date(),
      },
    });

    // Log the status change event
    if (body.status) {
      const messages: Record<string, string> = {
        contacted: "Marked as contacted",
        booked: "Appointment booked",
        closed: "Deal closed",
        lost: "Marked as lost",
        new: "Reset to new",
      };
      await prisma.leadEvent.create({
        data: {
          leadId: id,
          eventType: "status_change",
          message: messages[body.status] ?? `Status changed to ${body.status}`,
          metadata: { newStatus: body.status },
        },
      });
    }

    return NextResponse.json({ ok: true, data: lead });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
