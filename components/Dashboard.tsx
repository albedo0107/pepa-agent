"use client";

import { useState, useEffect } from "react";
import ChatApp from "./ChatApp";
import dynamic from "next/dynamic";
import { Users, Home, TrendingUp, DollarSign, Activity, Calendar } from "lucide-react";
const ChartRenderer = dynamic(() => import("./ChartRenderer"), { ssr: false });
const WeekCalendar = dynamic(() => import("./WeekCalendar"), { ssr: false });

type DashboardData = {
  kpi: { klienti: number; k_prodeji: number; leady_30d: number; obrat_mesic: number };
  klienti: { jmeno: string; email: string; zdroj: string; datum_akvizice: string }[];
  kalendar: { datum: string; cas_od: string; cas_do: string; popis: string; obsazeno: boolean }[];
  leady: { mesic: string; pocet: number }[];
  prodeje: { mesic: string; obrat: number }[];
};

const ZDROJ_COLORS: Record<string, string> = {
  doporučení: "bg-green-500",
  web: "bg-blue-500",
  sreality: "bg-purple-500",
  bezrealitky: "bg-orange-500",
  inzerce: "bg-pink-500",
};

function formatCZK(n: number) {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("cs-CZ", { day: "numeric", month: "short" });
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [calRefresh, setCalRefresh] = useState(0);

  useEffect(() => {
    fetch("/api/dashboard").then(r => r.json()).then(setData).catch(() => {});
    const interval = setInterval(() => {
      fetch("/api/dashboard").then(r => r.json()).then(setData).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!data) return (
    <div className="flex h-screen items-center justify-center bg-gray-950">
      <div className="text-gray-400 animate-pulse">Načítám dashboard...</div>
    </div>
  );

  const leadyChart = {
    type: "bar" as const,
    title: "Leady za 6 měsíců",
    data: data.leady.map(l => ({ name: l.mesic, value: Number(l.pocet) })),
  };

  const prodejeChart = {
    type: "line" as const,
    title: "Obrat za 6 měsíců (Kč)",
    data: data.prodeje.map(p => ({ name: p.mesic, value: Number(p.obrat) })),
  };

  return (
    <div className="flex h-screen text-gray-100 overflow-hidden" style={{ background: "linear-gradient(135deg, #0f1a1c 0%, #0d1f2d 40%, #0a1628 70%, #0f2320 100%)" }}>
      {/* Levý panel — dashboard */}
      <div className="w-[480px] flex-shrink-0 flex flex-col overflow-y-auto border-r border-gray-700/50 p-4 gap-4" style={{ background: "rgba(15,26,28,0.7)", backdropFilter: "blur(12px)" }}>
        
        {/* Header */}
        <div className="flex items-center gap-3 pb-2 border-b border-gray-800">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center font-bold text-lg">P</div>
          <div>
            <h1 className="font-bold text-base">Pepa — Back Office</h1>
            <p className="text-xs text-gray-400">Realitní firma · Dashboard</p>
          </div>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-green-400">
            <Activity size={12} className="text-green-400" /> Online
          </span>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Klientů", value: data.kpi.klienti, Icon: Users, color: "#3b82f6" },
            { label: "K prodeji", value: data.kpi.k_prodeji, Icon: Home, color: "#10b981" },
            { label: "Leady (30d)", value: data.kpi.leady_30d, Icon: TrendingUp, color: "#8b5cf6" },
            { label: "Obrat měsíc", value: formatCZK(data.kpi.obrat_mesic), Icon: DollarSign, color: "#f59e0b" },
          ].map(k => (
            <div key={k.label} className="rounded-xl p-3 border border-gray-700/50" style={{ background: "rgba(255,255,255,0.04)" }}>
              <k.Icon size={18} className="mb-1" style={{ color: k.color }} />
              <div className="text-xl font-bold">{k.value}</div>
              <div className="text-xs text-gray-400">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Nejbližší termíny */}
        <div className="rounded-xl p-3 border border-gray-700/50" style={{ background: "rgba(255,255,255,0.03)" }}>
          <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2"><Calendar size={14} className="text-blue-400" /> Nejbližší termíny</h3>
          {data.kalendar.length === 0 ? (
            <p className="text-xs text-gray-500">Žádné termíny</p>
          ) : (
            <div className="space-y-2">
              {data.kalendar.map((k, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs p-2 rounded-lg ${k.obsazeno ? "bg-blue-900/40 border border-blue-800" : "bg-gray-800"}`}>
                  <div className="text-blue-400 font-medium w-16 flex-shrink-0">{formatDate(k.datum)}</div>
                  <div className="text-gray-400 w-20 flex-shrink-0">{k.cas_od?.slice(0,5)}–{k.cas_do?.slice(0,5)}</div>
                  <div className="text-gray-300 truncate flex-1">{(k as unknown as {popis: string}).popis || "Schůzka"}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Týdenní kalendář */}
        <WeekCalendar refresh={calRefresh} />

        {/* Poslední klienti */}
        <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
          <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2"><Users size={14} className="text-blue-400" /> Nejnovější klienti</h3>
          <div className="space-y-2">
            {data.klienti.map((k, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {k.jmeno[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{k.jmeno}</div>
                  <div className="text-gray-500 truncate">{k.email}</div>
                </div>
                <div className={`px-2 py-0.5 rounded-full text-xs ${ZDROJ_COLORS[k.zdroj] || "bg-gray-600"} bg-opacity-20 text-gray-300 flex-shrink-0`}>
                  {k.zdroj}
                </div>
              </div>
            ))}
          </div>
        </div>


      </div>

      {/* Pravý panel — Chat */}
      <div className="flex-1 overflow-hidden">
        <ChatApp embedded onCalendarUpdate={() => setCalRefresh(r => r + 1)} />
      </div>
    </div>
  );
}
