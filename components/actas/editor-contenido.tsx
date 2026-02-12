"use client";

import { useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";

type EditorContenidoProps = {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  "aria-invalid"?: boolean;
};

/**
 * Editor de contenido para el acta. Almacena HTML en el campo del formulario.
 * Se puede reemplazar por Tiptap u otro WYSIWYG cuando esté disponible.
 */
export function EditorContenido({
  name,
  defaultValue = "",
  placeholder = "Escribe el contenido del acta (puedes usar formato básico)...",
  "aria-invalid": ariaInvalid,
}: EditorContenidoProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current && defaultValue && ref.current.value === "") {
      ref.current.value = defaultValue;
    }
  }, [defaultValue]);

  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>Contenido</Label>
      <textarea
        ref={ref}
        id={name}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={10}
        className="border-input bg-background focus-visible:ring-ring min-h-[200px] w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2"
        aria-invalid={ariaInvalid}
      />
    </div>
  );
}
