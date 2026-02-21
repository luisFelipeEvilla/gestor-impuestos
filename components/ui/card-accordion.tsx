"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CardSectionAccordionProps {
  title: string;
  description: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function CardSectionAccordion({
  title,
  description,
  defaultOpen = false,
  children,
  className,
}: CardSectionAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className={cn("w-full", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl"
        aria-expanded={open}
        aria-controls={`accordion-content-${title.replace(/\s+/g, "-")}`}
        id={`accordion-trigger-${title.replace(/\s+/g, "-")}`}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-3 py-6 px-6">
          <div className="min-w-0 flex-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {description}
            </CardDescription>
          </div>
          <ChevronDown
            className={cn(
              "size-5 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180"
            )}
            aria-hidden
          />
        </CardHeader>
      </button>
      <div
        id={`accordion-content-${title.replace(/\s+/g, "-")}`}
        role="region"
        aria-labelledby={`accordion-trigger-${title.replace(/\s+/g, "-")}`}
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <CardContent className="space-y-6 pt-0 px-6 pb-6">
            {children}
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
