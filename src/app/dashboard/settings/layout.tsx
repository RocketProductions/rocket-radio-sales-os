import Link from "next/link";
import { headers } from "next/headers";

const TABS = [
  { href: "/dashboard/settings/connections",   label: "Social Connections" },
  { href: "/dashboard/settings/notifications", label: "Lead Notifications" },
];

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  // Next.js sets x-pathname in middleware; fall back to empty string
  const pathname = headersList.get("x-pathname") ?? "";

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-rocket-dark">Settings</h1>
        <p className="text-sm text-rocket-muted mt-1">Manage your integrations and notification preferences.</p>
      </div>

      {/* Tab bar — active state is handled client-side via CSS :is() selector trick */}
      <div className="flex gap-1 border-b border-rocket-border">
        {TABS.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                isActive
                  ? "border-rocket-blue text-rocket-blue"
                  : "border-transparent text-rocket-muted hover:text-rocket-dark"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
