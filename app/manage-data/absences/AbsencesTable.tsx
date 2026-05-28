"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/app/components/ui/ConfirmModal";
import DatePicker from "@/app/components/DatePicker";

export type Absence = {
  student_id: string;
  session_id: string;
  date: string;
  studentName: string;
  schoolName: string;
};

function absenceKey(a: Absence) {
  return `${a.student_id}::${a.session_id}::${a.date}`;
}

const FI = "flex items-center justify-between rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-slate-50 dark:bg-[#0f1117] text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40 hover:border-[#7c3aed]/60 transition-colors cursor-pointer";

export default function AbsencesTable({
  absences: initial,
  schools,
}: {
  absences: Absence[];
  schools: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState(initial);
  const [nameFilter, setNameFilter] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<Absence | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setRows(initial); }, [initial]);

  const filtered = rows.filter(r => {
    if (nameFilter && !r.studentName.toLowerCase().includes(nameFilter.toLowerCase())) return false;
    if (schoolFilter && r.schoolName !== schoolFilter) return false;
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo && r.date > dateTo) return false;
    return true;
  });

  async function handleDelete(absence: Absence) {
    const key = absenceKey(absence);
    setError(null);
    setRows(prev => prev.filter(r => absenceKey(r) !== key));
    setDeleting(prev => new Set(prev).add(key));
    try {
      const res = await fetch(`/api/absences/${encodeURIComponent(key)}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Delete failed");
      startTransition(() => router.refresh());
    } catch (err) {
      setRows(initial);
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(prev => { const n = new Set(prev); n.delete(key); return n; });
    }
  }

  const hasFilters = nameFilter || schoolFilter || dateFrom || dateTo;

  return (
    <>
      {pendingDelete && (
        <ConfirmModal
          title="Delete Absence"
          message={`Delete absence for ${pendingDelete.studentName} on ${pendingDelete.date}? This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={() => { const a = pendingDelete; setPendingDelete(null); handleDelete(a); }}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          type="text"
          placeholder="Search student…"
          value={nameFilter}
          onChange={e => setNameFilter(e.target.value)}
          className="rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-slate-50 dark:bg-[#0f1117] text-slate-900 dark:text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40 focus:border-[#7c3aed] transition-colors min-w-44"
        />
        <div className="relative">
          <select
            value={schoolFilter}
            onChange={e => setSchoolFilter(e.target.value)}
            className="dark-select appearance-none rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-slate-50 dark:bg-[#0f1117] text-slate-900 dark:text-white text-sm px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40 hover:border-[#7c3aed]/60 transition-colors cursor-pointer"
          >
            <option value="">All schools</option>
            {schools.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#7c3aed]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </div>
        </div>
        <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="From date" className={FI} />
        <DatePicker value={dateTo} onChange={setDateTo} placeholder="To date" className={FI} />
        {hasFilters && (
          <button
            onClick={() => { setNameFilter(""); setSchoolFilter(""); setDateFrom(""); setDateTo(""); }}
            className="text-xs text-slate-400 dark:text-gray-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Clear filters
          </button>
        )}
        <span className="text-xs text-slate-400 dark:text-gray-500 ml-auto">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {error && <p className="text-sm text-[#ef4444] mb-3 px-1">{error}</p>}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] p-16 flex flex-col items-center justify-center gap-3">
          <p className="text-sm text-slate-400 dark:text-gray-500">
            {hasFilters ? "No absences match the current filters." : "No absences recorded yet."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-[#2a2d3e] bg-slate-50 dark:bg-white/[0.03]">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Student</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">School</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Date</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#2a2d3e]">
              {filtered.map(row => {
                const key = absenceKey(row);
                return (
                  <tr key={key} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-200">{row.studentName}</td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{row.schoolName}</td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 tabular-nums">{row.date}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setPendingDelete(row)}
                        disabled={deleting.has(key) || isPending}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-[#ef4444] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {deleting.has(key)
                          ? <span className="w-3.5 h-3.5 rounded-full border border-current border-t-transparent animate-spin" />
                          : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>}
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
