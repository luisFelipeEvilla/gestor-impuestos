"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type DatumEstadosImpuesto = { estado: string; count: number };

const LABELS_ESTADO_IMPUESTO: Record<string, string> = {
  pendiente: "Pendiente",
  declarado: "Declarado",
  liquidado: "Liquidado",
  notificado: "Notificado",
  en_cobro_coactivo: "Cobro coactivo",
  pagado: "Pagado",
  cerrado: "Cerrado",
};

function labelEstadoImpuesto(estado: string): string {
  return (
    LABELS_ESTADO_IMPUESTO[estado] ??
    estado.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

interface Props {
  data: DatumEstadosImpuesto[];
}

export function DashboardGraficoEstadosImpuestos({ data }: Props) {
  const chartData = data.map((d) => ({
    ...d,
    label: labelEstadoImpuesto(d.estado),
  }));

  if (chartData.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-8 text-center">
        No hay datos para mostrar.
      </p>
    );
  }

  const CHART_HEIGHT = 280;
  return (
    <div className="min-h-[280px] h-[280px] w-full min-w-0" style={{ height: CHART_HEIGHT }}>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT} minWidth={0}>
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
          accessibilityLayer
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            angle={-35}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
            }}
            labelFormatter={(_, payload) =>
              payload?.[0] ? labelEstadoImpuesto(payload[0].payload.estado) : ""
            }
            formatter={(value: number | undefined) => [value ?? 0, "Impuestos"]}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
