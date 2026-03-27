import { NextResponse } from "next/server";
import { signToken } from "@/lib/auth";

export async function POST() {
  const token = await signToken({
    sub: "new-user",
    email: "newuser@example.com",
    tenantId: "demo-tenant",
    role: "manager",
  });
  return NextResponse.json({ token }, { status: 201 });
}
