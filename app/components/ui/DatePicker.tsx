"use client";

import { useState, useRef, useEffect } from "react";

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toYMD(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function parseYMD(s: string): Date | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

function getMonthGrid(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = firstDow === 0 ? 6 : firstDow - 1; // Mon = 0
  const cells: (number | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);
  return cells;
}

interface Props {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function DatePicker({ value, onChange, placeholder = "YYYY-MM-DD" }: Props) {
  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState(value);
  const [viewYear, setViewYear] = useState(() => {
    const d = parseYMD(value);
    return d ? d.getFullYear() : new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const d = parseYMD(value);
    return d ? d.getMonth() : new Date().getMonth();
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputText(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInputText(val);
    const parsed = parseYMD(val);
    if (parsed) {
      onChange(val);
      setViewYear(parsed.getFullYear());
      setViewMonth(parsed.getMonth());
    }
  }

  function handleInputBlur() {
    if (!parseYMD(inputText)) setInputText(value);
  }

  function selectDay(day: number) {
    const ymd = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setInputText(ymd);
    onChange(ymd);
    setOpen(false);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const today = toYMD(new Date());
  const cells = getMonthGrid(viewYear, viewMonth);

  return (
    <div ref={containerRef} className="relative">
      {/* Input row */}
      <div className="relative flex items-center">
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/50 text-slate-900 dark:text-white text-sm px-4 py-3 pr-11 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40 focus:border-[#7c3aed] transition-colors placeholder:text-slate-400 dark:placeholder:text-gray-500"
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="absolute right-3 text-slate-400 dark:text-gray-500 hover:text-[#7c3aed] dark:hover:text-[#a78bfa] transition-colors"
          aria-label="Open calendar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>
      </div>

      {/* Calendar popover */}
      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 w-72 rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-[#1e2235] shadow-xl shadow-black/20 p-4">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700/50 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-slate-900 dark:text-white select-none">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700/50 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-slate-400 dark:text-gray-500 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />;
              const ymd = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isSelected = ymd === value;
              const isToday = ymd === today;
              return (
                <button
                  key={ymd}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`
                    w-full aspect-square flex items-center justify-center text-xs font-medium rounded-lg transition-colors
                    ${isSelected
                      ? "bg-[#7c3aed] text-white"
                      : isToday
                      ? "border border-[#7c3aed]/40 text-[#7c3aed] dark:text-[#a78bfa] hover:bg-violet-50 dark:hover:bg-[#7c3aed]/10"
                      : "text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700/50"
                    }
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
