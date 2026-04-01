"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProposalPrintButton() {
  return (
    <Button
      variant="outline"
      className="flex-1 print:hidden"
      onClick={() => window.print()}
    >
      <Printer className="mr-2 h-4 w-4" />
      Print / Save as PDF
    </Button>
  );
}
