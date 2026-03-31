import { CampaignWizard } from "@/components/campaigns/CampaignWizard";

export default function NewCampaignPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Campaign</h1>
        <p className="mt-1 text-rocket-muted">
          Enter the business details and let AI build your campaign strategy.
        </p>
      </div>
      <CampaignWizard />
    </div>
  );
}
