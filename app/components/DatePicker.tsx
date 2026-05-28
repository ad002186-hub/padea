"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Mo","Tu","We","Th","Fr","Sa","Su"];

function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function parseYMD(s: string): Date | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2])-1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

function formatDisplay(ymd: string): string {
  const d = parseYMD(ymd);
  if (!d) return ymd;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function getGrid(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month+1, 0).getDate();
  const offset = first === 0 ? 6 : first - 1;
  const cells: (number | null)[] = Array(offset).fill(null);
  for (let i = 1; i <= days; i++) cells.push(i);
  while (cells.length % 7) cells.push(null);
  return cells;
}

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (v: string) => void;
  placeholder?: string;
  /** Full className for the trigger button — must include flex/layout classes */
  className?: string;
}

const DEFAULT_CLASS =
  "flex items-center justify-between gap-2 w-full rounded-xl border border-[#2a2d3e] bg-[#0f1117] text-sm px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40 hover:border-[#7c3aed]/60 transition-colors cursor-pointer";

export default function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState(value);
  const [viewYear, setViewYear] = useState(() => parseYMD(value)?.getFullYear() ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parseYMD(value)?.getMonth() ?? new Date().getMonth());
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setTyped(value); }, [value]);

  function handleOpen() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const PW = 288, PH = 370;
    let left = rect.left;
    if (left + PW > window.innerWidth - 8) left = window.innerWidth - PW - 8;
    if (left < 8) left = 8;
    const top = window.innerHeight - rect.bottom > PH + 8
      ? rect.bottom + 8
      : rect.top - PH - 8;
    setPos({ top, left });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !popupRef.current?.contains(e.target as Node)
      ) setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    function onScroll() { setOpen(false); }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { capture: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, { capture: true });
    };
  }, [open]);

  function selectDay(day: number) {
    const ymd = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    onChange(ymd);
    setTyped(ymd);
    setOpen(false);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); }
    else setViewMonth(m => m-1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); }
    else setViewMonth(m => m+1);
  }

  function handleTyped(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setTyped(v);
    const d = parseYMD(v);
    if (d) {
      onChange(v);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }

  const today = toYMD(new Date());
  const cells = getGrid(viewYear, viewMonth);

  const popup = open && mounted ? createPortal(
    <div
      ref={popupRef}
      style={{ position: "fixed", top: pos.top, left: pos.left, width: 288, zIndex: 99999 }}
      className="rounded-2xl border border-[#2a2d3e] bg-[#1e2235] p-4 shadow-2xl shadow-black/50"
    >
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-white/5 transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-white select-none">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button type="button" onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-white/5 transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-500 py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const ymd = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const isSel = ymd === value;
          const isTod = ymd === today;
          return (
            <button key={ymd} type="button" onClick={() => selectDay(day)}
              className={`w-full aspect-square flex items-center justify-center text-xs font-medium rounded-lg transition-colors ${
                isSel
                  ? "bg-[#7c3aed] text-white"
                  : isTod
                  ? "border border-[#7c3aed]/40 text-[#a78bfa] hover:bg-[#7c3aed]/10"
                  : "text-gray-300 hover:bg-white/5"
              }`}>
              {day}
            </button>
          );
        })}
      </div>

      {/* Manual text entry */}
      <div className="mt-3 pt-3 border-t border-[#2a2d3e]">
        <p className="text-xs text-gray-500 mb-1.5">Or type a date (YYYY-MM-DD)</p>
        <input
          type="text"
          value={typed}
          onChange={handleTyped}
          placeholder="YYYY-MM-DD"
          onClick={(e) => e.stopPropagation()}
          className="w-full rounded-lg border border-[#2a2d3e] bg-[#0f1117] text-white text-sm px-3 py-2 focus:outline-none focus:border-[#7c3aed] transition-colors placeholder:text-gray-600"
        />
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className={className ?? DEFAULT_CLASS}
      >
        <span className={value ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-gray-500"}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 dark:text-gray-500 shrink-0">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>
      {popup}
    </>
  );
}
