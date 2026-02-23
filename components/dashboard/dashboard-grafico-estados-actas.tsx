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

export type DatumEstadoActa = { estado: string; count: number };

const ESTADO_ACTA_LABEL: Record<string, string> = {
  borrador: "Borrador",
  pendiente_aprobacion: "Pendiente aprobación",
  aprobada: "Aprobada",
  enviada: "Enviada",
};

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
];

interface DashboardGraficoEstadosActasProps {
  data: DatumEstadoActa[];
}

export function DashboardGraficoEstadosActas({ data }: DashboardGraficoEstadosActasProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: ESTADO_ACTA_LABEL[d.estado] ?? d.estado,
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
              payload?.[0] ? (ESTADO_ACTA_LABEL[payload[0].payload.estado] ?? payload[0].payload.estado) : ""
            }
            formatter={(value: number | undefined) => [value ?? 0, "Actas"]}
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
