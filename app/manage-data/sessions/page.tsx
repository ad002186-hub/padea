import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import SessionsView from "./SessionsView";

export const revalidate = 0;

const DAY_ORDER: Record<string, number> = {
  Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6,
};

export default async function ManageSessionsPage() {
  noStore();

  const [{ data: sessionsData }, { data: fullCancData }, { data: partialCancData }] = await Promise.all([
    // All active sessions with full detail fields
    supabaseAdmin
      .from("sessions")
      .select("id, day_of_week, dinner_time, start_time, end_time, building, room, year_levels, manager_name, manager_email, manager_mobile, schools(name), caterers(name, contact_email)")
      .eq("is_active", true),

    // All full cancellations (cancelled_year_levels is null) — determines cancelled sessions
    supabaseAdmin
      .from("exclusions")
      .select("id, session_id, date, reason, sessions(day_of_week, schools(name))")
      .is("cancelled_year_levels", null)
      .order("date", { ascending: false }),

    // All partial cancellations — most recent per session, for badges on active rows
    supabaseAdmin
      .from("exclusions")
      .select("session_id, date, cancelled_year_levels, reason")
      .not("cancelled_year_levels", "is", null)
      .order("date", { ascending: false }),
  ]);

  // Sessions that have a full cancellation are excluded from the active list
  const fullCancSessionIds = new Set(
    (fullCancData ?? []).map((e: any) => e.session_id as string)
  );

  // Most recent partial cancellation per session (for active row badges)
  const partialCancMap = new Map<string, { date: string; yearLevels: number[]; reason: string | null }>();
  for (const exc of partialCancData ?? []) {
    const sid = (exc as any).session_id as string;
    if (!partialCancMap.has(sid)) {
      partialCancMap.set(sid, {
        date: (exc as any).date,
        yearLevels: (exc as any).cancelled_year_levels as number[],
        reason: (exc as any).reason ?? null,
      });
    }
  }

  // Active sessions = is_active=true AND no full cancellation exclusion exists
  const sessions = (sessionsData ?? [])
    .filter((row: any) => !fullCancSessionIds.has(row.id as string))
    .map((row: any) => {
      const yl = row.year_levels;
      return {
        id: row.id as string,
        dayOfWeek: row.day_of_week as string,
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

  // Cancelled sessions = all full cancellation exclusion records
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
              {sessions.length} active · {cancelledSessions.length} full cancellation{cancelledSessions.length !== 1 ? "s" : ""} on record.
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
