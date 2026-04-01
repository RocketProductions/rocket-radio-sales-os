import Link from "next/link";
import { AlertTriangle, CreditCard } from "lucide-react";

interface Props {
  status: string;
  currentPeriodEnd: string | null;
}

/**
 * Shows a persistent warning banner when a tenant's subscription is
 * past_due or cancelled. Hides for active/trialing subscriptions.
 */
export function SubscriptionBanner({ status, currentPeriodEnd }: Props) {
  if (status === "active" || status === "trialing") return null;

  const isPastDue  = status === "past_due";
  const isCanceled = status === "canceled" || status === "cancelled";

  const endDate = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm print:hidden ${
      isPastDue ? "bg-amber-50 border-b border-amber-200 text-amber-800" : "bg-red-50 border-b border-red-200 text-red-800"
    }`}>
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {isPastDue && (
          <span>
            Payment failed — please update your billing info to keep your account active.
            {endDate && ` Access ends ${endDate}.`}
          </span>
        )}
        {isCanceled && (
          <span>
            Your subscription has been cancelled.
            {endDate && ` Access ends ${endDate}.`}
            {" "}Contact us to renew.
          </span>
        )}
        {!isPastDue && !isCanceled && (
          <span>Subscription issue — status: {status}. Please check your billing.</span>
        )}
      </div>
      <Link
        href="/dashboard/settings/billing"
        className="flex shrink-0 items-center gap-1 font-medium underline underline-offset-2 hover:no-underline"
      >
        <CreditCard className="h-3.5 w-3.5" />
        Update billing
      </Link>
    </div>
  );
}
