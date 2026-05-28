import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import AbsencesTable from "./AbsencesTable";

export const revalidate = 0;

export default async function ManageAbsencesPage() {
  noStore();
  const { data, error } = await supabaseAdmin
    .from("absences")
    .select("student_id, session_id, date, students(name), sessions(schools(name))")
    .order("date", { ascending: false });

  const absences = (data ?? []).map((row: any) => {
    const s = row.students as { name?: string } | null;
    const school = row.sessions?.schools as { name?: string } | null;
    return {
      student_id: row.student_id as string,
      session_id: row.session_id as string,
      date: row.date as string,
      studentName: s?.name || "Unknown",
      schoolName: school?.name ?? "Unknown",
    };
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <Link
          href="/manage-data"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-4"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Manage Data
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Absences
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {absences.length} record{absences.length !== 1 ? "s" : ""} found.
              {error && (
                <span className="ml-2 text-[#ef4444]">Error loading data.</span>
              )}
            </p>
          </div>
          <Link
            href="/absences/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7c3aed] text-white text-sm font-semibold hover:bg-[#6d28d9] transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Log absence
          </Link>
        </div>
      </div>

      <AbsencesTable absences={absences} />
    </div>
  );
}
