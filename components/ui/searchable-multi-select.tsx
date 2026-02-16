"use client";

import * as React from "react";
import { ChevronDownIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type SearchableMultiSelectOption = {
  value: string;
  label: string;
};

type SearchableMultiSelectProps = {
  options: SearchableMultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  /** Máximo de chips a mostrar en el trigger; el resto se indica con "+N". */
  maxChips?: number;
  className?: string;
};

export function SearchableMultiSelect({
  options,
  value,
  onChange,
  placeholder = "Buscar o seleccionar…",
  disabled = false,
  id,
  "aria-label": ariaLabel,
  maxChips = 3,
  className,
}: SearchableMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [highlightIndex, setHighlightIndex] = React.useState(0);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const valueSet = React.useMemo(() => new Set(value), [value]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? options.filter((o) => o.label.toLowerCase().includes(q))
      : options;
  }, [options, search]);

  const openDropdown = React.useCallback(() => {
    if (disabled) return;
    setOpen(true);
    setSearch("");
    setHighlightIndex(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [disabled]);

  const closeDropdown = React.useCallback(() => {
    setOpen(false);
    setSearch("");
  }, []);

  const toggleValue = React.useCallback(
    (v: string) => {
      const next = valueSet.has(v) ? value.filter((x) => x !== v) : [...value, v];
      onChange(next);
    },
    [value, valueSet, onChange]
  );

  const removeValue = React.useCallback(
    (e: React.MouseEvent, v: string) => {
      e.stopPropagation();
      onChange(value.filter((x) => x !== v));
    },
    [value, onChange]
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
    if (!open || filtered.length === 0) return;
    const idx = Math.min(highlightIndex, filtered.length - 1);
    const el = listRef.current?.querySelector(`[data-index="${idx}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open, highlightIndex, filtered.length]);

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
      setHighlightIndex((i) => (i < filtered.length - 1 ? i + 1 : i));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => (i > 0 ? i - 1 : 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[highlightIndex];
      if (item) toggleValue(item.value);
      return;
    }
  };

  const selectedLabels = value
    .map((v) => options.find((o) => o.value === v)?.label ?? v)
    .filter(Boolean);
  const visibleChips = selectedLabels.slice(0, maxChips);
  const restCount = selectedLabels.length - maxChips;

  return (
    <div
      ref={wrapperRef}
      className={cn("relative w-full", className)}
    >
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-multiselectable
        aria-disabled={disabled}
        disabled={disabled}
        onClick={openDropdown}
        onKeyDown={handleKeyDown}
        className={cn(
          "border-input bg-background focus-visible:ring-ring flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 text-left",
          !selectedLabels.length && "text-muted-foreground"
        )}
      >
        {selectedLabels.length === 0 ? (
          <span className="truncate">{placeholder}</span>
        ) : (
          <>
            {visibleChips.map((label, i) => {
              const val = value[i];
              return (
                <span
                  key={val}
                  className="bg-muted text-muted-foreground inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs"
                >
                  <span className="max-w-[120px] truncate">{label}</span>
                  <button
                    type="button"
                    onClick={(e) => removeValue(e, val)}
                    className="rounded p-0.5 hover:bg-muted-foreground/20"
                    aria-label={`Quitar ${label}`}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              );
            })}
            {restCount > 0 && (
              <span className="text-muted-foreground text-xs">+{restCount}</span>
            )}
          </>
        )}
        <ChevronDownIcon className="ml-auto size-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 max-h-60 w-full min-w-[12rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
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
            {filtered.length === 0 ? (
              <li className="text-muted-foreground py-2 px-2 text-sm">
                Sin resultados
              </li>
            ) : (
              filtered.map((opt, idx) => {
                const isSelected = valueSet.has(opt.value);
                const isHighlight = idx === highlightIndex;
                return (
                  <li
                    key={opt.value}
                    data-index={idx}
                    role="option"
                    aria-selected={isSelected}
                    className={cn(
                      "cursor-pointer rounded-sm py-1.5 pr-2 pl-2 text-sm",
                      isHighlight && "bg-accent text-accent-foreground",
                      isSelected && "bg-muted/80"
                    )}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      toggleValue(opt.value);
                    }}
                  >
                    {opt.label}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
