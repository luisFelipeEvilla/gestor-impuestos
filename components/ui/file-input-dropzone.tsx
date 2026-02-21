"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Upload } from "lucide-react";

export interface FileInputDropzoneProps
  extends Omit<React.ComponentProps<"input">, "type"> {
  /** Texto cuando no hay archivos. */
  placeholder?: string;
  /** Texto cuando el usuario arrastra sobre la zona. */
  dragActiveText?: string;
  /** Clase adicional para el contenedor. */
  className?: string;
}

/**
 * Input de archivos con zona de arrastrar y soltar.
 * Mantiene el mismo name/multiple/accept para envío por formulario.
 */
export function FileInputDropzone({
  id,
  name,
  multiple,
  accept,
  disabled,
  placeholder = "Arrastre archivos aquí o haga clic para seleccionar",
  dragActiveText = "Suelte los archivos aquí",
  className,
  "aria-invalid": ariaInvalid,
  ...rest
}: FileInputDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);

  const updateSelectedFiles = React.useCallback(() => {
    const input = inputRef.current;
    if (!input?.files) return;
    setSelectedFiles(Array.from(input.files));
  }, []);

  const handleClick = React.useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateSelectedFiles();
      rest.onChange?.(e);
    },
    [rest.onChange, updateSelectedFiles]
  );

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const input = inputRef.current;
      if (!input || disabled) return;
      const files = e.dataTransfer.files;
      if (!files.length) return;
      const dt = new DataTransfer();
      for (let i = 0; i < files.length; i++) dt.items.add(files[i]);
      input.files = dt.files;
      setSelectedFiles(Array.from(input.files));
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    [disabled]
  );

  return (
    <div className={cn("grid gap-1.5", className)}>
      <input
        ref={inputRef}
        type="file"
        id={id}
        name={name}
        multiple={multiple}
        accept={accept}
        disabled={disabled}
        className="sr-only"
        aria-invalid={ariaInvalid}
        onChange={handleChange}
        {...rest}
      />
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        aria-label={placeholder}
        className={cn(
          "border-input flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-muted/30 px-4 py-6 text-center transition-colors",
          "hover:bg-muted/50 hover:border-primary/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          isDragging && "border-primary bg-primary/5",
          ariaInvalid && "border-destructive/50"
        )}
      >
        <Upload className="size-8 text-muted-foreground shrink-0" aria-hidden />
        <span className="text-muted-foreground text-sm">
          {isDragging ? dragActiveText : placeholder}
        </span>
      </div>
      {selectedFiles.length > 0 && (
        <ul className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 text-xs" role="list">
          {selectedFiles.map((file, i) => (
            <li key={i} className="truncate max-w-[240px]" title={file.name}>
              {file.name}
              {file.size > 0 && (
                <span className="ml-1 opacity-70">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
