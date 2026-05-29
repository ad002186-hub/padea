import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentWeekRange } from "@/lib/weekUtils";
import PendingFlagsSection, { type PendingFlag } from "@/app/components/PendingFlagsSection";

export const revalidate = 0;

const statCardStyles = [
  {
    label: "Total Students",
    sub: "Across all schools",
    color: "text-[#10b981]",
    bg: "dark:bg-[#10b981]/10 bg-emerald-50",
    border: "dark:border-[#10b981]/20 border-emerald-200",
    dot: "bg-[#10b981]",
  },
  {
    label: "Active Sessions",
    sub: "Active this term",
    color: "text-[#7c3aed]",
    bg: "dark:bg-[#7c3aed]/10 bg-violet-50",
    border: "dark:border-[#7c3aed]/20 border-violet-200",
    dot: "bg-[#7c3aed]",
  },
  {
    label: "Total Caterers",
    sub: "Registered",
    color: "text-sky-400",
    bg: "dark:bg-sky-500/10 bg-sky-50",
    border: "dark:border-sky-500/20 border-sky-200",
    dot: "bg-sky-400",
  },
  {
    label: "Pending Flags",
    sub: "Require attention",
    color: "text-[#f59e0b]",
    bg: "dark:bg-[#f59e0b]/10 bg-amber-50",
    border: "dark:border-[#f59e0b]/20 border-amber-200",
    dot: "bg-[#f59e0b]",
  },
  {
    label: "Pending Orders",
    sub: "Awaiting review",
    color: "text-[#7c3aed]",
    bg: "dark:bg-[#7c3aed]/10 bg-violet-50",
    border: "dark:border-[#7c3aed]/20 border-violet-200",
    dot: "bg-[#7c3aed]",
  },
];

async function fetchStatCounts(): Promise<number[]> {
  const [students, sessions, caterers, flags, pendingOrders] = await Promise.all([
    supabaseAdmin.from("students").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabaseAdmin.from("sessions").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabaseAdmin.from("caterers").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabaseAdmin.from("flags").select("*", { count: "exact", head: true }).eq("is_resolved", false),
    supabaseAdmin.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  return [
    students.count ?? 0,
    sessions.count ?? 0,
    caterers.count ?? 0,
    flags.count ?? 0,
    pendingOrders.count ?? 0,
  ];
}



const recentFeedback = [
  {
    id: 1,
    group: "Year 4 – Room 7",
    comment: "Portions were too small on Wednesday.",
    date: "26 May",
    sentiment: "negative",
  },
  {
    id: 2,
    group: "Year 6 – Room 2",
    comment: "Really enjoyed the pasta option this week.",
    date: "25 May",
    sentiment: "positive",
  },
  {
    id: 3,
    group: "Year 3 – Room 1",
    comment: "A student reported the soup was cold.",
    date: "24 May",
    sentiment: "negative",
  },
];

function fmtSessionDate(ymd: string): string {
  if (!ymd) return "";
  const [, m, d] = ymd.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d} ${months[m - 1]}`;
}

const STATUS_BADGE: Record<string, string> = {
  pending:   "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20",
  approved:  "bg-[#7c3aed]/10 text-[#7c3aed] border-[#7c3aed]/20",
  sent:      "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20",
  cancelled: "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-[#2a2d3e]",
};

export default async function DashboardPage() {
  noStore();

  // Current week: Monday–Sunday
  const { monday } = getCurrentWeekRange();
  const [y, mo, d] = monday.split("-").map(Number);
  const sunDate = new Date(y, mo - 1, d + 6);
  const sunday = `${sunDate.getFullYear()}-${String(sunDate.getMonth() + 1).padStart(2, "0")}-${String(sunDate.getDate()).padStart(2, "0")}`;

  const ORDER_SELECT = "id, session_date, meal_count, status, sessions(day_of_week, schools(name)), caterers(name)";

  const [counts, { data: flagsData }, { data: weekOrdersData }] = await Promise.all([
    fetchStatCounts(),
    supabaseAdmin.from("flags").select("id, title, details, type, created_at").eq("is_resolved", false).order("created_at", { ascending: false }),
    // All orders for the current week (Mon–Sun), all statuses
    supabaseAdmin.from("orders").select(ORDER_SELECT).gte("session_date", monday).lte("session_date", sunday).order("session_date", { ascending: true }),
  ]);

  const weekOrdersRaw = weekOrdersData ?? [];

  const statCards = statCardStyles.map((style, i) => ({ ...style, value: counts[i] }));
  const pendingFlags: PendingFlag[] = (flagsData ?? []).map((f: any) => ({
    id: f.id as string,
    title: f.title as string,
    details: f.details as string | null,
    type: f.type as string,
    created_at: f.created_at as string,
  }));
  const weekOrders = weekOrdersRaw.map((o: any) => ({
    id: o.id as string,
    day: (o.sessions as any)?.day_of_week ?? "?",
    school: (o.sessions as any)?.schools?.name ?? "Unknown",
    caterer: (o.caterers as any)?.name ?? "Unknown",
    meals: o.meal_count as number,
    status: o.status as string,
    sessionDate: o.session_date as string,
  }));

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Welcome back. Here's what's happening today.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border p-6 ${card.bg} ${card.border}`}
          >
            <div className="flex items-center gap-2 mb-4">
              <span className={`w-2 h-2 rounded-full ${card.dot}`} />
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                {card.label}
              </p>
            </div>
            <p className={`text-4xl font-bold ${card.color} mb-1`}>
              {card.value}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {card.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Pending Flags */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Pending Flags</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20">
              {pendingFlags.length} open
            </span>
            <Link href="/flags" className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              View all →
            </Link>
          </div>
        </div>
        <PendingFlagsSection flags={pendingFlags} />
      </section>

      {/* This Week's Orders — card grid */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">This Week's Orders</h2>
          <Link href="/orders" className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            View all →
          </Link>
        </div>

        {weekOrders.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] p-10 flex items-center justify-center">
            <p className="text-sm text-slate-400 dark:text-slate-500">No orders this week yet.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {weekOrders.slice(0, 6).map((order) => (
                <div key={order.id} className="relative rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] p-4">
                  {/* Status badge — top right */}
                  <span className={`absolute top-3 right-3 text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${STATUS_BADGE[order.status] ?? STATUS_BADGE.pending}`}>
                    {order.status}
                  </span>

                  {/* Meal count */}
                  <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none mt-1">{order.meals}</p>
                  <p className="text-xs text-slate-400 dark:text-gray-500 mb-3">meals</p>

                  {/* School */}
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate mb-1 pr-12">{order.school}</p>

                  {/* Day · Date */}
                  <p className="text-xs text-slate-400 dark:text-gray-500 mb-0.5">
                    {order.day}{order.sessionDate ? ` · ${fmtSessionDate(order.sessionDate)}` : ""}
                  </p>

                  {/* Caterer */}
                  <p className="text-xs text-slate-400 dark:text-gray-500 truncate">{order.caterer}</p>
                </div>
              ))}
            </div>
            {weekOrders.length > 6 && (
              <div className="mt-3 text-right">
                <Link href="/orders" className="text-xs font-medium text-[#7c3aed] hover:text-[#6d28d9] transition-colors">
                  View all {weekOrders.length} orders →
                </Link>
              </div>
            )}
          </>
        )}
      </section>

      {/* Recent Feedback */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Recent Feedback
          </h2>
          <Link
            href="/feedback"
            className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {recentFeedback.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {item.group}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      item.sentiment === "positive"
                        ? "bg-[#10b981]"
                        : "bg-[#ef4444]"
                    }`}
                  />
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {item.date}
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                "{item.comment}"
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
