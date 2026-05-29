import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import PendingOrdersView from "./PendingOrdersView";

export const revalidate = 0;

export default async function PendingOrdersPage() {
  noStore();

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(`
      id, session_date, meal_count, status,
      sessions(day_of_week, schools(name)),
      caterers(name),
      order_items(id, quantity, menu_items(name))
    `)
    .in("status", ["pending", "approved"])
    .order("session_date", { ascending: true });

  const orders = (data ?? []).map((row: any) => ({
    id: row.id as string,
    sessionDate: row.session_date as string,
    day: (row.sessions as any)?.day_of_week ?? "?",
    schoolName: (row.sessions as any)?.schools?.name ?? "Unknown",
    catererName: (row.caterers as any)?.name ?? "Unknown",
    mealCount: row.meal_count as number,
    status: row.status as string,
    items: ((row.order_items ?? []) as any[]).map((oi) => ({
      name: oi.menu_items?.name ?? "Unknown",
      quantity: oi.quantity as number,
    })),
  }));

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <Link href="/orders" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Orders
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Pending Orders</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {error
                ? <span className="text-[#ef4444]">Error loading orders.</span>
                : `${orders.length} order${orders.length !== 1 ? "s" : ""} awaiting review.`}
            </p>
          </div>
        </div>
      </div>

      <PendingOrdersView orders={orders} />
    </div>
  );
}
