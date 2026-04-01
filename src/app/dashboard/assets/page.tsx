import { headers } from "next/headers";
import { AssetLibrary } from "@/components/assets/AssetLibrary";

export const metadata = {
  title: "Brand Asset Library",
};

export default async function AssetsPage() {
  const headerStore = await headers();
  const tenantId = headerStore.get("x-tenant-id") ?? "default";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-rocket-dark">Brand Asset Library</h1>
        <p className="text-rocket-muted">
          Upload logos, photos, documents, and notes to build your client&apos;s brand kit.
        </p>
      </div>

      <AssetLibrary tenantId={tenantId} />
    </div>
  );
}
