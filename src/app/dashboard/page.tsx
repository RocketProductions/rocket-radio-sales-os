"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Megaphone, UserCheck, TrendingUp } from "lucide-react";

const stats = [
  { label: "Active Campaigns", value: "0", icon: Megaphone, trend: "Get started" },
  { label: "Total Leads", value: "0", icon: UserCheck, trend: "This month" },
  { label: "Clients", value: "0", icon: Users, trend: "Active" },
  { label: "Booked", value: "0", icon: TrendingUp, trend: "Appointments" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-rocket-muted">
          Your campaigns, leads, and client activity at a glance.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-rocket-muted">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-rocket-muted" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
              <p className="text-xs text-rocket-muted">{stat.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Megaphone className="mb-4 h-12 w-12 text-rocket-border" />
            <h3 className="text-lg font-medium">No campaigns yet</h3>
            <p className="mt-1 text-sm text-rocket-muted">
              Create your first campaign to start generating leads.
            </p>
            <Badge variant="outline" className="mt-4">
              Coming soon: Campaign Builder
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
