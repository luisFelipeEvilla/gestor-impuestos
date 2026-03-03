"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSpreadsheet, FileText } from "lucide-react";

interface ImportarTabsProps {
  procesosTab: React.ReactNode;
  acuerdosTab: React.ReactNode;
  comparendosTab: React.ReactNode;
  resolucionesTab: React.ReactNode;
}

export function ImportarTabs({ procesosTab, acuerdosTab, comparendosTab, resolucionesTab }: ImportarTabsProps) {
  return (
    <Tabs defaultValue="procesos" className="w-full">
      <TabsList className="w-full max-w-4xl grid grid-cols-4" variant="default">
        <TabsTrigger value="procesos" className="gap-2">
          <FileSpreadsheet className="size-4" aria-hidden />
          Importar procesos
        </TabsTrigger>
        <TabsTrigger value="acuerdos" className="gap-2">
          <FileText className="size-4" aria-hidden />
          Importar acuerdos de pago
        </TabsTrigger>
        <TabsTrigger value="comparendos" className="gap-2">
          <FileText className="size-4" aria-hidden />
          Importar comparendos
        </TabsTrigger>
        <TabsTrigger value="resoluciones" className="gap-2">
          <FileText className="size-4" aria-hidden />
          Importar resoluciones
        </TabsTrigger>
      </TabsList>
      <TabsContent value="procesos" className="w-full mt-6">
        {procesosTab}
      </TabsContent>
      <TabsContent value="acuerdos" className="w-full mt-6">
        {acuerdosTab}
      </TabsContent>
      <TabsContent value="comparendos" className="w-full mt-6">
        {comparendosTab}
      </TabsContent>
      <TabsContent value="resoluciones" className="w-full mt-6">
        {resolucionesTab}
      </TabsContent>
    </Tabs>
  );
}
