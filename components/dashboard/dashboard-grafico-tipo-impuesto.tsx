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

export type DatumTipoImpuesto = { tipo: string; count: number };

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function formatTipo(tipo: string): string {
  return tipo.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMonto(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

interface Props {
  data: DatumTipoImpuesto[];
}

export function DashboardGraficoTipoImpuesto({ data }: Props) {
  const chartData = data.map((d) => ({
    ...d,
    label: formatTipo(d.tipo),
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

interface PropsMonto {
  data: { tipo: string; total: number }[];
}

export function DashboardGraficoMontoTipoImpuesto({ data }: PropsMonto) {
  const chartData = data.map((d) => ({
    ...d,
    label: formatTipo(d.tipo),
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
            tickFormatter={(v) =>
              v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : `${(v / 1e3).toFixed(0)}K`
            }
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
            }}
            formatter={(value: number | undefined) => [formatMonto(value ?? 0), "Total a pagar"]}
          />
          <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
