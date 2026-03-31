/**
 * Proposals API
 *
 * GET  /api/proposals          — list proposals (with optional brandId filter)
 * POST /api/proposals          — create proposal from campaign AI output
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const CreateProposalSchema = z.object({
  brandId: z.string().uuid(),
  campaignId: z.string().uuid().optional(),
  title: z.string().min(1),
  bigIdea: z.string().optional(),
  offerText: z.string().optional(),
  radioScript: z.string().optional(),
  funnelHeadline: z.string().optional(),
  funnelBody: z.string().optional(),
  followUpSummary: z.string().optional(),
  tier: z.enum(["starter", "growth", "scale"]).optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const brandId = searchParams.get("brandId");

  try {
    const proposals = await prisma.post.findMany({
      where: {
        contentType: "proposal",
        ...(brandId ? { brandId } : {}),
      },
      include: {
        brand: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ proposals });
  } catch {
    return NextResponse.json({ proposals: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as unknown;
    const parsed = CreateProposalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // Store proposals as a Post with contentType="proposal"
    // This reuses the existing Post table rather than adding a new table
    const proposal = await prisma.post.create({
      data: {
        brandId: data.brandId,
        contentType: "proposal",
        status: "draft",
        brief: {
          campaignId: data.campaignId,
          title: data.title,
          tier: data.tier ?? "starter",
          notes: data.notes,
        },
        generatedCopy: {
          bigIdea: data.bigIdea,
          offerText: data.offerText,
          radioScript: data.radioScript,
          funnelHeadline: data.funnelHeadline,
          funnelBody: data.funnelBody,
          followUpSummary: data.followUpSummary,
        },
      },
    });

    return NextResponse.json({ proposal }, { status: 201 });
  } catch (err) {
    console.error("[proposals/POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
