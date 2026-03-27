import { NextResponse } from "next/server";

/**
 * Stub API endpoint for user login. This endpoint does not yet implement
 * authentication logic. It returns a 501 Not Implemented response by
 * default.
 */
export async function POST(req: Request) {
  return NextResponse.json(
    { ok: false, error: "Login not implemented yet" },
    { status: 501 }
  );
}