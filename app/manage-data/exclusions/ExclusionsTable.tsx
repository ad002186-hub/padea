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

export default function ExclusionsTable({ exclusions: initial }: { exclusions: Exclusion[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState(initial);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<Exclusion | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setRows(initial); }, [initial]);

  async function handleDelete(ex: Exclusion) {
    setError(null);
    setRows((prev) => prev.filter((r) => r.id !== ex.id));
    setDeleting((prev) => new Set(prev).add(ex.id));
    try {
      const res = await fetch(`/api/exclusions/${ex.id}`, { method: "DELETE" });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? "Delete failed"); }
      startTransition(() => router.refresh());
    } catch (err) {
      setRows(initial);
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting((prev) => { const n = new Set(prev); n.delete(ex.id); return n; });
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] p-16 flex flex-col items-center gap-3">
        <p className="text-sm text-slate-400 dark:text-gray-500">No exclusions recorded yet.</p>
      </div>
    );
  }

  return (
    <>
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
      <div className="flex flex-col gap-3">
        {error && <p className="text-sm text-[#ef4444] px-1">{error}</p>}
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
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3.5 text-slate-800 dark:text-slate-200 tabular-nums">{row.date}</td>
                  <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-200">{row.schoolName}</td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                    {row.cancelledYearLevels?.length
                      ? row.cancelledYearLevels.map((y) => `Year ${y}`).join(", ")
                      : <span className="text-amber-600 dark:text-amber-400 font-medium">All</span>}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{row.reason ?? "—"}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button onClick={() => setPendingDelete(row)} disabled={deleting.has(row.id) || isPending}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-[#ef4444] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      {deleting.has(row.id)
                        ? <span className="w-3.5 h-3.5 rounded-full border border-current border-t-transparent animate-spin" />
                        : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>}
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
