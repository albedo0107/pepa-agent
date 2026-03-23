"use client";

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

type ChartData = {
  type: "bar" | "line" | "pie";
  title: string;
  data: { name: string; value: number; [key: string]: string | number }[];
  dataKeys?: string[];
  colors?: string[];
};

const DEFAULT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function ChartRenderer({ chart }: { chart: ChartData }) {
  const colors = chart.colors || DEFAULT_COLORS;

  return (
    <div className="bg-gray-900 rounded-xl p-4 mt-2 w-full">
      {chart.title && <h3 className="text-sm font-semibold text-gray-300 mb-3">{chart.title}</h3>}
      <ResponsiveContainer width="100%" height={250}>
        {chart.type === "pie" ? (
          <PieChart>
            <Pie data={chart.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
              {chart.data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => typeof v === "number" ? v.toLocaleString("cs-CZ") : v} />
          </PieChart>
        ) : chart.type === "line" ? (
          <LineChart data={chart.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 12 }} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} tickFormatter={(v) => v.toLocaleString("cs-CZ")} />
            <Tooltip formatter={(v) => typeof v === "number" ? v.toLocaleString("cs-CZ") : v} contentStyle={{ background: "#1f2937", border: "none" }} />
            <Legend />
            {(chart.dataKeys || ["value"]).map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} stroke={colors[i % colors.length]} strokeWidth={2} dot={{ fill: colors[i % colors.length] }} />
            ))}
          </LineChart>
        ) : (
          <BarChart data={chart.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 12 }} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} tickFormatter={(v) => typeof v === "number" ? v.toLocaleString("cs-CZ") : v} />
            <Tooltip formatter={(v) => typeof v === "number" ? v.toLocaleString("cs-CZ") : v} contentStyle={{ background: "#1f2937", border: "none" }} />
            <Legend />
            {(chart.dataKeys || ["value"]).map((key, i) => (
              <Bar key={key} dataKey={key} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
