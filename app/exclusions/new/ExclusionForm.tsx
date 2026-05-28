"use client";

import { useState } from "react";
import DatePicker from "@/app/components/DatePicker";
import ConfirmModal from "@/app/components/ui/ConfirmModal";

const I = "w-full rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-slate-50 dark:bg-[#0f1117] text-slate-900 dark:text-white text-sm px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40 focus:border-[#7c3aed] transition-colors placeholder:text-slate-400 dark:placeholder:text-gray-500";
const S = `dark-select appearance-none ${I} pr-10 cursor-pointer`;
const L = "block text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2.5";

function Chevron() {
  return (
    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#7c3aed]">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

type School = { id: string; name: string };

export default function ExclusionForm({ schools }: { schools: School[] }) {
  const [schoolId, setSchoolId] = useState("");
  const [date, setDate] = useState("");
  const [scope, setScope] = useState<"all" | "specific">("all");
  const [yearLevels, setYearLevels] = useState<Set<number>>(new Set());
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schoolName = schools.find((s) => s.id === schoolId)?.name ?? "";
  const dayOfWeek = date
    ? new Date(date + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" })
    : "";

  function toggleYear(y: number) {
    setYearLevels((prev) => {
      const next = new Set(prev);
      next.has(y) ? next.delete(y) : next.add(y);
      return next;
    });
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/exclusions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_id: schoolId,
          date,
          cancelled_year_levels: scope === "specific" ? Array.from(yearLevels).sort() : null,
          reason: reason.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to log exclusion");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log exclusion");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setSuccess(false);
    setSchoolId("");
    setDate("");
    setScope("all");
    setYearLevels(new Set());
    setReason("");
    setError(null);
  }

  const canSubmit = !!schoolId && !!date && (scope === "all" || yearLevels.size > 0) && !submitting;

  if (success) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] p-10 flex flex-col items-center text-center gap-5">
        <div className="w-14 h-14 rounded-full bg-[#10b981]/10 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Exclusion logged</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{schoolName} — {date}</p>
        </div>
        <button onClick={reset} className="mt-1 px-6 py-2.5 rounded-xl bg-[#7c3aed] text-white text-sm font-semibold hover:bg-[#6d28d9] transition-colors">
          Log another
        </button>
      </div>
    );
  }

  return (
    <>
      {showConfirm && (
        <ConfirmModal
          title="Log Exclusion"
          message={`Log exclusion for ${schoolName} on ${date}${dayOfWeek ? ` (${dayOfWeek})` : ""}? This cannot be undone.`}
          confirmLabel="Log exclusion"
          onConfirm={() => { setShowConfirm(false); submit(); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
      <div className="flex flex-col gap-5">
        <div className="rounded-2xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] p-7 flex flex-col gap-6">
          <div>
            <label className={L}>School</label>
            <div className="relative">
              <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className={S}>
                <option value="">Select a school…</option>
                {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <Chevron />
            </div>
          </div>

          <div>
            <label className={L}>Exclusion Date</label>
            <DatePicker
              value={date}
              onChange={setDate}
              placeholder="Select exclusion date"
              className="flex items-center justify-between w-full rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-slate-50 dark:bg-[#0f1117] text-sm px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40 focus:border-[#7c3aed] transition-colors cursor-pointer"
            />
            {dayOfWeek && (
              <p className="mt-2 text-xs text-[#7c3aed] font-medium">Affects the {dayOfWeek} session</p>
            )}
          </div>

          <div>
            <label className={L}>Cancellation Scope</label>
            <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-[#2a2d3e]">
              {(["all", "specific"] as const).map((s) => (
                <button key={s} type="button" onClick={() => setScope(s)}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                    scope === s
                      ? "bg-[#7c3aed] text-white"
                      : "bg-slate-50 dark:bg-[#0f1117] text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
                  }`}>
                  {s === "all" ? "All year levels" : "Specific year levels"}
                </button>
              ))}
            </div>
            {scope === "specific" && (
              <div className="flex gap-6 mt-4 pl-1">
                {[10, 11, 12].map((y) => (
                  <label key={y} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={yearLevels.has(y)} onChange={() => toggleYear(y)}
                      className="w-4 h-4 rounded accent-[#7c3aed] cursor-pointer" />
                    <span className="text-sm text-slate-800 dark:text-slate-200">Year {y}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className={L}>Reason <span className="text-slate-400 dark:text-gray-500 normal-case font-normal">(optional)</span></label>
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Public holiday" className={I} />
          </div>
        </div>

        {error && <p className="text-sm text-[#ef4444] px-1">{error}</p>}

        <button type="button" onClick={() => setShowConfirm(true)} disabled={!canSubmit}
          className="w-full py-3.5 rounded-xl text-sm font-semibold bg-[#7c3aed] text-white hover:bg-[#6d28d9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          {submitting ? "Logging…" : "Log exclusion"}
        </button>
      </div>
    </>
  );
}
