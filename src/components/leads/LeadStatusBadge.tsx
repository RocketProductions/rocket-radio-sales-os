import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" }> = {
  new: { label: "New", variant: "warning" },
  contacted: { label: "Contacted", variant: "default" },
  booked: { label: "Booked", variant: "success" },
  closed: { label: "Closed", variant: "success" },
  lost: { label: "Lost", variant: "destructive" },
};

export function LeadStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
