import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import CaterersTable from "./CaterersTable";

export const revalidate = 0;

export default async function ManageCaterersPage() {
  noStore();

  const { data, error } = await supabaseAdmin
    .from("caterers")
    .select("id, name, contact_name, contact_email, is_active")
    .order("name");

  const caterers = (data ?? []).map((row: any) => ({
    id: row.id as string,
    name: row.name as string,
    contactName: row.contact_name as string | null,
    contactEmail: row.contact_email as string | null,
    isActive: row.is_active as boolean ?? true,
  }));

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <Link href="/manage-data" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Manage Data
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Caterers</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {caterers.length} record{caterers.length !== 1 ? "s" : ""} found.
              {error && <span className="ml-2 text-[#ef4444]">Error loading data.</span>}
            </p>
          </div>
          <Link href="/caterers/new" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7c3aed] text-white text-sm font-semibold hover:bg-[#6d28d9] transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add caterer
          </Link>
        </div>
      </div>
      <CaterersTable caterers={caterers} />
    </div>
  );
}
