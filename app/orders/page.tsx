import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import OrdersTable from "./OrdersTable";

export const revalidate = 0;

function calcOrderCost(
  mealCount: number,
  pricePerItem: number | null,
  priceIncludesGst: boolean,
  deliveryFee: number | null,
  includeDelivery: boolean
): number | null {
  if (!pricePerItem) return null;
  let itemCost = mealCount * pricePerItem;
  if (!priceIncludesGst) itemCost *= 1.1;
  return itemCost + (includeDelivery && deliveryFee ? deliveryFee : 0);
}

export default async function OrdersPage() {
  noStore();

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("id, session_date, meal_count, status, caterer_id, sessions(day_of_week, schools(name)), caterers(name, price_per_item, price_includes_gst, delivery_fee)")
    .order("session_date", { ascending: false })
    .limit(200);

  // Delivery fee is charged once per caterer per day (e.g. GYG per trip)
  const deliveryCharged = new Set<string>();

  const orders = (data ?? []).map((row: any) => {
    const catererId = row.caterer_id as string;
    const deliveryKey = `${catererId}:${row.session_date}`;
    const includeDelivery = !deliveryCharged.has(deliveryKey);
    if (includeDelivery) deliveryCharged.add(deliveryKey);

    const caterer = row.caterers as any;
    return {
      id: row.id as string,
      sessionDate: row.session_date as string,
      day: (row.sessions as any)?.day_of_week ?? "?",
      schoolName: (row.sessions as any)?.schools?.name ?? "Unknown",
      catererName: caterer?.name ?? "Unknown",
      mealCount: row.meal_count as number,
      status: row.status as string,
      totalCost: calcOrderCost(
        row.meal_count,
        caterer?.price_per_item ?? null,
        caterer?.price_includes_gst ?? false,
        caterer?.delivery_fee ?? null,
        includeDelivery
      ),
    };
  });

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Orders</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {error
                ? <span className="text-[#ef4444]">Error loading orders.</span>
                : <>{orders.length} order{orders.length !== 1 ? "s" : ""} · {pendingCount} pending review</>}
            </p>
          </div>
          {pendingCount > 0 && (
            <Link href="/orders/pending"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#f59e0b] text-white text-sm font-semibold hover:bg-amber-600 transition-colors">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              {pendingCount} pending review
            </Link>
          )}
        </div>
      </div>

      <OrdersTable orders={orders} />
    </div>
  );
}
