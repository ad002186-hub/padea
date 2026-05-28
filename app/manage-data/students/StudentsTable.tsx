"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/app/components/ui/ConfirmModal";

export type Student = {
  id: string;
  name: string;
  schoolName: string;
  yearLevel: number | null;
  email: string | null;
  isActive: boolean;
};

export default function StudentsTable({ students: initial }: { students: Student[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState(initial);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [pendingDeactivate, setPendingDeactivate] = useState<Student | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setRows(initial); }, [initial]);

  async function handleDeactivate(student: Student) {
    setError(null);
    setRows((prev) => prev.map((r) => r.id === student.id ? { ...r, isActive: false } : r));
    setPending((prev) => new Set(prev).add(student.id));
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: false }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? "Failed"); }
      startTransition(() => router.refresh());
    } catch (err) {
      setRows(initial);
      setError(err instanceof Error ? err.message : "Failed to deactivate");
    } finally {
      setPending((prev) => { const n = new Set(prev); n.delete(student.id); return n; });
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] p-16 flex items-center justify-center">
        <p className="text-sm text-slate-400 dark:text-gray-500">No students found.</p>
      </div>
    );
  }

  return (
    <>
      {pendingDeactivate && (
        <ConfirmModal
          title="Deactivate Student"
          message={`Deactivate ${pendingDeactivate.name}? They will no longer appear in active student lists.`}
          confirmLabel="Deactivate"
          variant="danger"
          onConfirm={() => { const s = pendingDeactivate; setPendingDeactivate(null); handleDeactivate(s); }}
          onCancel={() => setPendingDeactivate(null)}
        />
      )}
      <div className="flex flex-col gap-3">
        {error && <p className="text-sm text-[#ef4444] px-1">{error}</p>}
        <div className="rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-[#2a2d3e] bg-slate-50 dark:bg-white/[0.03]">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">School</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Year</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Email</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#2a2d3e]">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-200">{row.name}</td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{row.schoolName}</td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{row.yearLevel ? `Year ${row.yearLevel}` : "—"}</td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{row.email ?? "—"}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${row.isActive ? "bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20" : "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-[#2a2d3e]"}`}>
                      {row.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {row.isActive && (
                      <button onClick={() => setPendingDeactivate(row)} disabled={pending.has(row.id) || isPending}
                        className="text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-[#ef4444] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        {pending.has(row.id) ? <span className="w-3.5 h-3.5 rounded-full border border-current border-t-transparent animate-spin inline-block" /> : "Deactivate"}
                      </button>
                    )}
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
