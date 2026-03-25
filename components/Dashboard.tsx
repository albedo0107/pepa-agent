"use client";

import { useState, useEffect } from "react";
import ChatApp from "./ChatApp";
import dynamic from "next/dynamic";
import { Activity, LayoutDashboard, MessageSquare, Bell } from "lucide-react";
const ChartRenderer = dynamic(() => import("./ChartRenderer"), { ssr: false });
const WeekCalendar = dynamic(() => import("./WeekCalendar"), { ssr: false });

type DashboardData = {
  kpi: { klienti: number; k_prodeji: number; leady_30d: number; obrat_mesic: number };
  klienti: { jmeno: string; email: string; zdroj: string; datum_akvizice: string }[];
  kalendar: { datum: string; cas_od: string; cas_do: string; popis: string; obsazeno: boolean }[];
  leady: { mesic: string; pocet: number }[];
  prodeje: { mesic: string; obrat: number }[];
};

type DashboardNote = {
  id: number;
  typ: string;
  nadpis: string;
  obsah: string;
  zdroj: string;
  created_at: string;
};

type FollowUpLead = {
  id: number;
  datum: string;
  cas_od: string;
  cas_do: string;
  typ: string;
  klient_jmeno: string;
  popis: string;
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
  const [followUps, setFollowUps] = useState<FollowUpLead[]>([]);
  const [notes, setNotes] = useState<DashboardNote[]>([]);
  const [calRefresh, setCalRefresh] = useState(0);
  const [mobileTab, setMobileTab] = useState<"dashboard" | "chat">("dashboard");

  useEffect(() => {
    fetch("/api/dashboard").then(r => r.json()).then(setData).catch(() => {});
    fetch("/api/followup").then(r => r.json()).then(setFollowUps).catch(() => {});
    fetch("/api/poznamky").then(r => r.json()).then(setNotes).catch(() => {});
    const interval = setInterval(() => {
      fetch("/api/dashboard").then(r => r.json()).then(setData).catch(() => {});
      fetch("/api/followup").then(r => r.json()).then(setFollowUps).catch(() => {});
      fetch("/api/poznamky").then(r => r.json()).then(setNotes).catch(() => {});
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
    <div className="flex flex-col h-screen text-gray-100 overflow-hidden" style={{ background: "linear-gradient(135deg, #0f1a1c 0%, #0d1f2d 40%, #0a1628 70%, #0f2320 100%)" }}>

      {/* Mobile tab bar */}
      <div className="flex md:hidden border-b border-gray-700/50 flex-shrink-0" style={{ background: "rgba(15,26,28,0.95)" }}>
        <button
          onClick={() => setMobileTab("dashboard")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${mobileTab === "dashboard" ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-400"}`}
        >
          <LayoutDashboard size={16} /> Dashboard
        </button>
        <button
          onClick={() => setMobileTab("chat")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${mobileTab === "chat" ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-400"}`}
        >
          <MessageSquare size={16} /> Chat s Pepou
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
      {/* Levý panel — dashboard */}
      <div className={`${mobileTab === "dashboard" ? "flex" : "hidden"} md:flex w-full md:w-[480px] flex-shrink-0 flex-col overflow-y-auto border-r border-gray-700/50 p-4 gap-4`} style={{ background: "rgba(15,26,28,0.7)", backdropFilter: "blur(12px)" }}>
        
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

        {/* Nadcházející schůzky z kalendáře */}
        {followUps.length > 0 && (
          <div className="rounded-xl p-3 border border-blue-700/50" style={{ background: "rgba(59,130,246,0.06)" }}>
            <h3 className="text-sm font-semibold text-blue-300 mb-2 flex items-center gap-2">
              <Bell size={14} className="text-blue-400" />
              Nadcházející schůzky ({followUps.length})
              <span className="ml-auto text-xs text-blue-400/70">příštích 7 dní</span>
            </h3>
            <div className="space-y-2">
              {followUps.slice(0, 6).map((e) => {
                const isToday = e.datum === new Date().toISOString().slice(0, 10);
                const dateFmt = isToday ? "Dnes" : new Date(e.datum).toLocaleDateString("cs-CZ", { weekday: "short", day: "numeric", month: "short" });
                return (
                  <div key={e.id} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-blue-900/20 border border-blue-800/30">
                    <div className="flex-shrink-0 text-center min-w-[42px]">
                      <div className={`font-bold ${isToday ? "text-blue-300" : "text-gray-400"}`}>{dateFmt}</div>
                      <div className="text-gray-500">{e.cas_od.slice(0, 5)}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-200 truncate">{e.popis || e.typ}</div>
                      {e.klient_jmeno && <div className="text-gray-500 truncate">👤 {e.klient_jmeno}</div>}
                    </div>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-800/40 text-blue-300 flex-shrink-0">
                      {e.cas_od.slice(0, 5)}–{e.cas_do.slice(0, 5)}
                    </span>
                  </div>
                );
              })}
              {followUps.length > 6 && (
                <div className="text-xs text-center text-gray-500">+{followUps.length - 6} dalších</div>
              )}
            </div>
          </div>
        )}

        {/* Interní poznámky */}
        {notes.length > 0 && (
          <div className="rounded-xl p-3 border border-purple-700/50" style={{ background: "rgba(139,92,246,0.06)" }}>
            <h3 className="text-sm font-semibold text-purple-300 mb-2 flex items-center gap-2">
              📝 Interní poznámky
              <span className="ml-auto text-xs text-purple-400/70">{notes.length} záznamů</span>
            </h3>
            <div className="space-y-2">
              {notes.slice(0, 5).map((n) => (
                <div key={n.id} className="text-xs p-2 rounded-lg bg-purple-900/20 border border-purple-800/30">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                      n.typ === "schuzka" ? "bg-blue-600/80 text-white" :
                      n.typ === "upozorneni" ? "bg-red-600/80 text-white" :
                      n.typ === "email" ? "bg-green-600/80 text-white" :
                      "bg-gray-600/80 text-white"
                    }`}>
                      {n.typ === "schuzka" ? "📅" : n.typ === "email" ? "📧" : n.typ === "upozorneni" ? "⚠️" : "ℹ️"} {n.typ}
                    </span>
                    <span className="text-gray-500 ml-auto">{new Date(n.created_at).toLocaleDateString("cs-CZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div className="font-medium text-gray-200">{n.nadpis}</div>
                  {n.obsah && <div className="text-gray-400 mt-0.5 line-clamp-2">{n.obsah}</div>}
                </div>
              ))}
              {notes.length > 5 && <div className="text-xs text-center text-gray-500">+{notes.length - 5} dalších</div>}
            </div>
          </div>
        )}

        {/* Týdenní kalendář */}
        <WeekCalendar refresh={calRefresh} />


      </div>

      {/* Pravý panel — Chat */}
      <div className={`${mobileTab === "chat" ? "flex" : "hidden"} md:flex flex-1 overflow-hidden flex-col`}>
        <ChatApp embedded scrollOnMount={mobileTab === "chat"} onCalendarUpdate={() => setCalRefresh(r => r + 1)} />
      </div>
      </div>
    </div>
  );
}
