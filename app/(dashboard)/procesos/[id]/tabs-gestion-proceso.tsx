"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TabsGestionProcesoProps {
  generalContent: ReactNode;
  acuerdosContent: ReactNode;
  cobroContent: ReactNode;
}

export function TabsGestionProceso({
  generalContent,
  acuerdosContent,
  cobroContent,
}: TabsGestionProcesoProps) {
  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList variant="underline" className="mb-6 w-full">
        <TabsTrigger variant="underline" value="general">
          General
        </TabsTrigger>
        <TabsTrigger variant="underline" value="acuerdos">
          Acuerdos de pago
        </TabsTrigger>
        <TabsTrigger variant="underline" value="cobro">
          Cobro coactivo
        </TabsTrigger>
      </TabsList>
      <TabsContent value="general" className="mt-0">
        {generalContent}
      </TabsContent>
      <TabsContent value="acuerdos" className="mt-0">
        {acuerdosContent}
      </TabsContent>
      <TabsContent value="cobro" className="mt-0">
        {cobroContent}
      </TabsContent>
    </Tabs>
  );
}
