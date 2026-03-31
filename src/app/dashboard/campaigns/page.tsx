import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Megaphone } from "lucide-react";

export default function CampaignsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="mt-1 text-rocket-muted">
            Build and manage revenue campaigns for your clients.
          </p>
        </div>
        <Link href="/dashboard/campaigns/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      {/* Empty state */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Megaphone className="mb-4 h-12 w-12 text-rocket-border" />
          <h3 className="text-lg font-medium">No campaigns yet</h3>
          <p className="mt-1 max-w-sm text-sm text-rocket-muted">
            Create your first campaign to start generating leads for a local business.
          </p>
          <Link href="/dashboard/campaigns/new" className="mt-4">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create First Campaign
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
