"use client";

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SearchableSelectOption = {
  value: string;
  label: string;
  /** Opcional: agrupa en secciones (ej. "Nuestra empresa", "Miembros del cliente"). */
  group?: string;
};

type SearchableSelectProps = {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  /** Ancho del trigger: "full" ocupa 100%, "auto" se ajusta al contenido. */
  width?: "full" | "auto";
  className?: string;
};

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Buscar o seleccionar…",
  disabled = false,
  id,
  "aria-label": ariaLabel,
  width = "full",
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [highlightIndex, setHighlightIndex] = React.useState(0);
  const [triggerWidth, setTriggerWidth] = React.useState(0);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption?.label ?? "";

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const emptyOption = options.find((o) => o.value === "");
    const rest = q
      ? options.filter((o) => o.value !== "" && o.label.toLowerCase().includes(q))
      : options.filter((o) => o.value !== "");
    return emptyOption ? [emptyOption, ...rest] : rest;
  }, [options, search]);

  const groups = React.useMemo(() => {
    const map = new Map<string, SearchableSelectOption[]>();
    for (const o of filtered) {
      const g = o.group ?? "";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(o);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const flatFiltered = React.useMemo(
    () => groups.flatMap(([, opts]) => opts),
    [groups]
  );

  const openDropdown = React.useCallback(() => {
    if (disabled) return;
    setTriggerWidth(wrapperRef.current?.offsetWidth ?? 0);
    setOpen(true);
    setSearch("");
    setHighlightIndex(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [disabled]);

  const closeDropdown = React.useCallback(() => {
    setOpen(false);
    setSearch("");
  }, []);

  const selectValue = React.useCallback(
    (v: string) => {
      onChange(v);
      closeDropdown();
    },
    [onChange, closeDropdown]
  );

  React.useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, closeDropdown]);

  React.useEffect(() => {
    if (!open || flatFiltered.length === 0) return;
    const idx = Math.min(highlightIndex, flatFiltered.length - 1);
    const el = listRef.current?.querySelector(`[data-index="${idx}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open, highlightIndex, flatFiltered.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        openDropdown();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      closeDropdown();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i < flatFiltered.length - 1 ? i + 1 : i));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => (i > 0 ? i - 1 : 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const item = flatFiltered[highlightIndex];
      if (item) selectValue(item.value);
      return;
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={cn("relative", width === "full" && "w-full", className)}
    >
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-disabled={disabled}
        disabled={disabled}
        onClick={openDropdown}
        onKeyDown={handleKeyDown}
        className={cn(
          "border-input bg-background focus-visible:ring-ring flex h-9 w-full items-center justify-between gap-2 rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 text-left",
          width === "auto" && "w-auto min-w-32",
          !displayLabel && "text-muted-foreground"
        )}
      >
        <span className="truncate">
          {displayLabel || placeholder}
        </span>
        <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 z-50 mt-1 max-h-60 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
          style={{
            width:
              triggerWidth > 0
                ? `${triggerWidth}px`
                : wrapperRef.current?.offsetWidth
                  ? `${wrapperRef.current.offsetWidth}px`
                  : "100%",
            minWidth: "12rem",
          }}
        >
          <div className="border-b p-1">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setHighlightIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Escribe para filtrar…"
              className="border-input h-8 w-full rounded border bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground"
              aria-label="Filtrar opciones"
            />
          </div>
          <ul
            ref={listRef}
            role="listbox"
            className="max-h-48 overflow-y-auto p-1"
          >
            {flatFiltered.length === 0 ? (
              <li className="text-muted-foreground py-2 px-2 text-sm">
                Sin resultados
              </li>
            ) : (
              groups.map(([groupName, groupOptions]) => (
                <React.Fragment key={groupName || "default"}>
                  {groupName ? (
                    <li
                      className="text-muted-foreground px-2 pt-2 pb-0.5 text-xs font-medium"
                      role="presentation"
                    >
                      {groupName}
                    </li>
                  ) : null}
                  {groupOptions.map((opt) => {
                    const flatIdx = flatFiltered.findIndex(
                      (o) => o.value === opt.value && o.label === opt.label
                    );
                    const isHighlight = flatIdx === highlightIndex;
                    return (
                      <li
                        key={opt.value}
                        data-index={flatIdx}
                        role="option"
                        aria-selected={value === opt.value}
                        className={cn(
                          "cursor-pointer rounded-sm py-1.5 pr-2 pl-2 text-sm",
                          isHighlight && "bg-accent text-accent-foreground",
                          value === opt.value && "bg-muted/80"
                        )}
                        onMouseEnter={() => setHighlightIndex(flatIdx)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectValue(opt.value);
                        }}
                      >
                        {opt.label}
                      </li>
                    );
                  })}
                </React.Fragment>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
