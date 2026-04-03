"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface Organization {
  id: string;
  name: string;
  org_type: string;
}

export function InviteForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("rep");
  const [organizationId, setOrganizationId] = useState("");
  const [commissionRate, setCommissionRate] = useState("");
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrgs() {
      try {
        const res = await fetch("/api/organizations");
        const json = await res.json();
        if (json.ok && json.data) {
          setOrganizations(json.data);
          if (json.data.length > 0) {
            setOrganizationId(json.data[0].id);
          }
        }
      } catch {
        // Orgs will just be empty
      }
    }
    loadOrgs();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          role,
          organization_id: organizationId,
          commission_rate_pct: commissionRate ? parseFloat(commissionRate) : undefined,
        }),
      });

      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "Failed to send invite");
      } else {
        setSuccess(true);
        setEmail("");
        setCommissionRate("");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="invite-email" className="block text-sm font-medium text-rocket-dark mb-1">
          Email Address
        </label>
        <Input
          id="invite-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@company.com"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="invite-role" className="block text-sm font-medium text-rocket-dark mb-1">
            Role
          </label>
          <Select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="rep">Rep</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
            <option value="agency_admin">Agency Admin</option>
          </Select>
        </div>

        <div>
          <label htmlFor="invite-org" className="block text-sm font-medium text-rocket-dark mb-1">
            Organization
          </label>
          <Select
            id="invite-org"
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            required
          >
            {organizations.length === 0 && (
              <option value="">No organizations</option>
            )}
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <label htmlFor="invite-commission" className="block text-sm font-medium text-rocket-dark mb-1">
          Commission Rate (%)
        </label>
        <Input
          id="invite-commission"
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={commissionRate}
          onChange={(e) => setCommissionRate(e.target.value)}
          placeholder="e.g. 15"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2">
          <p className="text-sm text-green-700">Invite sent successfully!</p>
        </div>
      )}

      <Button type="submit" disabled={submitting || !organizationId}>
        {submitting ? "Sending..." : "Send Invite"}
      </Button>
    </form>
  );
}
