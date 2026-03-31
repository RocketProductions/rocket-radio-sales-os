/**
 * Automation Actions
 *
 * Concrete actions the automation engine can take.
 * Each action:
 *   1. Calls the appropriate integration (email, SMS, calendar)
 *   2. Logs a LeadEvent so it shows up in the client's activity feed
 *
 * Providers used:
 *   - sendText → Twilio (src/integrations/sms.ts) — stub if no TWILIO_* env vars
 *   - sendEmail → Resend (src/integrations/email.ts) — stub if no RESEND_API_KEY
 *   - createCalendarEvent → Google Calendar (src/integrations/calendar.ts) — stub if no credentials
 */

import { prisma } from "@/lib/prisma";
import { sendSmsViaTwilio } from "@/integrations/sms";
import { sendEmailViaResend } from "@/integrations/email";
import { createCalendarEventViaGoogle } from "@/integrations/calendar";

export interface ActionResult {
  success: boolean;
  message: string;
}

/** Send an instant text message to a lead */
export async function sendText(
  leadId: string,
  phone: string,
  body: string,
): Promise<ActionResult> {
  const result = await sendSmsViaTwilio({ to: phone, body, leadId });

  const modeNote = result.mode === "stub" ? " (dev mode)" : "";
  const statusMsg = result.success
    ? `We texted them instantly${modeNote}: "${body.slice(0, 80)}${body.length > 80 ? "..." : ""}"`
    : `Text failed: ${result.error}`;

  await prisma.leadEvent.create({
    data: {
      leadId,
      eventType: "auto_text",
      message: statusMsg,
      metadata: {
        phone,
        body,
        channel: "sms",
        mode: result.mode,
        messageSid: result.messageSid,
      },
    },
  });

  return {
    success: result.success,
    message: result.success ? `Text sent to ${phone}` : result.error ?? "Failed",
  };
}

/** Send an email to a lead */
export async function sendEmail(
  leadId: string,
  email: string,
  subject: string,
  body: string,
): Promise<ActionResult> {
  const result = await sendEmailViaResend({ to: email, subject, body, leadId });

  const modeNote = result.mode === "stub" ? " (dev mode)" : "";
  const statusMsg = result.success
    ? `We emailed them${modeNote}: "${subject}"`
    : `Email failed: ${result.error}`;

  await prisma.leadEvent.create({
    data: {
      leadId,
      eventType: "auto_email",
      message: statusMsg,
      metadata: {
        email,
        subject,
        body,
        channel: "email",
        mode: result.mode,
        messageId: result.messageId,
      },
    },
  });

  return {
    success: result.success,
    message: result.success ? `Email sent to ${email}` : result.error ?? "Failed",
  };
}

/** Create a calendar event for appointment booking */
export async function createCalendarEvent(
  leadId: string,
  title: string,
  dateTime: string,
  attendeeEmail?: string,
): Promise<ActionResult> {
  const result = await createCalendarEventViaGoogle({
    title,
    startDateTime: dateTime,
    attendeeEmail,
    leadId,
  });

  const modeNote = result.mode === "stub" ? " (dev mode)" : "";
  const statusMsg = result.success
    ? `Appointment booked${modeNote}: ${title}`
    : `Booking failed: ${result.error}`;

  await prisma.leadEvent.create({
    data: {
      leadId,
      eventType: "booked",
      message: statusMsg,
      metadata: {
        title,
        dateTime,
        attendeeEmail,
        mode: result.mode,
        eventId: result.eventId,
        eventLink: result.eventLink,
      },
    },
  });

  return {
    success: result.success,
    message: result.success ? `Calendar event created: ${title}` : result.error ?? "Failed",
  };
}
