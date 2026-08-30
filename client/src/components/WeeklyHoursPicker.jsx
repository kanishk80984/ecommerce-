import React, { useState, useEffect } from "react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));

function parseTime(str) {
  if (!str) return { h: "09", m: "00", p: "AM" };
  const match = str.match(/^(\d{1,2}):(\d{0,2})\s*(AM|PM)$/i);
  if (!match) return { h: "09", m: "00", p: "AM" };
  return { h: String(parseInt(match[1])).padStart(2, "0"), m: match[2], p: match[3].toUpperCase() };
}

function formatTime(t) {
  const mStr = t.m !== undefined && t.m !== null ? t.m : "00";
  return `${t.h}:${mStr} ${t.p}`;
}

function parseWeeklyHours(str) {
  const def = {};
  DAYS.forEach(d => { def[d] = { status: "open", open: "09:00 AM", close: "06:00 PM" }; });
  if (!str) return def;
  if (str.includes("|")) {
    const result = { ...def };
    str.split("|").forEach(part => {
      part = part.trim();
      const ci = part.indexOf(":");
      if (ci === -1) return;
      const dk = part.substring(0, ci).trim().toLowerCase();
      const val = part.substring(ci + 1).trim();
      const md = DAYS.find(d => d.toLowerCase().startsWith(dk.substring(0, 3)));
      if (!md) return;
      if (val.toLowerCase() === "closed") result[md] = { status: "closed", open: "09:00 AM", close: "06:00 PM" };
      else if (val.toLowerCase() === "open 24 hours") result[md] = { status: "open24", open: "12:00 AM", close: "11:30 PM" };
      else { const di = val.indexOf(" - "); if (di !== -1) result[md] = { status: "open", open: val.substring(0, di).trim(), close: val.substring(di + 3).trim() }; }
    });
    return result;
  }
  const di = str.indexOf(" - ");
  if (di !== -1) { const o = str.substring(0, di).trim(), c = str.substring(di + 3).trim(); const r = {}; DAYS.forEach(d => { r[d] = { status: "open", open: o, close: c }; }); return r; }
  return def;
}

function serializeWeeklyHours(schedule) {
  const formatRawTime = (timeStr) => {
    const t = parseTime(timeStr);
    const mStr = t.m !== undefined && t.m !== null ? t.m : "00";
    return `${t.h}:${mStr} ${t.p}`;
  };

  return DAYS.map(day => {
    const d = schedule[day];
    if (!d || d.status === "closed") return `${day.substring(0, 3)}: Closed`;
    if (d.status === "open24") return `${day.substring(0, 3)}: Open 24 hours`;
    return `${day.substring(0, 3)}: ${formatRawTime(d.open)} - ${formatRawTime(d.close)}`;
  }).join(" | ");
}

const TimeEditor = ({ value, onChange }) => {
  const t = parseTime(value);
  return (
    <div className="flex flex-1 items-center bg-white border border-gray-200 rounded-md px-2.5 py-1.5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-100 transition-all">
      <svg className="w-3.5 h-3.5 text-gray-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <select 
        value={t.h} 
        onChange={e => onChange(formatTime({ ...t, h: e.target.value }))} 
        className="bg-transparent border-0 outline-none text-xs font-semibold text-gray-700 cursor-pointer p-0 appearance-none text-center hover:text-blue-600 transition-colors"
      >
        {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
      <span className="text-gray-400 text-xs font-bold mx-1">:</span>
      <input
        type="text" value={t.m} maxLength={2} placeholder="00"
        onChange={e => { const raw = e.target.value.replace(/\D/g, "").slice(0, 2); onChange(formatTime({ ...t, m: raw })); }}
        onBlur={e => { const num = parseInt(e.target.value); onChange(formatTime({ ...t, m: isNaN(num) ? "00" : String(Math.min(59, Math.max(0, num))).padStart(2, "0") })); }}
        className="w-[18px] bg-transparent border-0 outline-none text-xs font-semibold text-gray-700 text-center p-0"
      />
      <div className="relative ml-2 flex items-center">
        <select
          value={t.p}
          onChange={e => onChange(formatTime({ ...t, p: e.target.value }))}
          className="bg-transparent border-0 outline-none text-xs font-bold text-blue-600 cursor-pointer p-0 pr-3 appearance-none hover:text-blue-700 transition-colors"
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
        <svg className="w-2.5 h-2.5 text-blue-600 absolute right-0 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
};

const DayCard = ({ day, d, onStatus, onTime }) => {
  const isClosed = d.status === "closed";
  const isOpen24 = d.status === "open24";

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col gap-3.5 transition-all hover:shadow-md">
      {/* Top Header Row */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50/70 text-blue-600 flex items-center justify-center font-bold text-[11px] uppercase tracking-wider">
            {day.substring(0, 3)}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold text-gray-900 leading-none">{day}</span>
            <div className="inline-flex rounded-md overflow-hidden bg-gray-50 border border-gray-100 p-0.5">
              {[["open","Hrs"],["open24","24h"],["closed","Off"]].map(([s, label]) => (
                <button 
                  key={s} type="button" onClick={() => onStatus(s)}
                  className={`text-[9px] font-bold px-2.5 py-0.5 rounded-sm transition-all ${d.status === s ? "bg-blue-600 text-white shadow-sm" : "text-gray-400 hover:text-gray-700"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Active Toggle Switch */}
        <button
          type="button"
          onClick={() => onStatus(isClosed ? "open" : "closed")}
          className={`relative inline-flex h-[20px] w-[36px] items-center rounded-full transition-colors focus:outline-none ${!isClosed ? 'bg-[#10b981]' : 'bg-gray-200'}`}
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${!isClosed ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
        </button>
      </div>
      
      {/* Time Picker Row */}
      <div className="flex items-center gap-2 w-full mt-0.5">
        {isClosed ? (
           <span className="flex-1 text-[11px] font-semibold text-gray-500 bg-gray-50 px-2 py-2 rounded-lg text-center border border-gray-100">Closed</span>
        ) : isOpen24 ? (
           <span className="flex-1 text-[11px] font-semibold text-[#10b981] bg-[#10b981]/10 px-2 py-2 rounded-lg text-center border border-[#10b981]/20">Open 24 Hours</span>
        ) : (
          <>
            <TimeEditor value={d.open} onChange={v => onTime("open", v)} />
            <span className="text-gray-300 font-medium text-xs">—</span>
            <TimeEditor value={d.close} onChange={v => onTime("close", v)} />
          </>
        )}
      </div>
    </div>
  );
};

const WeeklyHoursPicker = ({ value, onChange }) => {
  const [schedule, setSchedule] = useState(() => parseWeeklyHours(value));
  useEffect(() => { if (value) setSchedule(parseWeeklyHours(value)); }, [value]);

  const update = ns => { setSchedule(ns); onChange(serializeWeeklyHours(ns)); };
  const setStatus = (day, s) => update({ ...schedule, [day]: { ...schedule[day], status: s } });
  const setTime = (day, f, v) => update({ ...schedule, [day]: { ...schedule[day], [f]: v } });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {DAYS.map((day) => (
        <DayCard 
          key={day} 
          day={day} 
          d={schedule[day] || { status: "open", open: "09:00 AM", close: "06:00 PM" }} 
          onStatus={s => setStatus(day, s)} 
          onTime={(f, v) => setTime(day, f, v)} 
        />
      ))}
      
      {/* Business Hours Active Banner */}
      <div className="lg:col-span-2 bg-[#F0FDF4] border border-[#DCFCE7] rounded-xl p-4 flex items-center gap-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="w-10 h-10 rounded-full bg-[#DCFCE7] flex items-center justify-center text-[#15803d] flex-shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex flex-col gap-0.5">
          <h4 className="text-[13px] font-bold text-[#14532d]">Business Hours Active</h4>
          <p className="text-[11px] text-[#166534] opacity-90">Your business will be visible to customers during these hours</p>
        </div>
      </div>
    </div>
  );
};

export default WeeklyHoursPicker;
