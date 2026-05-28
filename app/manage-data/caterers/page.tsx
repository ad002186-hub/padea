import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import CaterersTable from "./CaterersTable";

export const revalidate = 0;

export default async function ManageCaterersPage() {
  noStore();

  const [{ data }, { data: schools }] = await Promise.all([
    supabaseAdmin
      .from("caterers")
      .select("id, name, contact_name, contact_email, cc_name, cc_email, no_cc, price_per_item, price_includes_gst, delivery_fee, delivery_fee_note, min_meals_4_items, min_meals_5_items, min_meals_6_items, is_active, caterer_school_eligibility(school_id, is_current, schools(name))")
      .order("name"),
    supabaseAdmin.from("schools").select("id, name").order("name"),
  ]);

  const caterers = (data ?? []).map((row: any) => ({
    id: row.id as string,
    name: row.name as string,
    contactName: row.contact_name as string | null,
    contactEmail: row.contact_email as string | null,
    ccName: row.cc_name as string | null,
    ccEmail: row.cc_email as string | null,
    noCC: row.no_cc as boolean ?? false,
    pricePerItem: row.price_per_item as number | null,
    priceIncludesGst: row.price_includes_gst as boolean ?? false,
    deliveryFee: row.delivery_fee as number | null,
    deliveryFeeNote: row.delivery_fee_note as string | null,
    minMeals4: row.min_meals_4_items as number | null,
    minMeals5: row.min_meals_5_items as number | null,
    minMeals6: row.min_meals_6_items as number | null,
    isActive: (row.is_active as boolean) ?? true,
    schoolEligibility: ((row.caterer_school_eligibility as any[]) ?? []).map((e: any) => ({
      schoolId: e.school_id as string,
      schoolName: (e.schools as { name?: string } | null)?.name ?? "Unknown",
      isCurrent: e.is_current as boolean,
    })),
  }));

  return (
    <div className="p-8 max-w-6xl mx-auto">
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
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{caterers.length} record{caterers.length !== 1 ? "s" : ""} found.</p>
          </div>
          <Link href="/caterers/new" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7c3aed] text-white text-sm font-semibold hover:bg-[#6d28d9] transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add caterer
          </Link>
        </div>
      </div>
      <CaterersTable caterers={caterers} allSchools={schools ?? []} />
    </div>
  );
}
