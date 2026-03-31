import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LeadsSummaryCardProps {
  label: string;
  value: number;
  description?: string;
  icon: React.ReactNode;
}

export function LeadsSummaryCard({ label, value, description, icon }: LeadsSummaryCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-rocket-muted">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {description && <p className="text-xs text-rocket-muted">{description}</p>}
      </CardContent>
    </Card>
  );
}
