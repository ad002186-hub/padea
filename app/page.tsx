import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
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
];

async function fetchStatCounts(): Promise<number[]> {
  const [students, sessions, caterers, flags] = await Promise.all([
    supabaseAdmin
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabaseAdmin
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabaseAdmin
      .from("caterers")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabaseAdmin
      .from("flags")
      .select("*", { count: "exact", head: true })
      .eq("is_resolved", false),
  ]);

  return [
    students.count ?? 0,
    sessions.count ?? 0,
    caterers.count ?? 0,
    flags.count ?? 0,
  ];
}


const weekOrders = [
  { day: "Monday",    caterer: "Sunrise Catering", meals: 142, status: "Confirmed" },
  { day: "Tuesday",   caterer: "Sunrise Catering", meals: 138, status: "Confirmed" },
  { day: "Wednesday", caterer: "Green Leaf Co.",   meals: 155, status: "Pending"   },
  { day: "Thursday",  caterer: "Sunrise Catering", meals: 149, status: "Confirmed" },
  { day: "Friday",    caterer: "Green Leaf Co.",   meals: 130, status: "Pending"   },
];

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

export default async function DashboardPage() {
  noStore();
  const [counts, { data: flagsData }] = await Promise.all([
    fetchStatCounts(),
    supabaseAdmin
      .from("flags")
      .select("id, title, details, type, created_at")
      .eq("is_resolved", false)
      .order("created_at", { ascending: false }),
  ]);
  const statCards = statCardStyles.map((style, i) => ({ ...style, value: counts[i] }));
  const pendingFlags: PendingFlag[] = (flagsData ?? []).map((f: any) => ({
    id: f.id as string,
    title: f.title as string,
    details: f.details as string | null,
    type: f.type as string,
    created_at: f.created_at as string,
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Pending Flags */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Pending Flags
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20">
                {pendingFlags.length} open
              </span>
              <Link
                href="/flags"
                className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                View all →
              </Link>
            </div>
          </div>
          <PendingFlagsSection flags={pendingFlags} />
        </section>

        {/* This Week's Orders */}
        <section>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
            This Week's Orders
          </h2>
          <div className="rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-[#2a2d3e] bg-slate-50 dark:bg-white/[0.03]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Day
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Caterer
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Meals
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#2a2d3e]">
                {weekOrders.map((order) => (
                  <tr
                    key={order.day}
                    className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                      {order.day}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {order.caterer}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-800 dark:text-slate-200">
                      {order.meals}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {order.status === "Confirmed" ? (
                        <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20">
                          Confirmed
                        </span>
                      ) : (
                        <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20">
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

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
