"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSpreadsheet, FileText } from "lucide-react";

interface ImportarTabsProps {
  procesosTab: React.ReactNode;
  acuerdosTab: React.ReactNode;
}

export function ImportarTabs({ procesosTab, acuerdosTab }: ImportarTabsProps) {
  return (
    <Tabs defaultValue="procesos" className="w-full">
      <TabsList className="w-full max-w-md grid grid-cols-2" variant="default">
        <TabsTrigger value="procesos" className="gap-2">
          <FileSpreadsheet className="size-4" aria-hidden />
          Importar procesos
        </TabsTrigger>
        <TabsTrigger value="acuerdos" className="gap-2">
          <FileText className="size-4" aria-hidden />
          Importar acuerdos de pago
        </TabsTrigger>
      </TabsList>
      <TabsContent value="procesos" className="w-full mt-6">
        {procesosTab}
      </TabsContent>
      <TabsContent value="acuerdos" className="w-full mt-6">
        {acuerdosTab}
      </TabsContent>
    </Tabs>
  );
}
