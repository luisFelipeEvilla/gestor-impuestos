"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const POLL_INTERVAL_MS = 30_000; // 30 segundos

/**
 * Refresca los datos del dashboard cada 30 segundos (router.refresh).
 * No renderiza nada; solo ejecuta el efecto.
 */
export function DashboardPolling() {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [router]);

  return null;
}
