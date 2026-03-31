import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Mail, Phone, CheckCircle2, UserPlus } from "lucide-react";

interface ActivityEvent {
  id: string;
  eventType: string;
  message: string | null;
  createdAt: string | Date;
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  auto_text: <MessageSquare className="h-4 w-4 text-rocket-blue" />,
  auto_email: <Mail className="h-4 w-4 text-rocket-blue" />,
  manual_call: <Phone className="h-4 w-4 text-rocket-success" />,
  status_change: <CheckCircle2 className="h-4 w-4 text-rocket-accent" />,
  lead_created: <UserPlus className="h-4 w-4 text-rocket-muted" />,
  booked: <CheckCircle2 className="h-4 w-4 text-rocket-success" />,
};

function formatTime(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-rocket-muted">
            No activity yet. Leads and follow-ups will show up here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="flex items-start gap-3">
              <div className="mt-0.5">
                {EVENT_ICONS[event.eventType] ?? <MessageSquare className="h-4 w-4 text-rocket-muted" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{event.message ?? event.eventType}</p>
                <p className="text-xs text-rocket-muted">{formatTime(event.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
