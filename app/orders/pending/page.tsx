import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import PendingOrdersView from "./PendingOrdersView";

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

export default async function PendingOrdersPage() {
  noStore();

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(`
      id, session_date, meal_count, status, caterer_id,
      sessions(day_of_week, schools(name)),
      caterers(name, price_per_item, price_includes_gst, delivery_fee),
      order_items(id, quantity, assigned_students, menu_items(name))
    `)
    .in("status", ["pending", "approved"])
    .order("session_date", { ascending: true });

  // Delivery fee charged once per caterer per day
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
      items: ((row.order_items ?? []) as any[]).map((oi) => ({
        name: oi.menu_items?.name ?? "Unknown",
        quantity: oi.quantity as number,
        assignedStudents: (oi.assigned_students ?? null) as
          | { studentId: string; name: string; restrictions: string[] }[]
          | null,
      })),
    };
  });

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
