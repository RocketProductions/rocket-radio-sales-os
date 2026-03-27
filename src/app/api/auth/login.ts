import { NextResponse } from "next/server";
import { signToken } from "@/lib/auth";

export async function POST() {
  const token = await signToken({
    sub: "demo-user",
    email: "demo@example.com",
    tenantId: "demo-tenant",
    role: "admin",
  });
  return NextResponse.json({ token });
}
