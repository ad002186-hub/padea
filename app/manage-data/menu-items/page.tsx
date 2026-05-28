import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import MenuItemsTable from "./MenuItemsTable";

export const revalidate = 0;

export default async function ManageMenuItemsPage() {
  noStore();

  const { data, error } = await supabaseAdmin
    .from("menu_items")
    .select("id, name, is_active, is_gluten_free, is_dairy_free, is_nut_free, is_vegetarian, contains_pork, contains_beef, contains_lamb, contains_fish, contains_shellfish, contains_seafood, dietary_flags_known, caterers(id, name)")
    .order("name");

  const items = (data ?? []).map((row: any) => {
    const caterer = row.caterers as { id?: string; name?: string } | null;
    return {
      id: row.id as string,
      name: row.name as string,
      catererId: caterer?.id ?? "",
      catererName: caterer?.name ?? "Unknown",
      isGlutenFree: row.is_gluten_free as boolean,
      isDairyFree: row.is_dairy_free as boolean,
      isNutFree: row.is_nut_free as boolean,
      isVegetarian: row.is_vegetarian as boolean,
      containsPork: row.contains_pork as boolean,
      containsBeef: row.contains_beef as boolean,
      containsLamb: row.contains_lamb as boolean,
      containsFish: row.contains_fish as boolean,
      containsShellfish: row.contains_shellfish as boolean,
      containsSeafood: row.contains_seafood as boolean,
      dietaryFlagsKnown: row.dietary_flags_known as boolean ?? true,
      isActive: (row.is_active as boolean) ?? true,
    };
  });

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
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Menu Items</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {items.length} item{items.length !== 1 ? "s" : ""} found.
              {error && <span className="ml-2 text-[#ef4444]">Error loading data.</span>}
            </p>
          </div>
          <Link href="/menu-items/new" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7c3aed] text-white text-sm font-semibold hover:bg-[#6d28d9] transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add item
          </Link>
        </div>
      </div>
      <MenuItemsTable items={items} />
    </div>
  );
}
