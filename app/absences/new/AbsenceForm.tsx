"use client";

import { useState } from "react";
import DatePicker from "@/app/components/ui/DatePicker";
import ConfirmModal from "@/app/components/ui/ConfirmModal";

type School = { id: string; name: string };
type Student = {
  ssId: string;
  student_id: string;
  session_id: string;
  name: string;
};

const darkInputClass =
  "w-full rounded-xl border border-[#2a2d3e] bg-[#0f1117] text-white text-sm px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40 focus:border-[#7c3aed] transition-colors placeholder:text-gray-500";

const darkInputWithIconClass =
  "w-full rounded-xl border border-[#2a2d3e] bg-[#0f1117] text-white text-sm px-4 py-3 pr-11 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40 focus:border-[#7c3aed] transition-colors placeholder:text-gray-500";

export default function AbsenceForm({ schools }: { schools: School[] }) {
  const [schoolId, setSchoolId] = useState("");
  const [date, setDate] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [submittedDate, setSubmittedDate] = useState("");
  const [success, setSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const schoolName = schools.find((s) => s.id === schoolId)?.name ?? "";

  async function handleSchoolChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setSchoolId(id);
    setStudents([]);
    setSelected(new Set());
    setFetchError(null);
    if (!id) return;

    setFetching(true);
    try {
      const res = await fetch(`/api/students?school_id=${encodeURIComponent(id)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load students");
      setStudents(json.students);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load students");
    } finally {
      setFetching(false);
    }
  }

  function toggle(ssId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(ssId) ? next.delete(ssId) : next.add(ssId);
      return next;
    });
  }

  function toggleAll() {
    setSelected(
      selected.size === students.length
        ? new Set()
        : new Set(students.map((s) => s.ssId))
    );
  }

  async function submitAbsences() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const absences = students
        .filter((s) => selected.has(s.ssId))
        .map((s) => ({ student_id: s.student_id, session_id: s.session_id, date }));

      const res = await fetch("/api/absences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ absences }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to log absences");

      setSubmittedCount(absences.length);
      setSubmittedDate(date);
      setSuccess(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to log absences");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setSuccess(false);
    setSchoolId("");
    setDate("");
    setStudents([]);
    setSelected(new Set());
    setFetchError(null);
    setSubmitError(null);
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-[#2a2d3e] bg-[#1e2235] p-10 flex flex-col items-center text-center gap-5">
        <div className="w-14 h-14 rounded-full bg-[#10b981]/10 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">
            {submittedCount} absence{submittedCount !== 1 ? "s" : ""} logged
          </h2>
          <p className="text-sm text-slate-400">Recorded for {submittedDate}.</p>
        </div>
        <button
          onClick={reset}
          className="mt-1 px-6 py-2.5 rounded-xl bg-[#7c3aed] text-white text-sm font-semibold hover:bg-[#6d28d9] transition-colors"
        >
          Log another
        </button>
      </div>
    );
  }

  const allSelected = students.length > 0 && selected.size === students.length;
  const canSubmit = !!date && selected.size > 0 && !submitting;

  return (
    <>
      {showConfirm && (
        <ConfirmModal
          title="Log Absences"
          message={`Log ${selected.size} absence${selected.size !== 1 ? "s" : ""} for ${schoolName} on ${date}? This cannot be undone.`}
          confirmLabel={`Log ${selected.size} absence${selected.size !== 1 ? "s" : ""}`}
          onConfirm={() => { setShowConfirm(false); submitAbsences(); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <div className="flex flex-col gap-5">
        {/* School + Date card */}
        <div className="rounded-2xl border border-[#2a2d3e] bg-[#1e2235] p-7 flex flex-col gap-6">
          {/* School */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
              School
            </label>
            <div className="relative">
              <select
                value={schoolId}
                onChange={handleSchoolChange}
                className={`dark-select appearance-none ${darkInputClass} pr-10 cursor-pointer`}
              >
                <option value="">Select a school…</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#7c3aed]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
              Absence Date
            </label>
            <DatePicker
              value={date}
              onChange={setDate}
              placeholder="YYYY-MM-DD"
              inputClassName={darkInputWithIconClass}
            />
          </div>
        </div>

        {/* Students panel */}
        {schoolId && (
          <div className="rounded-2xl border border-[#2a2d3e] bg-[#1e2235] overflow-hidden">
            <div className="flex items-center justify-between px-7 py-4 border-b border-[#2a2d3e]">
              <h2 className="text-sm font-semibold text-white">
                Students
                {students.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    {selected.size} of {students.length} selected
                  </span>
                )}
              </h2>
              {students.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs font-medium text-[#7c3aed] hover:text-[#a78bfa] transition-colors"
                >
                  {allSelected ? "Deselect all" : "Select all"}
                </button>
              )}
            </div>

            {fetching ? (
              <div className="flex items-center justify-center py-14">
                <div className="w-5 h-5 rounded-full border-2 border-[#7c3aed] border-t-transparent animate-spin" />
              </div>
            ) : fetchError ? (
              <div className="px-7 py-10 text-center">
                <p className="text-sm text-[#ef4444]">{fetchError}</p>
              </div>
            ) : students.length === 0 ? (
              <div className="px-7 py-10 text-center">
                <p className="text-sm text-gray-500">No students found for this school.</p>
              </div>
            ) : (
              <ul className="divide-y divide-[#2a2d3e] max-h-72 overflow-y-auto">
                {students.map((student) => (
                  <li key={student.ssId}>
                    <label className="flex items-center gap-3.5 px-7 py-3.5 cursor-pointer hover:bg-white/[0.03] transition-colors">
                      <input
                        type="checkbox"
                        checked={selected.has(student.ssId)}
                        onChange={() => toggle(student.ssId)}
                        className="w-4 h-4 rounded border-gray-600 accent-[#7c3aed] cursor-pointer shrink-0"
                      />
                      <span className="text-sm text-slate-200">{student.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {submitError && (
          <p className="text-sm text-[#ef4444] px-1">{submitError}</p>
        )}

        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          disabled={!canSubmit}
          className="w-full py-3.5 rounded-xl text-sm font-semibold transition-colors bg-[#7c3aed] text-white hover:bg-[#6d28d9] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting
            ? "Logging absences…"
            : selected.size > 0
            ? `Log ${selected.size} absence${selected.size !== 1 ? "s" : ""}`
            : "Log absences"}
        </button>
      </div>
    </>
  );
}
