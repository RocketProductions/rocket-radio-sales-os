/**
 * Auto-Response Engine
 *
 * When a lead arrives, this engine:
 * 1. Sends an instant response (text and/or email)
 * 2. Schedules follow-up steps in automation_runs
 * 3. Each scheduled step is picked up later by a cron/worker
 *
 * The client sees: "We texted Sarah at 2:03pm" — not "automation triggered"
 */

import { prisma } from "@/lib/prisma";
import { sendText, sendEmail } from "./actions";
import { DEFAULT_SEQUENCE, type LeadContext } from "./sequences";

/**
 * Triggered when a new lead is created.
 * Sends instant response and schedules follow-ups.
 */
export async function triggerAutoResponse(leadId: string): Promise<void> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      campaign: {
        select: { name: true, offerText: true, brand: { select: { name: true } } },
      },
    },
  });

  if (!lead) {
    console.warn(`[AUTO-RESPONSE] Lead ${leadId} not found`);
    return;
  }

  const ctx: LeadContext = {
    firstName: lead.firstName ?? "there",
    businessName: lead.campaign.brand?.name ?? lead.campaign.name,
    offer: lead.campaign.offerText ?? "our services",
  };

  const now = new Date();

  for (const step of DEFAULT_SEQUENCE) {
    const scheduledFor = new Date(now.getTime() + step.delayMinutes * 60_000);

    if (step.delayMinutes === 0) {
      // Execute instant step immediately
      try {
        const msg = step.buildMessage(ctx);

        if (step.channel === "text" && lead.phone) {
          await sendText(leadId, lead.phone, msg.body);
        } else if (step.channel === "email" && lead.email) {
          await sendEmail(leadId, lead.email, msg.subject ?? "Thanks for reaching out", msg.body);
        }

        // Record as completed
        await prisma.automationRun.create({
          data: {
            leadId,
            sequenceStep: step.step,
            actionType: step.channel,
            status: "sent",
            scheduledFor,
            executedAt: new Date(),
          },
        });
      } catch (err) {
        console.error(`[AUTO-RESPONSE] Step ${step.step} failed:`, err);
        await prisma.automationRun.create({
          data: {
            leadId,
            sequenceStep: step.step,
            actionType: step.channel,
            status: "failed",
            scheduledFor,
            errorMessage: err instanceof Error ? err.message : "Unknown error",
          },
        });
      }
    } else {
      // Schedule future step
      await prisma.automationRun.create({
        data: {
          leadId,
          sequenceStep: step.step,
          actionType: step.channel,
          status: "pending",
          scheduledFor,
        },
      });
    }
  }

  // Update lead status to contacted (we've responded)
  await prisma.lead.update({
    where: { id: leadId },
    data: { status: "contacted", updatedAt: new Date() },
  });
}

/**
 * Process pending automation runs that are due.
 * Called by a cron job or scheduled task.
 */
export async function processPendingAutomations(): Promise<number> {
  const now = new Date();

  const pendingRuns = await prisma.automationRun.findMany({
    where: {
      status: "pending",
      scheduledFor: { lte: now },
    },
    take: 50,
    orderBy: { scheduledFor: "asc" },
  });

  let processed = 0;

  for (const run of pendingRuns) {
    const lead = await prisma.lead.findUnique({
      where: { id: run.leadId },
      include: {
        campaign: {
          select: { name: true, offerText: true, brand: { select: { name: true } } },
        },
      },
    });

    if (!lead) {
      await prisma.automationRun.update({
        where: { id: run.id },
        data: { status: "skipped", executedAt: new Date(), errorMessage: "Lead not found" },
      });
      continue;
    }

    // Skip if lead is already closed or lost
    if (lead.status === "closed" || lead.status === "lost") {
      await prisma.automationRun.update({
        where: { id: run.id },
        data: { status: "skipped", executedAt: new Date(), errorMessage: `Lead status: ${lead.status}` },
      });
      continue;
    }

    const ctx: LeadContext = {
      firstName: lead.firstName ?? "there",
      businessName: lead.campaign.brand?.name ?? lead.campaign.name,
      offer: lead.campaign.offerText ?? "our services",
    };

    const step = DEFAULT_SEQUENCE.find((s) => s.step === run.sequenceStep);
    if (!step) continue;

    try {
      const msg = step.buildMessage(ctx);

      if (step.channel === "text" && lead.phone) {
        await sendText(lead.id, lead.phone, msg.body);
      } else if (step.channel === "email" && lead.email) {
        await sendEmail(lead.id, lead.email, msg.subject ?? "Following up", msg.body);
      }

      await prisma.automationRun.update({
        where: { id: run.id },
        data: { status: "sent", executedAt: new Date() },
      });

      processed++;
    } catch (err) {
      await prisma.automationRun.update({
        where: { id: run.id },
        data: {
          status: "failed",
          executedAt: new Date(),
          errorMessage: err instanceof Error ? err.message : "Unknown error",
        },
      });
    }
  }

  return processed;
}
