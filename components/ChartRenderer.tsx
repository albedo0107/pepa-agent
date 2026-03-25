"use client";

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadialBarChart, RadialBar,
} from "recharts";

type ChartData = {
  type: "bar" | "line" | "pie" | "area" | "radial";
  title: string;
  data: { name: string; value: number; [key: string]: string | number }[];
  dataKeys?: string[];
  colors?: string[];
};

const PALETTE = ["#6366f1", "#22d3ee", "#f59e0b", "#10b981", "#f43f5e", "#a78bfa"];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: {name: string; value: number; color: string}[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900/95 border border-gray-700 rounded-xl px-3 py-2 shadow-xl text-xs">
      {label && <div className="text-gray-400 mb-1 font-medium">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-gray-300">{p.name}:</span>
          <span className="font-semibold text-white">{typeof p.value === "number" ? p.value.toLocaleString("cs-CZ") : p.value}</span>
        </div>
      ))}
    </div>
  );
};

const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }: {cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; name: string; percent: number}) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
  return (
    <text x={x} y={y} fill="#d1d5db" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={11}>
      {name} ({(percent * 100).toFixed(0)}%)
    </text>
  );
};

export default function ChartRenderer({ chart }: { chart: ChartData }) {
  const colors = chart.colors || PALETTE;
  const keys = chart.dataKeys || ["value"];

  const gradientIds = keys.map((_, i) => `grad-${i}`);

  return (
    <div className="rounded-2xl mt-3 w-full overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(34,211,238,0.04) 100%)", border: "1px solid rgba(99,102,241,0.2)" }}>
      {chart.title && (
        <div className="px-4 pt-4 pb-1">
          <h3 className="text-sm font-semibold text-gray-200">{chart.title}</h3>
        </div>
      )}
      <div className="p-3">
        <ResponsiveContainer width="100%" height={260}>
          {chart.type === "pie" ? (
            <PieChart>
              <defs>
                {colors.map((c, i) => (
                  <radialGradient key={i} id={`pg-${i}`} cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={c} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={c} stopOpacity={0.6} />
                  </radialGradient>
                ))}
              </defs>
              <Pie
                data={chart.data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
                labelLine={false}
                label={CustomPieLabel}
              >
                {chart.data.map((_, i) => (
                  <Cell key={i} fill={`url(#pg-${i % colors.length})`} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          ) : chart.type === "area" ? (
            <AreaChart data={chart.data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                {keys.map((_, i) => (
                  <linearGradient key={i} id={gradientIds[i]} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors[i % colors.length]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={colors[i % colors.length]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => v.toLocaleString("cs-CZ")} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
              {keys.map((key, i) => (
                <Area key={key} type="monotone" dataKey={key} stroke={colors[i % colors.length]} strokeWidth={2.5} fill={`url(#${gradientIds[i]})`} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
              ))}
            </AreaChart>
          ) : chart.type === "line" ? (
            <LineChart data={chart.data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => v.toLocaleString("cs-CZ")} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
              {keys.map((key, i) => (
                <Line key={key} type="monotone" dataKey={key} stroke={colors[i % colors.length]} strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
              ))}
            </LineChart>
          ) : chart.type === "radial" ? (
            <RadialBarChart cx="50%" cy="50%" innerRadius={30} outerRadius={100} data={chart.data.map((d, i) => ({ ...d, fill: colors[i % colors.length] }))}>
              <RadialBar dataKey="value" cornerRadius={6} label={{ position: "insideStart", fill: "#fff", fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
            </RadialBarChart>
          ) : (
            // bar (default)
            <BarChart data={chart.data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                {keys.map((_, i) => (
                  <linearGradient key={i} id={gradientIds[i]} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors[i % colors.length]} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={colors[i % colors.length]} stopOpacity={0.5} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => typeof v === "number" ? v.toLocaleString("cs-CZ") : v} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
              {keys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={`url(#${gradientIds[i]})`} radius={[6, 6, 0, 0]} maxBarSize={48} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
