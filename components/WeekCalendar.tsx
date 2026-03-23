"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, RefreshCw } from "lucide-react";

type Event = {
  id: number;
  datum: string;
  cas_od: string;
  cas_do: string;
  typ: string;
  popis: string;
  klient_jmeno: string | null;
  obsazeno: boolean;
};

const TYP_COLORS: Record<string, string> = {
  gcal:           "bg-red-600/70 border-red-400 text-white",
  schůzka:        "bg-blue-600/80 border-blue-400 text-white",
  prohlídka:      "bg-emerald-600/80 border-emerald-400 text-white",
  posilovna:      "bg-orange-600/80 border-orange-400 text-white",
  blokováno:      "bg-gray-600/60 border-gray-500 text-gray-300",
  administrativa: "bg-purple-600/70 border-purple-400 text-white",
  školení:        "bg-yellow-600/70 border-yellow-400 text-white",
  pracovní:       "bg-gray-700/50 border-gray-600 text-gray-400",
};

const DAYS_CZ = ["Po", "Út", "St", "Čt", "Pá"];
const HOUR_START = 7;
const HOUR_END = 20;
const SLOT_HEIGHT = 40; // px na hodinu

function getMondayOfWeek(offset: number): Date {
  const today = new Date();
  // Použij lokální datum
  const localDay = today.getDay(); // 0=Ne, 1=Po, ..., 6=So
  const diff = localDay === 0 ? -6 : 1 - localDay;
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diff + offset * 7);
  return monday;
}

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function isToday(s: string) { return s === toISO(new Date()); }
function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export default function WeekCalendar({ refresh }: { refresh?: number }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [events, setEvents] = useState<Event[]>([]);

  const loadEvents = useCallback(() => {
    const monday = getMondayOfWeek(weekOffset);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    // Pouze Google Calendar
    fetch(`/api/gcal?from=${toISO(monday)}&to=${toISO(friday)}`)
      .then(r => r.json()).then(setEvents).catch(() => {});
  }, [weekOffset, refresh]);

  useEffect(() => {
    loadEvents();
    const interval = setInterval(loadEvents, 30000);
    return () => clearInterval(interval);
  }, [loadEvents]);

  const monday = getMondayOfWeek(weekOffset);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toISO(d);
  });

  const byDay: Record<string, Event[]> = {};
  events.forEach(e => {
    if (!byDay[e.datum]) byDay[e.datum] = [];
    byDay[e.datum].push(e);
  });

  const gcalUrl = `https://calendar.google.com/calendar/r/week/${monday.getFullYear()}/${monday.getMonth() + 1}/${monday.getDate()}`;
  const weekLabel = weekOffset === 0 ? "Tento týden" : weekOffset === 1 ? "Příští týden" : weekOffset === -1 ? "Minulý týden" : `${monday.getDate()}.${monday.getMonth()+1} – ${friday.getDate()}.${friday.getMonth()+1}`;
  const totalHeight = (HOUR_END - HOUR_START) * SLOT_HEIGHT;

  return (
    <div className="rounded-xl border border-gray-700/50 overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
      {/* Header */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-700/50">
        <button onClick={() => setWeekOffset(w => w - 1)} className="p-1 hover:bg-gray-700 rounded transition-colors">
          <ChevronLeft size={13} className="text-gray-400" />
        </button>
        <span className="text-xs font-semibold text-gray-300 flex-1 text-center">{weekLabel}</span>
        <button onClick={() => setWeekOffset(w => w + 1)} className="p-1 hover:bg-gray-700 rounded transition-colors">
          <ChevronRight size={13} className="text-gray-400" />
        </button>
        <a href={gcalUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 ml-1 border border-blue-800/50 rounded px-2 py-0.5 transition-colors">
          <ExternalLink size={10} /> Otevřít
        </a>
        <button onClick={loadEvents} className="p-1 hover:bg-gray-700 rounded transition-colors ml-1" title="Obnovit">
          <RefreshCw size={11} className="text-gray-400" />
        </button>
      </div>

      {/* Hlavičky dní */}
      <div className="flex border-b border-gray-700/50">
        <div className="w-8 flex-shrink-0" /> {/* prostor pro hodiny */}
        {days.map((date, di) => (
          <div key={date} className={`flex-1 text-center py-1 border-r border-gray-700/30 last:border-r-0 ${isToday(date) ? "bg-blue-600/15" : ""}`}>
            <div className="text-xs font-semibold text-gray-300">{DAYS_CZ[di]}</div>
            <div className={`text-xs ${isToday(date) ? "text-blue-400 font-bold" : "text-gray-500"}`}>
              {new Date(date).getDate()}.{new Date(date).getMonth()+1}.
            </div>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div>
        <div className="flex" style={{ height: totalHeight }}>
          {/* Hodiny */}
          <div className="w-8 flex-shrink-0 relative">
            {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
              <div key={i} className="absolute text-right pr-1" style={{ top: i * SLOT_HEIGHT - 6, right: 0, width: "100%" }}>
                <span className="text-xs text-gray-600">{HOUR_START + i}</span>
              </div>
            ))}
          </div>

          {/* Dny */}
          {days.map((date) => (
            <div key={date} className={`flex-1 relative border-r border-gray-700/30 last:border-r-0 ${isToday(date) ? "bg-blue-950/10" : ""}`}>
              {/* Hodinové linky */}
              {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                <div key={i} className="absolute w-full border-t border-gray-800/60" style={{ top: i * SLOT_HEIGHT }} />
              ))}
              {/* Půlhodinové linky */}
              {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                <div key={`h${i}`} className="absolute w-full border-t border-gray-800/30" style={{ top: i * SLOT_HEIGHT + SLOT_HEIGHT / 2 }} />
              ))}

              {/* Události */}
              {(byDay[date] || []).filter(e => e.obsazeno).map((ev, i) => {
                const startMin = timeToMinutes(ev.cas_od);
                const endMin = timeToMinutes(ev.cas_do);
                const top = (startMin - HOUR_START * 60) / 60 * SLOT_HEIGHT;
                const height = Math.max((endMin - startMin) / 60 * SLOT_HEIGHT - 2, 16);
                const colorClass = TYP_COLORS[ev.typ] || "bg-gray-700 border-gray-600 text-gray-300";
                return (
                  <div key={i}
                    className={`absolute left-0.5 right-0.5 rounded border-l-2 px-1 overflow-hidden bg-emerald-600/70 border-emerald-400 text-white`}
                    style={{ top, height }}>
                    <div className="text-xs font-medium leading-tight truncate" style={{ fontSize: "10px" }}>
                      {ev.cas_od?.slice(0,5)} {ev.popis || ev.klient_jmeno || ev.typ}
                    </div>
                  </div>
                );
              })}

              {/* Aktuální čas */}
              {isToday(date) && (() => {
                const now = new Date();
                const nowMin = now.getHours() * 60 + now.getMinutes();
                const top = (nowMin - HOUR_START * 60) / 60 * SLOT_HEIGHT;
                if (top < 0 || top > totalHeight) return null;
                return <div className="absolute left-0 right-0 border-t-2 border-red-500 z-10" style={{ top }}>
                  <div className="w-2 h-2 rounded-full bg-red-500 -mt-1 -ml-1" />
                </div>;
              })()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
