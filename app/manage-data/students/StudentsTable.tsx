"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/app/components/ui/ConfirmModal";

export type Student = {
  id: string;
  name: string;
  schoolId: string;
  schoolName: string;
  yearLevel: number | null;
  email: string | null;
  parentName: string | null;
  parentEmail: string | null;
  parentMobile: string | null;
  isActive: boolean;
  dietaryRestrictions: string[];
};

const DIETARY_OPTIONS = [
  "Halal", "Vegetarian", "Gluten Free", "Dairy Free", "Nut Free",
  "No Beef", "No Pork", "No Red Meat", "No Fish", "No Shellfish", "No Seafood",
];
const FI = "rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-slate-50 dark:bg-[#0f1117] text-slate-900 dark:text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40 focus:border-[#7c3aed] transition-colors";
const MI = "w-full rounded-xl border border-[#2a2d3e] bg-[#0f1117] text-white text-sm px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40 focus:border-[#7c3aed] transition-colors placeholder:text-gray-500";
const ML = "block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5";
const MS = `dark-select appearance-none ${MI} pr-10 cursor-pointer`;

export default function StudentsTable({ students: initial }: { students: Student[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [rows, setRows] = useState(initial);
  const [tab, setTab] = useState<"active" | "inactive">("active");
  const [nameFilter, setNameFilter] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editName, setEditName] = useState("");
  const [editYearLevel, setEditYearLevel] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editParentName, setEditParentName] = useState("");
  const [editParentEmail, setEditParentEmail] = useState("");
  const [editParentMobile, setEditParentMobile] = useState("");
  const [editDietary, setEditDietary] = useState<Set<string>>(new Set());
  const [confirmSave, setConfirmSave] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<{ student: Student; action: "deactivate" | "reactivate" } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setRows(initial); }, [initial]);

  const uniqueSchools = [...new Set(rows.map((r) => r.schoolName))].sort();

  const filtered = rows.filter((r) => {
    if (r.isActive !== (tab === "active")) return false;
    if (nameFilter && !r.name.toLowerCase().includes(nameFilter.toLowerCase())) return false;
    if (schoolFilter && r.schoolName !== schoolFilter) return false;
    return true;
  });

  function openEdit(s: Student) {
    setEditingStudent(s);
    setEditName(s.name);
    setEditYearLevel(s.yearLevel?.toString() ?? "");
    setEditEmail(s.email ?? "");
    setEditParentName(s.parentName ?? "");
    setEditParentEmail(s.parentEmail ?? "");
    setEditParentMobile(s.parentMobile ?? "");
    setEditDietary(new Set(s.dietaryRestrictions));
    setError(null);
  }

  function toggleEditDiet(opt: string) {
    setEditDietary((prev) => {
      const n = new Set(prev);
      n.has(opt) ? n.delete(opt) : n.add(opt);
      return n;
    });
  }

  async function handleSave() {
    if (!editingStudent) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/students/${editingStudent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          year_level: editYearLevel ? Number(editYearLevel) : null,
          email: editEmail.trim() || null,
          parent_name: editParentName.trim() || null,
          parent_email: editParentEmail.trim() || null,
          parent_mobile: editParentMobile.trim() || null,
          dietary_restrictions: Array.from(editDietary),
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Save failed");
      setEditingStudent(null);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(student: Student, isActive: boolean) {
    setError(null);
    setRows((prev) => prev.map((r) => r.id === student.id ? { ...r, isActive } : r));
    setPending((prev) => new Set(prev).add(student.id));
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: isActive }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed");
      startTransition(() => router.refresh());
    } catch (err) {
      setRows(initial);
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setPending((prev) => { const n = new Set(prev); n.delete(student.id); return n; });
    }
  }

  const activeCount = rows.filter((r) => r.isActive).length;
  const inactiveCount = rows.filter((r) => !r.isActive).length;

  return (
    <>
      {/* Edit modal */}
      {editingStudent && !confirmSave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingStudent(null)} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-[#2a2d3e] bg-[#1e2235] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-semibold text-white mb-5">Edit Student</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className={ML}>Full Name</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={MI} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={ML}>Year Level</label>
                  <div className="relative">
                    <select value={editYearLevel} onChange={(e) => setEditYearLevel(e.target.value)} className={MS}>
                      <option value="">—</option>
                      {[10, 11, 12].map((y) => <option key={y} value={y}>Year {y}</option>)}
                    </select>
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#7c3aed]">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                    </div>
                  </div>
                </div>
                <div>
                  <label className={ML}>Email</label>
                  <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className={MI} placeholder="Optional" />
                </div>
              </div>
              <div>
                <label className={ML}>Parent Name</label>
                <input type="text" value={editParentName} onChange={(e) => setEditParentName(e.target.value)} className={MI} placeholder="Optional" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={ML}>Parent Email</label>
                  <input type="email" value={editParentEmail} onChange={(e) => setEditParentEmail(e.target.value)} className={MI} placeholder="Optional" />
                </div>
                <div>
                  <label className={ML}>Parent Mobile</label>
                  <input type="tel" value={editParentMobile} onChange={(e) => setEditParentMobile(e.target.value)} className={MI} placeholder="Optional" />
                </div>
              </div>
              <div>
                <label className={ML}>Dietary Restrictions</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {DIETARY_OPTIONS.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editDietary.has(opt)} onChange={() => toggleEditDiet(opt)}
                        className="w-4 h-4 rounded accent-[#7c3aed]" />
                      <span className="text-sm text-slate-200">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            {error && <p className="text-sm text-[#ef4444] mt-3">{error}</p>}
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setEditingStudent(null)}
                className="px-4 py-2 rounded-lg border border-[#2a2d3e] text-sm text-slate-300 hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button onClick={() => setConfirmSave(true)} disabled={!editName.trim() || saving}
                className="px-4 py-2 rounded-lg bg-[#7c3aed] text-white text-sm font-semibold hover:bg-[#6d28d9] disabled:opacity-40 transition-colors">
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmSave && (
        <ConfirmModal title="Save Changes" message={`Save changes to ${editingStudent?.name}?`}
          confirmLabel={saving ? "Saving…" : "Save"}
          onConfirm={() => { setConfirmSave(false); handleSave(); }}
          onCancel={() => setConfirmSave(false)} />
      )}

      {confirmAction && (
        <ConfirmModal
          title={confirmAction.action === "deactivate" ? "Deactivate Student" : "Reactivate Student"}
          message={confirmAction.action === "deactivate"
            ? `Deactivate ${confirmAction.student.name}? They will be moved to the inactive list.`
            : `Reactivate ${confirmAction.student.name}? They will be moved back to the active list.`}
          confirmLabel={confirmAction.action === "deactivate" ? "Deactivate" : "Reactivate"}
          variant={confirmAction.action === "deactivate" ? "danger" : "primary"}
          onConfirm={() => {
            const { student, action } = confirmAction!;
            setConfirmAction(null);
            handleToggleActive(student, action === "reactivate");
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-[#2a2d3e] mb-5">
        {(["active", "inactive"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t ? "border-[#7c3aed] text-[#7c3aed]" : "border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
            }`}>
            {t === "active" ? `Active (${activeCount})` : `Inactive (${inactiveCount})`}
          </button>
        ))}
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input type="text" placeholder="Search by name…" value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} className={`${FI} min-w-48`} />
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
        <span className="text-xs text-slate-400 dark:text-gray-500 ml-auto">{filtered.length} student{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {error && <p className="text-sm text-[#ef4444] mb-3 px-1">{error}</p>}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] p-16 flex items-center justify-center">
          <p className="text-sm text-slate-400 dark:text-gray-500">No students found.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-[#2a2d3e] bg-slate-50 dark:bg-white/[0.03]">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">School</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Year</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Email</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#2a2d3e]">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-200">{row.name}</td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{row.schoolName}</td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{row.yearLevel ? `Yr ${row.yearLevel}` : "—"}</td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{row.email ?? "—"}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => openEdit(row)}
                        className="text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-[#7c3aed] transition-colors">
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmAction({ student: row, action: row.isActive ? "deactivate" : "reactivate" })}
                        disabled={pending.has(row.id)}
                        className={`text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                          row.isActive
                            ? "text-slate-400 dark:text-slate-500 hover:text-[#ef4444]"
                            : "text-slate-400 dark:text-slate-500 hover:text-[#10b981]"
                        }`}>
                        {pending.has(row.id)
                          ? <span className="w-3.5 h-3.5 rounded-full border border-current border-t-transparent animate-spin inline-block" />
                          : row.isActive ? "Deactivate" : "Reactivate"}
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
