"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { crearActa } from "@/lib/actions/actas";
import { ActaForm } from "@/components/actas/acta-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type UsuarioOption = { id: number; nombre: string; email: string; cargoNombre?: string | null };
type ClienteOption = { id: number; nombre: string; codigo: string | null };
type ClienteMiembroOption = { id: number; clienteId: number; nombre: string; email: string; cargo: string | null };
type CargoOption = { id: number; nombre: string };
type ObligacionConActividades = {
  id: number;
  descripcion: string;
  orden: number;
  actividades: { id: number; codigo: string; descripcion: string }[];
};

type ActaNuevoData = {
  usuarios: UsuarioOption[];
  clientes: ClienteOption[];
  cargosEmpresa: CargoOption[];
  obligacionesConActividades: ObligacionConActividades[];
  clientesMiembros: ClienteMiembroOption[];
};

export default function NuevaActaPage() {
  const [data, setData] = useState<ActaNuevoData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/actas/nuevo/data");
        if (!response.ok) {
          throw new Error("Error al cargar los datos");
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/actas">← Actas</Link>
          </Button>
        </div>
        <div className="mx-auto max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle>Cargando...</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Cargando datos del formulario...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/actas">← Actas</Link>
          </Button>
        </div>
        <div className="mx-auto max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle>Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-destructive">{error || "Error al cargar los datos"}</p>
              <Button
                onClick={() => window.location.reload()}
                className="mt-4"
              >
                Reintentar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/actas">← Actas</Link>
        </Button>
      </div>
      <div className="mx-auto max-w-4xl">
        <ActaForm
          action={crearActa}
          submitLabel="Crear acta"
          usuarios={data.usuarios}
          clientes={data.clientes}
          obligacionesConActividades={data.obligacionesConActividades}
          cargosEmpresa={data.cargosEmpresa}
          clientesMiembros={data.clientesMiembros}
        />
      </div>
    </div>
  );
}
