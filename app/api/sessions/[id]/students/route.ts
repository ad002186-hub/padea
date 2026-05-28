import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentWeekRange } from "@/lib/weekUtils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { monday, friday } = getCurrentWeekRange();

  const { data: sessionStudents, error: ssErr } = await supabaseAdmin
    .from("student_sessions")
    .select("student_id, students(id, name, year_level, is_active)")
    .eq("session_id", id);

  if (ssErr) return Response.json({ error: ssErr.message }, { status: 500 });

  const studentIds = (sessionStudents ?? []).map((ss: any) => ss.student_id as string);

  let absentIds = new Set<string>();
  if (studentIds.length > 0) {
    const { data: absences } = await supabaseAdmin
      .from("absences")
      .select("student_id")
      .in("student_id", studentIds)
      .eq("session_id", id)
      .gte("date", monday)
      .lte("date", friday);
    absentIds = new Set((absences ?? []).map((a: any) => a.student_id as string));
  }

  const active: { id: string; name: string; yearLevel: number | null }[] = [];
  const absentOrInactive: { id: string; name: string; yearLevel: number | null; reason: string }[] = [];

  for (const ss of sessionStudents ?? []) {
    const s = (ss as any).students as { id: string; name: string; year_level: number | null; is_active: boolean } | null;
    if (!s) continue;
    const entry = { id: s.id, name: s.name, yearLevel: s.year_level };
    if (!s.is_active) {
      absentOrInactive.push({ ...entry, reason: "Inactive" });
    } else if (absentIds.has((ss as any).student_id)) {
      absentOrInactive.push({ ...entry, reason: "Absent this week" });
    } else {
      active.push(entry);
    }
  }

  active.sort((a, b) => a.name.localeCompare(b.name));
  absentOrInactive.sort((a, b) => a.name.localeCompare(b.name));

  return Response.json({ active, absentOrInactive });
}
