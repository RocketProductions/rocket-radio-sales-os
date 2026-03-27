import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rocket Radio Sales OS",
  description: "Multi-tenant SaaS for radio and local media sales teams",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
