"use client";

import { useState } from "react";

export type Session = {
  id: string;
  dayOfWeek: string;
  dinnerTime: string | null;
  managerName: string | null;
  schoolName: string;
  catererName: string;
};

export type CancelledSession = {
  id: string;
  date: string;
  cancelledYearLevels: number[] | null;
  reason: string | null;
  schoolName: string;
  dayOfWeek: string;
};

type Student = { id: string; name: string; yearLevel: number | null };
type AbsentStudent = Student & { reason: string };
type StudentsResult = { active: Student[]; absentOrInactive: AbsentStudent[] };

const FI = "rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-slate-50 dark:bg-[#0f1117] text-slate-900 dark:text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40 hover:border-[#7c3aed]/60 transition-colors";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function Chevron() {
  return (
    <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#7c3aed]">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

export default function SessionsView({
  sessions,
  cancelledSessions,
}: {
  sessions: Session[];
  cancelledSessions: CancelledSession[];
}) {
  const [schoolFilter, setSchoolFilter] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const [viewingSession, setViewingSession] = useState<Session | null>(null);
  const [students, setStudents] = useState<StudentsResult | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);

  const uniqueSchools = [...new Set(sessions.map((s) => s.schoolName))].sort();

  const filteredSessions = sessions.filter((s) => {
    if (schoolFilter && s.schoolName !== schoolFilter) return false;
    if (dayFilter && s.dayOfWeek !== dayFilter) return false;
    return true;
  });

  const filteredCancelled = cancelledSessions.filter((e) => {
    if (schoolFilter && e.schoolName !== schoolFilter) return false;
    return true;
  });

  async function openStudents(session: Session) {
    setViewingSession(session);
    setStudents(null);
    setLoadingStudents(true);
    setStudentsError(null);
    try {
      const res = await fetch(`/api/sessions/${session.id}/students`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load students");
      setStudents(json);
    } catch (err) {
      setStudentsError(err instanceof Error ? err.message : "Failed to load students");
    } finally {
      setLoadingStudents(false);
    }
  }

  return (
    <>
      {/* Student modal */}
      {viewingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setViewingSession(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#2a2d3e] bg-[#1e2235] p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-white">{viewingSession.schoolName}</h2>
                <p className="text-sm text-gray-400 mt-0.5">{viewingSession.dayOfWeek} session</p>
              </div>
              <button onClick={() => setViewingSession(null)}
                className="text-gray-500 hover:text-white transition-colors ml-4 shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {loadingStudents ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-5 h-5 rounded-full border-2 border-[#7c3aed] border-t-transparent animate-spin" />
                </div>
              ) : studentsError ? (
                <p className="text-sm text-[#ef4444] text-center py-8">{studentsError}</p>
              ) : !students ? null : (
                <div className="flex flex-col gap-5">
                  {/* Active students */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 rounded-full bg-[#10b981] shrink-0" />
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Present this week ({students.active.length})
                      </h3>
                    </div>
                    {students.active.length === 0 ? (
                      <p className="text-sm text-gray-500 pl-4">No active students.</p>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {students.active.map((s) => (
                          <li key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#0f1117] border border-[#2a2d3e]">
                            <span className="text-sm text-slate-200">{s.name}</span>
                            {s.yearLevel && <span className="text-xs text-gray-500">Yr {s.yearLevel}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Absent / inactive */}
                  {students.absentOrInactive.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full bg-[#f59e0b] shrink-0" />
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Absent / Inactive ({students.absentOrInactive.length})
                        </h3>
                      </div>
                      <ul className="flex flex-col gap-1">
                        {students.absentOrInactive.map((s) => (
                          <li key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#0f1117] border border-[#2a2d3e]">
                            <span className="text-sm text-slate-300">{s.name}</span>
                            <span className={`text-xs font-medium ${s.reason === "Inactive" ? "text-slate-500" : "text-[#f59e0b]"}`}>
                              {s.reason}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative">
          <select value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)}
            className={`dark-select appearance-none ${FI} pr-8 cursor-pointer`}>
            <option value="">All schools</option>
            {uniqueSchools.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <Chevron />
        </div>
        <div className="relative">
          <select value={dayFilter} onChange={(e) => setDayFilter(e.target.value)}
            className={`dark-select appearance-none ${FI} pr-8 cursor-pointer`}>
            <option value="">All days</option>
            {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <Chevron />
        </div>
        {(schoolFilter || dayFilter) && (
          <button onClick={() => { setSchoolFilter(""); setDayFilter(""); }}
            className="text-xs text-slate-400 dark:text-gray-500 hover:text-slate-900 dark:hover:text-white transition-colors">
            Clear
          </button>
        )}
      </div>

      {/* Active Sessions */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
          Active Sessions
          <span className="ml-2 text-sm font-normal text-slate-400 dark:text-gray-500">
            ({filteredSessions.length})
          </span>
        </h2>
        {filteredSessions.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] p-12 flex items-center justify-center">
            <p className="text-sm text-slate-400 dark:text-gray-500">No sessions match the current filters.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-[#2a2d3e] bg-slate-50 dark:bg-white/[0.03]">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">School</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Day</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Caterer</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Manager</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Dinner</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#2a2d3e]">
                {filteredSessions.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-200">{row.schoolName}</td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{row.dayOfWeek}</td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{row.catererName}</td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{row.managerName ?? "—"}</td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{row.dinnerTime ?? "—"}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => openStudents(row)}
                        className="text-xs font-medium text-[#7c3aed] hover:text-[#6d28d9] dark:hover:text-[#a78bfa] transition-colors whitespace-nowrap"
                      >
                        See Students →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Cancelled Sessions */}
      <section>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
          Cancelled Sessions
          <span className="ml-2 text-sm font-normal text-slate-400 dark:text-gray-500">
            (last 30 days · {filteredCancelled.length})
          </span>
        </h2>
        {filteredCancelled.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] p-12 flex items-center justify-center">
            <p className="text-sm text-slate-400 dark:text-gray-500">No cancellations in the last 30 days.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-[#2a2d3e] bg-slate-50 dark:bg-white/[0.03]">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">School</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Date</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Year Levels</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#2a2d3e]">
                {filteredCancelled.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-200">{row.schoolName}</td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 tabular-nums">{row.date}</td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                      {row.cancelledYearLevels?.length
                        ? row.cancelledYearLevels.map((y) => `Yr ${y}`).join(", ")
                        : <span className="text-amber-600 dark:text-amber-400 font-medium">All</span>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{row.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
