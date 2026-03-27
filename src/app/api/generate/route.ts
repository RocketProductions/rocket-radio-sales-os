import { NextResponse } from "next/server";
import { generateContent } from "@/ai/generateContent";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await generateContent(body);
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("environment variable") ? 500 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
