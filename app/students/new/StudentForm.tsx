"use client";

import { useState } from "react";
import ConfirmModal from "@/app/components/ui/ConfirmModal";

const I = "w-full rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-slate-50 dark:bg-[#0f1117] text-slate-900 dark:text-white text-sm px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40 focus:border-[#7c3aed] transition-colors placeholder:text-slate-400 dark:placeholder:text-gray-500";
const S = `dark-select appearance-none ${I} pr-10 cursor-pointer`;
const L = "block text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2.5";
const CARD = "rounded-2xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] p-7 flex flex-col gap-6";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const YEAR_LEVELS = [10, 11, 12];
const DIETARY_OPTIONS = [
  "Halal", "Vegetarian", "Gluten Free", "Dairy Free", "Nut Free",
  "No Beef", "No Pork", "No Red Meat", "No Fish", "No Shellfish", "No Seafood",
];

function Chevron() {
  return (
    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#7c3aed]">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange} aria-pressed={checked}
      className={`relative w-10 h-5 rounded-full transition-colors ${checked ? "bg-[#7c3aed]" : "bg-slate-200 dark:bg-gray-600"}`}>
      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

type School = { id: string; name: string };

export default function StudentForm({ schools }: { schools: School[] }) {
  const [schoolId, setSchoolId] = useState("");
  const [sessionDay, setSessionDay] = useState("");
  const [name, setName] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const [email, setEmail] = useState("");
  const [cateringOptedOut, setCateringOptedOut] = useState(false);
  const [dietary, setDietary] = useState<Set<string>>(new Set());
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentMobile, setParentMobile] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schoolName = schools.find((s) => s.id === schoolId)?.name ?? "";

  function toggleDiet(opt: string) {
    setDietary((prev) => {
      const next = new Set(prev);
      next.has(opt) ? next.delete(opt) : next.add(opt);
      return next;
    });
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_id: schoolId,
          day_of_week: sessionDay,
          name: name.trim(),
          year_level: yearLevel ? Number(yearLevel) : null,
          email: email.trim() || null,
          catering_opted_out: cateringOptedOut,
          dietary_restrictions: Array.from(dietary),
          parent_name: parentName.trim() || null,
          parent_email: parentEmail.trim() || null,
          parent_mobile: parentMobile.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to add student");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add student");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setSuccess(false);
    setSchoolId(""); setSessionDay(""); setName(""); setYearLevel("");
    setEmail(""); setCateringOptedOut(false); setDietary(new Set());
    setParentName(""); setParentEmail(""); setParentMobile(""); setError(null);
  }

  const canSubmit = !!schoolId && !!sessionDay && !!name.trim() && !submitting;

  if (success) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] p-10 flex flex-col items-center text-center gap-5">
        <div className="w-14 h-14 rounded-full bg-[#10b981]/10 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Student added</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{name} enrolled at {schoolName}</p>
        </div>
        <button onClick={reset} className="mt-1 px-6 py-2.5 rounded-xl bg-[#7c3aed] text-white text-sm font-semibold hover:bg-[#6d28d9] transition-colors">
          Add another
        </button>
      </div>
    );
  }

  return (
    <>
      {showConfirm && (
        <ConfirmModal
          title="Add Student"
          message={`Add ${name.trim()} to ${schoolName} for ${sessionDay} sessions? Please review before confirming.`}
          confirmLabel="Add student"
          onConfirm={() => { setShowConfirm(false); submit(); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
      <div className="flex flex-col gap-5">
        {/* Student details */}
        <div className={CARD}>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white -mb-2">Student Details</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className={L}>School</label>
              <div className="relative">
                <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className={S}>
                  <option value="">Select school…</option>
                  {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <Chevron />
              </div>
            </div>
            <div>
              <label className={L}>Session Day</label>
              <div className="relative">
                <select value={sessionDay} onChange={(e) => setSessionDay(e.target.value)} className={S}>
                  <option value="">Select day…</option>
                  {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <Chevron />
              </div>
            </div>
          </div>

          <div>
            <label className={L}>Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah Johnson" className={I} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className={L}>Year Level</label>
              <div className="relative">
                <select value={yearLevel} onChange={(e) => setYearLevel(e.target.value)} className={S}>
                  <option value="">Select year…</option>
                  {YEAR_LEVELS.map((y) => <option key={y} value={y}>Year {y}</option>)}
                </select>
                <Chevron />
              </div>
            </div>
            <div>
              <label className={L}>Student Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="student@school.edu" className={I} />
            </div>
          </div>

          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Catering Opted Out</p>
              <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">Student does not receive catering</p>
            </div>
            <Toggle checked={cateringOptedOut} onChange={() => setCateringOptedOut((v) => !v)} />
          </div>
        </div>

        {/* Dietary restrictions */}
        <div className={CARD}>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white -mb-2">Dietary Restrictions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {DIETARY_OPTIONS.map((opt) => (
              <label key={opt} className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={dietary.has(opt)} onChange={() => toggleDiet(opt)}
                  className="w-4 h-4 rounded accent-[#7c3aed] cursor-pointer shrink-0" />
                <span className="text-sm text-slate-800 dark:text-slate-200">{opt}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Parent info */}
        <div className={CARD}>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white -mb-2">Parent / Guardian</h3>
          <div>
            <label className={L}>Parent Name</label>
            <input type="text" value={parentName} onChange={(e) => setParentName(e.target.value)}
              placeholder="e.g. Michael Johnson" className={I} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className={L}>Parent Email</label>
              <input type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)}
                placeholder="parent@email.com" className={I} />
            </div>
            <div>
              <label className={L}>Parent Mobile</label>
              <input type="tel" value={parentMobile} onChange={(e) => setParentMobile(e.target.value)}
                placeholder="04xx xxx xxx" className={I} />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-[#ef4444] px-1">{error}</p>}

        <button type="button" onClick={() => setShowConfirm(true)} disabled={!canSubmit}
          className="w-full py-3.5 rounded-xl text-sm font-semibold bg-[#7c3aed] text-white hover:bg-[#6d28d9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          {submitting ? "Adding student…" : "Add student"}
        </button>
      </div>
    </>
  );
}
