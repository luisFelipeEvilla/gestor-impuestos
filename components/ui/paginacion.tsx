import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { SelectorPorPagina } from "@/components/selector-por-pagina";

type PaginacionProps = {
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize: number;
  /** Construye la URL para la página indicada */
  buildPageUrl: (page: number) => string;
  /** Path base del formulario "ir a página" (p. ej. "/contribuyentes") */
  formAction: string;
  /** Parámetros actuales sin `perPage` ni `page`, para SelectorPorPagina */
  selectorSearchParams: Record<string, string>;
};

export function Paginacion({
  currentPage,
  totalPages,
  total,
  pageSize,
  buildPageUrl,
  formAction,
  selectorSearchParams,
}: PaginacionProps) {
  if (totalPages <= 1 && total === 0) return null;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-border/80 pt-4 mt-4">
      <div className="flex flex-wrap items-center gap-4">
        <p className="text-sm text-muted-foreground">
          Página {currentPage} de {totalPages}
          {total > 0 && (
            <span className="ml-1">
              · {total} resultado{total !== 1 ? "s" : ""}
            </span>
          )}
        </p>
        <SelectorPorPagina
          searchParams={selectorSearchParams}
          perPage={pageSize}
        />
      </div>
      <nav className="flex flex-wrap items-center gap-2" aria-label="Paginación">
        {currentPage <= 1 ? (
          <Button variant="outline" size="sm" className="gap-1" disabled>
            <ChevronsLeft className="size-4" aria-hidden />
            Primera
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-1" asChild>
            <Link href={buildPageUrl(1)} scroll={false}>
              <ChevronsLeft className="size-4" aria-hidden />
              Primera
            </Link>
          </Button>
        )}
        {currentPage <= 1 ? (
          <Button variant="outline" size="sm" className="gap-1" disabled>
            <ChevronLeft className="size-4" aria-hidden />
            Anterior
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-1" asChild>
            <Link href={buildPageUrl(currentPage - 1)} scroll={false}>
              <ChevronLeft className="size-4" aria-hidden />
              Anterior
            </Link>
          </Button>
        )}
        <span className="px-2 text-sm text-muted-foreground">
          Página {currentPage} de {totalPages}
        </span>
        {currentPage >= totalPages ? (
          <Button variant="outline" size="sm" className="gap-1" disabled>
            Siguiente
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-1" asChild>
            <Link href={buildPageUrl(currentPage + 1)} scroll={false}>
              Siguiente
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          </Button>
        )}
        {currentPage >= totalPages ? (
          <Button variant="outline" size="sm" className="gap-1" disabled>
            Última
            <ChevronsRight className="size-4" aria-hidden />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-1" asChild>
            <Link href={buildPageUrl(totalPages)} scroll={false}>
              Última
              <ChevronsRight className="size-4" aria-hidden />
            </Link>
          </Button>
        )}
        <form method="GET" action={formAction} className="flex items-center gap-1.5">
          {Object.entries(selectorSearchParams).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <input type="hidden" name="perPage" value={String(pageSize)} />
          <label htmlFor="paginacion-page-go" className="sr-only">
            Ir a página
          </label>
          <Input
            id="paginacion-page-go"
            type="number"
            name="page"
            min={1}
            max={totalPages}
            defaultValue={currentPage}
            className="w-16 h-8 text-center text-sm"
            aria-label="Número de página"
          />
          <Button type="submit" variant="secondary" size="sm">
            Ir
          </Button>
        </form>
      </nav>
    </div>
  );
}
