"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function FormAprobarSubmitButton(): React.ReactElement {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="default" size="lg" className="w-full sm:w-auto" disabled={pending}>
      {pending ? "Enviando…" : "Confirmar que he leído y aprobado este acta"}
    </Button>
  );
}
