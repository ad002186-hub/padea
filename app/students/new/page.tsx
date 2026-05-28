import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import StudentForm from "./StudentForm";

export default async function NewStudentPage() {
  const { data: schools } = await supabaseAdmin.from("schools").select("id, name").order("name");

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href="/log-data" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Log Data
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Add New Student</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Register a student and assign them to a session.</p>
      </div>
      <StudentForm schools={schools ?? []} />
    </div>
  );
}
