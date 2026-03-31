import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  let brands: { id: string; name: string; industry: string | null; createdAt: Date | null }[] = [];

  try {
    brands = await prisma.brand.findMany({
      select: { id: true, name: true, industry: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  } catch {
    // DB not connected yet — show empty state
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clients</h1>
        <p className="mt-1 text-rocket-muted">
          Local businesses you serve with the 4-Part Revenue System.
        </p>
      </div>

      {brands.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="mb-4 h-12 w-12 text-rocket-border" />
            <h3 className="text-lg font-medium">No clients yet</h3>
            <p className="mt-1 max-w-sm text-sm text-rocket-muted">
              Clients are added when you create campaigns. Start by creating a campaign for a local business.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => (
            <Card key={brand.id}>
              <CardHeader>
                <CardTitle className="text-lg">{brand.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {brand.industry && (
                  <Badge variant="secondary">{brand.industry}</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
