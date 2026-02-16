"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "group toast border border-border/80 bg-background text-foreground shadow-lg shadow-black/5 rounded-xl",
          success: "border-primary/30 bg-primary/5",
          error: "border-destructive/30 bg-destructive/5",
        },
      }}
    />
  );
}
