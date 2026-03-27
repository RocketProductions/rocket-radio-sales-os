import { NextResponse } from "next/server";

/**
 * Stub API endpoint for user sign up. This endpoint does not yet implement
 * persistent storage or validation. It returns a 501 Not Implemented
 * response by default.
 */
export async function POST(req: Request) {
  return NextResponse.json(
    { ok: false, error: "Signup not implemented yet" },
    { status: 501 }
  );
}