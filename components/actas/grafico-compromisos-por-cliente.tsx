"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type DatumCliente = { nombre: string; count: number };

const BAR_COLOR = "var(--chart-3)";

interface GraficoCompromisosPorClienteProps {
  data: DatumCliente[];
}

const MAX_BARS = 10;

export function GraficoCompromisosPorCliente({ data }: GraficoCompromisosPorClienteProps) {
  const chartData = data.slice(0, MAX_BARS).map((d) => ({
    ...d,
    nombre: d.nombre || "—",
  }));

  if (chartData.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-8 text-center">
        No hay datos para mostrar.
      </p>
    );
  }

  const CHART_HEIGHT = Math.max(200, chartData.length * 32);
  return (
    <div className="w-full min-w-0" style={{ height: CHART_HEIGHT }}>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT} minWidth={0}>
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
          accessibilityLayer
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="nombre"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={120}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
            }}
            formatter={(value: number | undefined) => [value ?? 0, "Compromisos"]}
          />
          <Bar dataKey="count" fill={BAR_COLOR} radius={[0, 4, 4, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
