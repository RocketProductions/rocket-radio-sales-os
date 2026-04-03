import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { InviteForm } from "@/components/team/InviteForm";

export const dynamic = "force-dynamic";

interface RosterMember {
  membership_id: string;
  name: string;
  email: string;
  role: string;
  organization_name: string;
  commission_rate_pct: number | null;
  joined_date: string;
  is_active: boolean;
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
  organizations: { name: string } | null;
}

interface OrgCard {
  id: string;
  name: string;
  org_type: string;
  member_count: number;
}

function roleBadgeVariant(role: string) {
  switch (role) {
    case "super_admin": return "destructive" as const;
    case "admin": return "default" as const;
    case "manager": return "warning" as const;
    default: return "secondary" as const;
  }
}

function orgTypeBadgeVariant(type: string) {
  switch (type) {
    case "platform": return "destructive" as const;
    case "media_company": return "default" as const;
    case "agency": return "warning" as const;
    default: return "secondary" as const;
  }
}

export default async function TeamSettingsPage() {
  const headersList = await headers();
  const role = headersList.get("x-user-role") ?? "";
  const tenantId = headersList.get("x-tenant-id") ?? "";
  const isSuperAdmin = role === "super_admin";

  const supabase = getSupabaseAdmin();

  // Fetch roster (org_memberships joined with users and orgs)
  const { data: rawMemberships } = await supabase
    .from("org_memberships")
    .select(`
      id, role, commission_rate_pct, is_active, created_at,
      app_users ( id, name, email ),
      organizations ( id, name, tenant_id )
    `)
    .order("created_at", { ascending: false });

  type MembershipRow = {
    id: string;
    role: string;
    commission_rate_pct: number | null;
    is_active: boolean;
    created_at: string;
    app_users: { id: string; name: string; email: string } | null;
    organizations: { id: string; name: string; tenant_id: string | null } | null;
  };

  let memberships = (rawMemberships ?? []) as unknown as MembershipRow[];
  if (!isSuperAdmin && tenantId) {
    memberships = memberships.filter((m) => m.organizations?.tenant_id === tenantId);
  }

  const roster: RosterMember[] = memberships.map((m) => ({
    membership_id: m.id,
    name: m.app_users?.name ?? "Unknown",
    email: m.app_users?.email ?? "",
    role: m.role,
    organization_name: m.organizations?.name ?? "Unknown",
    commission_rate_pct: m.commission_rate_pct,
    joined_date: m.created_at,
    is_active: m.is_active,
  }));

  // Fetch pending invites
  const inviteQuery = supabase
    .from("team_invites")
    .select(`id, email, role, status, expires_at, created_at, organizations ( name, tenant_id )`)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const { data: rawInvites } = await inviteQuery;

  type InviteRow = {
    id: string;
    email: string;
    role: string;
    status: string;
    expires_at: string;
    created_at: string;
    organizations: { name: string; tenant_id: string | null } | null;
  };

  let pendingInvites = (rawInvites ?? []) as unknown as InviteRow[];
  if (!isSuperAdmin && tenantId) {
    pendingInvites = pendingInvites.filter((inv) => inv.organizations?.tenant_id === tenantId);
  }

  const invites: PendingInvite[] = pendingInvites.map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    status: new Date(inv.expires_at) < new Date() ? "expired" : inv.status,
    expires_at: inv.expires_at,
    created_at: inv.created_at,
    organizations: inv.organizations ? { name: inv.organizations.name } : null,
  }));

  // Fetch orgs for super_admin section
  let orgCards: OrgCard[] = [];
  if (isSuperAdmin) {
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name, org_type")
      .order("name");

    if (orgs) {
      orgCards = (orgs as { id: string; name: string; org_type: string }[]).map((org) => {
        const count = memberships.filter((m) => m.organizations?.id === org.id).length;
        return { id: org.id, name: org.name, org_type: org.org_type, member_count: count };
      });
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Team Management"
        subtitle="Manage your team members, invitations, and organizations."
      />

      {/* Team Roster */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Team Roster ({roster.length} member{roster.length !== 1 ? "s" : ""})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {roster.length === 0 ? (
            <p className="py-8 text-center text-sm text-rocket-muted">
              No team members yet. Send an invite below to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-rocket-border text-left text-rocket-muted">
                    <th className="pb-2 pr-4 font-medium">Name</th>
                    <th className="pb-2 pr-4 font-medium">Email</th>
                    <th className="pb-2 pr-4 font-medium">Role</th>
                    <th className="pb-2 pr-4 font-medium">Organization</th>
                    <th className="pb-2 pr-4 font-medium">Commission</th>
                    <th className="pb-2 pr-4 font-medium">Joined</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((member) => (
                    <tr key={member.membership_id} className="border-b border-rocket-border/50 last:border-0">
                      <td className="py-3 pr-4 font-medium text-rocket-dark">{member.name}</td>
                      <td className="py-3 pr-4 text-rocket-muted">{member.email}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={roleBadgeVariant(member.role)}>{member.role}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-rocket-dark">{member.organization_name}</td>
                      <td className="py-3 pr-4 text-rocket-dark">
                        {member.commission_rate_pct != null ? `${member.commission_rate_pct}%` : "--"}
                      </td>
                      <td className="py-3 pr-4 text-rocket-muted">
                        {new Date(member.joined_date).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <Badge variant={member.is_active ? "success" : "secondary"}>
                          {member.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invite Team Member</CardTitle>
        </CardHeader>
        <CardContent>
          <InviteForm />
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Pending Invites ({invites.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invites.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-md border border-rocket-border p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-rocket-dark">{inv.email}</p>
                    <p className="text-xs text-rocket-muted">
                      {inv.organizations?.name ?? "Unknown org"} &middot; {inv.role}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-rocket-muted">
                      Sent {new Date(inv.created_at).toLocaleDateString()}
                    </span>
                    <Badge variant={inv.status === "expired" ? "destructive" : "warning"}>
                      {inv.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Organizations (super_admin only) */}
      {isSuperAdmin && orgCards.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-rocket-dark">Organizations</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orgCards.map((org) => (
              <Card key={org.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-rocket-dark">{org.name}</h3>
                    <Badge variant={orgTypeBadgeVariant(org.org_type)}>{org.org_type}</Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-rocket-muted">
                    <span>{org.member_count} member{org.member_count !== 1 ? "s" : ""}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
