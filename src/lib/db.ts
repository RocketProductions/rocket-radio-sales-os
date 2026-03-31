/**
 * db.ts — User store backed by Supabase JS client (REST API).
 * Uses service role key — bypasses RLS, server-only.
 */

import type { User } from "@/types/content";

type DbUser = {
  id: string;
  email: string;
  name: string;
  tenant_id: string | null;
  role: string;
  password_hash: string | null;
  created_at: string;
};

function toUser(row: DbUser): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    tenantId: row.tenant_id ?? "",
    role: (row.role as User["role"]) ?? "client",
    passwordHash: row.password_hash ?? "",
    createdAt: row.created_at,
  };
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const { getSupabaseAdmin } = await import("@/lib/supabase-admin");
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .ilike("email", email)
    .maybeSingle();
  if (error || !data) return undefined;
  return toUser(data as DbUser);
}

export async function findUserById(id: string): Promise<User | undefined> {
  const { getSupabaseAdmin } = await import("@/lib/supabase-admin");
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return undefined;
  return toUser(data as DbUser);
}

export async function createUser(user: User): Promise<User> {
  const { getSupabaseAdmin } = await import("@/lib/supabase-admin");
  const supabase = getSupabaseAdmin();

  const existing = await findUserByEmail(user.email);
  if (existing) throw new Error("A user with this email already exists");

  const { data, error } = await supabase
    .from("app_users")
    .insert({
      id: user.id,
      email: user.email,
      name: user.name,
      tenant_id: user.tenantId || null,
      role: user.role,
      password_hash: user.passwordHash,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create user");
  return toUser(data as DbUser);
}
