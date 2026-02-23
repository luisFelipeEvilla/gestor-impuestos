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

export type DatumEstadoCompromiso = { estado: string; count: number };

const LABEL_ESTADO: Record<string, string> = {
  pendiente: "Pendiente",
  cumplido: "Cumplido",
  no_cumplido: "No cumplido",
};

const COLORS: Record<string, string> = {
  pendiente: "var(--chart-1)",
  cumplido: "var(--chart-2)",
  no_cumplido: "var(--destructive)",
};

interface GraficoCompromisosPorEstadoProps {
  data: DatumEstadoCompromiso[];
}

export function GraficoCompromisosPorEstado({ data }: GraficoCompromisosPorEstadoProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: LABEL_ESTADO[d.estado] ?? d.estado,
  }));

  if (chartData.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-8 text-center">
        No hay datos para mostrar.
      </p>
    );
  }

  const CHART_HEIGHT = 260;
  return (
    <div className="min-h-[260px] h-[260px] w-full min-w-0" style={{ height: CHART_HEIGHT }}>
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
            angle={-25}
            textAnchor="end"
            height={56}
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
              payload?.[0] ? LABEL_ESTADO[payload[0].payload.estado] ?? payload[0].payload.estado : ""
            }
            formatter={(value: number | undefined) => [value ?? 0, "Compromisos"]}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {chartData.map((entry) => (
              <Cell key={entry.estado} fill={COLORS[entry.estado] ?? "var(--chart-1)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
