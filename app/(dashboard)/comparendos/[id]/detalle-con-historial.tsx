"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  formCard: ReactNode;
  timelineCard: ReactNode;
};

/**
 * Envuelve el card del proceso y el del historial; limita la altura del
 * timeline a la del formulario para que ambos queden alineados y el
 * historial haga scroll internamente.
 */
export function DetalleConHistorial({ formCard, timelineCard }: Props) {
  const formRef = useRef<HTMLDivElement>(null);
  const timelineWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const formEl = formRef.current;
    const timelineEl = timelineWrapRef.current;
    if (!formEl || !timelineEl) return;

    const setTimelineHeight = (): void => {
      const h = formEl.offsetHeight;
      timelineEl.style.height = `${h}px`;
      timelineEl.style.maxHeight = `${h}px`;
    };

    setTimelineHeight();
    const resizeObserver = new ResizeObserver(setTimelineHeight);
    resizeObserver.observe(formEl);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div className="grid grid-cols-4 items-start gap-6">
      <div ref={formRef} className="min-w-0 col-span-3">
        {formCard}
      </div>
      <div
        ref={timelineWrapRef}
        className="flex min-h-0 shrink flex-col overflow-hidden"
      >
        {timelineCard}
      </div>
    </div>
  );
}
