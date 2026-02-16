import { z } from "zod";
import { compromisoFormSchema, type CompromisoFormItem } from "@/lib/actions/actas-types";

export const schemaCrear = z.object({
  fecha: z.string().min(1, "La fecha es obligatoria"),
  objetivo: z.string().min(1, "El objetivo es obligatorio").max(2000),
  contenido: z.string().max(50000).optional().or(z.literal("")),
  compromisos: z.string().max(100000).optional().or(z.literal("")),
});

export const schemaActualizar = schemaCrear.extend({
  id: z.string().uuid("ID de acta inválido"),
});

export const tipoIntegranteValues = ["interno", "externo"] as const;

export const integranteSchema = z.object({
  nombre: z.string().min(1),
  email: z.string().email(),
  usuarioId: z.number().int().positive().optional(),
  tipo: z.enum(tipoIntegranteValues).default("externo"),
  cargo: z.string().max(200).optional().or(z.literal("")),
  solicitarAprobacionCorreo: z.boolean().optional().default(true),
});

export const integrantesSchema = z.array(integranteSchema);

export function parseFecha(value: string | undefined): string | null {
  if (!value || value.trim() === "") return null;
  const date = new Date(value.trim());
  return Number.isNaN(date.getTime()) ? null : value.trim().slice(0, 10);
}

export function parseIntegrantes(value: unknown): z.infer<typeof integrantesSchema> {
  if (typeof value !== "string" || value.trim() === "") return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return integrantesSchema.parse(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [];
  }
}

export function parseClienteIds(value: unknown): number[] {
  if (typeof value !== "string" || value.trim() === "") return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is number => typeof x === "number" && Number.isInteger(x) && x > 0);
  } catch {
    return [];
  }
}

export function parseActividadesIds(value: unknown): number[] {
  if (typeof value !== "string" || value.trim() === "") return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is number => typeof x === "number" && Number.isInteger(x) && x > 0);
  } catch {
    return [];
  }
}

export function parseCompromisos(value: unknown): CompromisoFormItem[] {
  if (typeof value !== "string" || value.trim() === "") return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        const r = compromisoFormSchema.safeParse(item);
        return r.success ? r.data : null;
      })
      .filter((x): x is CompromisoFormItem => x !== null);
  } catch {
    return [];
  }
}
