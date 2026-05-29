import { unstable_noStore as noStore } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import FlagsTable from "./FlagsTable";

export const revalidate = 0;

export default async function FlagsPage() {
  noStore();

  const { data, error } = await supabaseAdmin
    .from("flags")
    .select("id, title, details, type, created_at, is_resolved, resolved_at")
    .order("created_at", { ascending: false });

  const flags = (data ?? []).map((f: any) => ({
    id: f.id as string,
    title: f.title as string,
    details: f.details as string | null,
    type: f.type as string,
    created_at: f.created_at as string,
    is_resolved: f.is_resolved as boolean,
    resolved_at: f.resolved_at as string | null,
  }));

  const openCount = flags.filter((f) => !f.is_resolved).length;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">All Flags</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {error
            ? <span className="text-[#ef4444]">Error loading flags.</span>
            : <>{openCount} open · {flags.length - openCount} resolved</>}
        </p>
      </div>
      <FlagsTable flags={flags} />
    </div>
  );
}
