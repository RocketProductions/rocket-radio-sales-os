/**
 * Google Calendar Integration
 *
 * Creates calendar events for lead appointments.
 * Used when a lead gets "booked" — sends invite to both the rep and the lead.
 *
 * Requires env:
 *   GOOGLE_CALENDAR_CREDENTIALS={"type":"service_account",...}  (JSON)
 *   GOOGLE_CALENDAR_ID=primary  (or a specific calendar ID)
 *
 * In dev/demo with no credentials: stubs the event creation.
 */

import { logIntegration } from "./registry";

export interface CreateEventParams {
  title: string;
  description?: string;
  startDateTime: string;   // ISO 8601
  endDateTime?: string;    // Defaults to 1 hour after start
  attendeeEmail?: string;  // Lead's email
  organizerEmail?: string; // Rep's email
  leadId?: string;
  tenantId?: string;
}

export interface CalendarResult {
  success: boolean;
  eventId?: string;
  eventLink?: string;
  error?: string;
  mode: "live" | "stub";
}

/** Create a Google Calendar event (or stub in dev) */
export async function createCalendarEventViaGoogle(
  params: CreateEventParams,
): Promise<CalendarResult> {
  const start = Date.now();

  const endDateTime =
    params.endDateTime ??
    new Date(new Date(params.startDateTime).getTime() + 60 * 60 * 1000).toISOString();

  if (!process.env.GOOGLE_CALENDAR_CREDENTIALS) {
    // Stub mode
    console.log(`[CALENDAR STUB] Event: ${params.title}`);
    console.log(`[CALENDAR STUB] Start: ${params.startDateTime}`);
    console.log(`[CALENDAR STUB] Attendee: ${params.attendeeEmail ?? "no attendee"}`);

    await logIntegration({
      tenantId: params.tenantId,
      provider: "calendar",
      action: "create_event",
      referenceId: params.leadId,
      referenceType: "lead",
      status: "skipped",
      request: { title: params.title, startDateTime: params.startDateTime },
      durationMs: Date.now() - start,
    });

    return { success: true, mode: "stub" };
  }

  try {
    // Get Google OAuth token via service account
    const credentials = JSON.parse(process.env.GOOGLE_CALENDAR_CREDENTIALS) as {
      client_email: string;
      private_key: string;
    };
    const calendarId = process.env.GOOGLE_CALENDAR_ID ?? "primary";

    // Build JWT for service account auth
    const token = await getServiceAccountToken(credentials.client_email, credentials.private_key);

    const attendees = [];
    if (params.attendeeEmail) attendees.push({ email: params.attendeeEmail });
    if (params.organizerEmail) attendees.push({ email: params.organizerEmail });

    const eventBody = {
      summary: params.title,
      description: params.description,
      start: { dateTime: params.startDateTime, timeZone: "America/Chicago" },
      end: { dateTime: endDateTime, timeZone: "America/Chicago" },
      attendees,
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          { method: "popup", minutes: 30 },
        ],
      },
    };

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventBody),
      },
    );

    const data = await res.json() as { id?: string; htmlLink?: string; message?: string };

    if (!res.ok) {
      const error = data.message ?? `Calendar error ${res.status}`;
      await logIntegration({
        tenantId: params.tenantId,
        provider: "calendar",
        action: "create_event",
        referenceId: params.leadId,
        referenceType: "lead",
        status: "failed",
        errorMessage: error,
        durationMs: Date.now() - start,
      });
      return { success: false, error, mode: "live" };
    }

    await logIntegration({
      tenantId: params.tenantId,
      provider: "calendar",
      action: "create_event",
      referenceId: params.leadId,
      referenceType: "lead",
      status: "success",
      response: { id: data.id },
      durationMs: Date.now() - start,
    });

    return { success: true, eventId: data.id, eventLink: data.htmlLink, mode: "live" };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Calendar error";
    await logIntegration({
      tenantId: params.tenantId,
      provider: "calendar",
      action: "create_event",
      referenceId: params.leadId,
      referenceType: "lead",
      status: "failed",
      errorMessage: error,
      durationMs: Date.now() - start,
    });
    return { success: false, error, mode: "live" };
  }
}

/** Generate a Google OAuth2 token using a service account JWT */
async function getServiceAccountToken(clientEmail: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/calendar",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  // Encode JWT (header.payload.signature)
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signingInput = `${header}.${encodedPayload}`;

  // Use Web Crypto to sign with RSA-SHA256
  const pemKey = privateKey.replace(/\\n/g, "\n");
  const keyData = pemKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  const binaryKey = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  const jwt = `${signingInput}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

  // Exchange JWT for access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }).toString(),
  });

  const tokenData = await tokenRes.json() as { access_token?: string };
  if (!tokenData.access_token) throw new Error("Failed to get Google access token");
  return tokenData.access_token;
}
