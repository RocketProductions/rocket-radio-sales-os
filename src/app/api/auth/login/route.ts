import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPassword, signToken } from "@/lib/auth";
import { findUserByEmail } from "@/lib/db";
import type { AuthPayload } from "@/types/content";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const { email, password } = LoginSchema.parse(await req.json());
    const user = findUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ ok: false, error: "Invalid email or password" }, { status: 401 });
    }
    const payload: AuthPayload = { sub: user.id, email: user.email, tenantId: user.tenantId, role: user.role };
    const token = await signToken(payload);
    return NextResponse.json({ ok: true, data: { token, user: { id: user.id, email: user.email, name: user.name, tenantId: user.tenantId, role: user.role } } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
