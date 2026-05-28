"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/app/components/ui/ConfirmModal";

export type Exclusion = {
  id: string;
  date: string;
  schoolName: string;
  cancelledYearLevels: number[] | null;
  reason: string | null;
};

const FI = "rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-slate-50 dark:bg-[#0f1117] text-slate-900 dark:text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40 focus:border-[#7c3aed] transition-colors";
const MI = "w-full rounded-xl border border-[#2a2d3e] bg-[#0f1117] text-white text-sm px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40 focus:border-[#7c3aed] transition-colors placeholder:text-gray-500";
const ML = "block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5";

export default function ExclusionsTable({ exclusions: initial }: { exclusions: Exclusion[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState(initial);
  const [schoolFilter, setSchoolFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [editingEx, setEditingEx] = useState<Exclusion | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editScope, setEditScope] = useState<"all" | "specific">("all");
  const [editYearLevels, setEditYearLevels] = useState<Set<number>>(new Set());
  const [editReason, setEditReason] = useState("");
  const [confirmSave, setConfirmSave] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<Exclusion | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setRows(initial); }, [initial]);

  const uniqueSchools = [...new Set(rows.map((r) => r.schoolName))].sort();

  const filtered = rows.filter((r) => {
    if (schoolFilter && r.schoolName !== schoolFilter) return false;
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo && r.date > dateTo) return false;
    return true;
  });

  function openEdit(ex: Exclusion) {
    setEditingEx(ex);
    setEditDate(ex.date);
    setEditScope(ex.cancelledYearLevels ? "specific" : "all");
    setEditYearLevels(new Set(ex.cancelledYearLevels ?? []));
    setEditReason(ex.reason ?? "");
    setError(null);
  }

  function toggleEditYear(y: number) {
    setEditYearLevels((prev) => {
      const n = new Set(prev);
      n.has(y) ? n.delete(y) : n.add(y);
      return n;
    });
  }

  async function handleSave() {
    if (!editingEx) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/exclusions/${editingEx.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: editDate,
          reason: editReason.trim() || null,
          cancelled_year_levels: editScope === "specific" ? Array.from(editYearLevels).sort() : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Save failed");
      setEditingEx(null);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(ex: Exclusion) {
    setError(null);
    setRows((prev) => prev.filter((r) => r.id !== ex.id));
    setDeleting((prev) => new Set(prev).add(ex.id));
    try {
      const res = await fetch(`/api/exclusions/${ex.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Delete failed");
      startTransition(() => router.refresh());
    } catch (err) {
      setRows(initial);
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting((prev) => { const n = new Set(prev); n.delete(ex.id); return n; });
    }
  }

  return (
    <>
      {/* Edit modal */}
      {editingEx && !confirmSave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingEx(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#2a2d3e] bg-[#1e2235] p-6 shadow-2xl">
            <h2 className="text-base font-semibold text-white mb-5">Edit Exclusion</h2>

            <div className="flex flex-col gap-5">
              <div>
                <label className={ML}>Date</label>
                <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className={MI} />
              </div>

              <div>
                <label className={ML}>Cancellation Scope</label>
                <div className="flex rounded-xl overflow-hidden border border-[#2a2d3e]">
                  {(["all", "specific"] as const).map((s) => (
                    <button key={s} type="button" onClick={() => setEditScope(s)}
                      className={`flex-1 py-2.5 text-sm font-medium transition-colors ${editScope === s ? "bg-[#7c3aed] text-white" : "bg-[#0f1117] text-gray-400 hover:text-white"}`}>
                      {s === "all" ? "All year levels" : "Specific"}
                    </button>
                  ))}
                </div>
                {editScope === "specific" && (
                  <div className="flex gap-5 mt-3 pl-1">
                    {[10, 11, 12].map((y) => (
                      <label key={y} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={editYearLevels.has(y)} onChange={() => toggleEditYear(y)}
                          className="w-4 h-4 rounded accent-[#7c3aed]" />
                        <span className="text-sm text-slate-200">Year {y}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className={ML}>Reason</label>
                <input type="text" value={editReason} onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Optional" className={MI} />
              </div>
            </div>

            {error && <p className="text-sm text-[#ef4444] mt-3">{error}</p>}

            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setEditingEx(null)}
                className="px-4 py-2 rounded-lg border border-[#2a2d3e] text-sm text-slate-300 hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button onClick={() => setConfirmSave(true)} disabled={!editDate || saving}
                className="px-4 py-2 rounded-lg bg-[#7c3aed] text-white text-sm font-semibold hover:bg-[#6d28d9] disabled:opacity-40 transition-colors">
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmSave && (
        <ConfirmModal
          title="Save Changes"
          message="Save changes to this exclusion?"
          confirmLabel={saving ? "Saving…" : "Save"}
          onConfirm={() => { setConfirmSave(false); handleSave(); }}
          onCancel={() => setConfirmSave(false)}
        />
      )}

      {pendingDelete && (
        <ConfirmModal
          title="Delete Exclusion"
          message={`Delete exclusion for ${pendingDelete.schoolName} on ${pendingDelete.date}? This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={() => { const e = pendingDelete; setPendingDelete(null); handleDelete(e); }}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative">
          <select value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)}
            className={`dark-select appearance-none ${FI} pr-8 cursor-pointer`}>
            <option value="">All schools</option>
            {uniqueSchools.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#7c3aed]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </div>
        </div>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className={FI} title="From date" />
        <span className="text-slate-400 dark:text-gray-500 text-sm">to</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className={FI} title="To date" />
        {(schoolFilter || dateFrom || dateTo) && (
          <button onClick={() => { setSchoolFilter(""); setDateFrom(""); setDateTo(""); }}
            className="text-xs text-slate-400 dark:text-gray-500 hover:text-slate-900 dark:hover:text-white transition-colors">
            Clear filters
          </button>
        )}
        <span className="text-xs text-slate-400 dark:text-gray-500 ml-auto">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {error && <p className="text-sm text-[#ef4444] mb-3 px-1">{error}</p>}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] p-16 flex items-center justify-center">
          <p className="text-sm text-slate-400 dark:text-gray-500">No exclusions match the current filters.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-[#2a2d3e] bg-slate-50 dark:bg-white/[0.03]">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Date</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">School</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Year Levels</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Reason</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#2a2d3e]">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3.5 text-slate-800 dark:text-slate-200 tabular-nums">{row.date}</td>
                  <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-200">{row.schoolName}</td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                    {row.cancelledYearLevels?.length
                      ? row.cancelledYearLevels.map((y) => `Yr ${y}`).join(", ")
                      : <span className="text-amber-600 dark:text-amber-400 font-medium">All</span>}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{row.reason ?? "—"}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => openEdit(row)}
                        className="text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-[#7c3aed] transition-colors">
                        Edit
                      </button>
                      <button onClick={() => setPendingDelete(row)} disabled={deleting.has(row.id) || isPending}
                        className="text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-[#ef4444] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        {deleting.has(row.id)
                          ? <span className="w-3.5 h-3.5 rounded-full border border-current border-t-transparent animate-spin inline-block" />
                          : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
