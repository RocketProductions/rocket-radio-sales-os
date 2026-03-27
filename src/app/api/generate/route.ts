import { NextResponse } from "next/server";
import { generateContent } from "@/ai/generateContent";

/**
 * API route for generating content. It expects a POST body matching
 * GenerateContentInput and returns JSON with either the data or an error.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await generateContent(body);
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 400 }
    );
  }
}