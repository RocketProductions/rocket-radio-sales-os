import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword, signToken } from "@/lib/auth";
import { createUser } from "@/lib/db";
import type { User, AuthPayload } from "@/types/content";
import { randomUUID } from "crypto";

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  tenantId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const { email, password, name, tenantId } = SignupSchema.parse(await req.json());
    const user: User = {
      id: randomUUID(),
      email, name, tenantId,
      role: "executive",
      passwordHash: await hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    const created = await createUser(user);
    const payload: AuthPayload = { sub: created.id, email: created.email, tenantId: created.tenantId, role: created.role };
    const token = await signToken(payload);
    return NextResponse.json({ ok: true, data: { token, user: { id: created.id, email: created.email, name: created.name, tenantId: created.tenantId, role: created.role } } }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: message.includes("already exists") ? 409 : 400 });
  }
}
