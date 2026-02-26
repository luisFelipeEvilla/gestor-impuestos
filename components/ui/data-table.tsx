import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import { EmptyState } from "./empty-state";

export type ColumnaTabla<T> = {
  key: string;
  encabezado: string;
  className?: string;
  celda: (fila: T) => ReactNode;
};

type DataTableProps<T> = {
  columnas: ColumnaTabla<T>[];
  datos: T[];
  rowKey: (fila: T) => string | number;
  sinDatos?: {
    icon: LucideIcon;
    message: string;
    action?: { href: string; label: string };
  };
};

export function DataTable<T>({
  columnas,
  datos,
  rowKey,
  sinDatos,
}: DataTableProps<T>) {
  if (datos.length === 0 && sinDatos) {
    return <EmptyState {...sinDatos} />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columnas.map((col) => (
            <TableHead key={col.key} className={col.className}>
              {col.encabezado}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {datos.map((fila) => (
          <TableRow key={rowKey(fila)}>
            {columnas.map((col) => (
              <TableCell key={col.key} className={col.className}>
                {col.celda(fila)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
