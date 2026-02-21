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

export type DatumVigencia = { vigencia: number; count: number };

const BAR_COLOR = "var(--chart-2)";

interface GraficoProcesosPorVigenciaProps {
  data: DatumVigencia[];
}

export function GraficoProcesosPorVigencia({ data }: GraficoProcesosPorVigenciaProps) {
  const chartData = data.map((d) => ({
    ...d,
    vigenciaLabel: String(d.vigencia),
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
            dataKey="vigenciaLabel"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
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
            formatter={(value: number | undefined) => [value ?? 0, "Procesos"]}
            labelFormatter={(label) => `Vigencia ${label}`}
          />
          <Bar dataKey="count" fill={BAR_COLOR} radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
