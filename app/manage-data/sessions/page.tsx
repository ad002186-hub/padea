import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentWeekRange, getWeekDates } from "@/lib/weekUtils";
import SessionsView from "./SessionsView";

export const revalidate = 0;

const DAY_ORDER: Record<string, number> = {
  Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6,
};

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function ManageSessionsPage() {
  noStore();

  const { monday, friday } = getCurrentWeekRange();
  const weekDates = getWeekDates();

  const [{ data: sessionsData }, { data: weekExcData }, { data: fullCancData }] = await Promise.all([
    // All sessions with all detail fields
    supabaseAdmin
      .from("sessions")
      .select("id, day_of_week, dinner_time, start_time, end_time, building, room, year_levels, manager_name, manager_email, manager_mobile, schools(name), caterers(name, contact_email)"),

    // This week's exclusions (full + partial) — used to filter active list and add partial badges
    supabaseAdmin
      .from("exclusions")
      .select("id, session_id, cancelled_year_levels, date, reason")
      .gte("date", monday)
      .lte("date", friday),

    // Last 30 days FULL cancellations only — for the Cancelled Sessions section
    supabaseAdmin
      .from("exclusions")
      .select("id, date, reason, sessions(day_of_week, schools(name))")
      .gte("date", daysAgo(30))
      .is("cancelled_year_levels", null)
      .order("date", { ascending: false }),
  ]);

  // Build lookup maps from this week's exclusions
  const fullCancIds = new Set<string>();
  const partialCancMap = new Map<string, { date: string; yearLevels: number[]; reason: string | null }>();

  for (const exc of weekExcData ?? []) {
    if ((exc as any).cancelled_year_levels === null) {
      fullCancIds.add((exc as any).session_id);
    } else {
      partialCancMap.set((exc as any).session_id, {
        date: (exc as any).date,
        yearLevels: (exc as any).cancelled_year_levels as number[],
        reason: (exc as any).reason ?? null,
      });
    }
  }

  // Active sessions = all sessions minus those with full cancellations this week
  const sessions = (sessionsData ?? [])
    .filter((row: any) => !fullCancIds.has(row.id as string))
    .map((row: any) => {
      const yl = row.year_levels;
      return {
        id: row.id as string,
        dayOfWeek: row.day_of_week as string,
        currentWeekDate: weekDates[row.day_of_week as string] ?? "",
        dinnerTime: row.dinner_time as string | null,
        startTime: row.start_time as string | null,
        endTime: row.end_time as string | null,
        building: row.building as string | null,
        room: row.room as string | null,
        yearLevels: yl != null
          ? Array.isArray(yl) ? (yl as number[]).map(y => `Yr ${y}`).join(", ") : String(yl)
          : null,
        managerName: row.manager_name as string | null,
        managerEmail: row.manager_email as string | null,
        managerMobile: row.manager_mobile as string | null,
        schoolName: (row.schools as { name?: string } | null)?.name ?? "Unknown",
        catererName: (row.caterers as { name?: string } | null)?.name ?? "Unknown",
        catererContactEmail: (row.caterers as { contact_email?: string } | null)?.contact_email ?? null,
        partialCancellation: partialCancMap.get(row.id as string) ?? null,
      };
    })
    .sort((a, b) => (DAY_ORDER[a.dayOfWeek] ?? 9) - (DAY_ORDER[b.dayOfWeek] ?? 9));

  // Cancelled sessions = full cancellations from last 30 days
  const cancelledSessions = (fullCancData ?? []).map((row: any) => ({
    id: row.id as string,
    date: row.date as string,
    reason: row.reason as string | null,
    schoolName: (row.sessions?.schools as { name?: string } | null)?.name ?? "Unknown",
    dayOfWeek: (row.sessions as { day_of_week?: string } | null)?.day_of_week ?? "Unknown",
  }));

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <Link
          href="/manage-data"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-4"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Manage Data
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Sessions</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {sessions.length} active · {cancelledSessions.length} cancelled in the last 30 days.
            </p>
          </div>
          <Link
            href="/exclusions/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7c3aed] text-white text-sm font-semibold hover:bg-[#6d28d9] transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Log exclusion
          </Link>
        </div>
      </div>

      <SessionsView sessions={sessions} cancelledSessions={cancelledSessions} />
    </div>
  );
}
