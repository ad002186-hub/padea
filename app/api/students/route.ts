import { type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const schoolId = request.nextUrl.searchParams.get("school_id");
  if (!schoolId) return Response.json({ error: "school_id is required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("student_sessions")
    .select("student_id, session_id, students!inner(name, school_id)")
    .eq("students.school_id", schoolId);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const students = (data ?? []).map((row: any) => {
    const s = row.students as { name?: string } | null;
    return {
      ssId: `${row.student_id}:${row.session_id}`,
      student_id: row.student_id as string,
      session_id: row.session_id as string,
      name: s?.name || "Unknown",
    };
  });

  return Response.json({ students });
}

export async function POST(request: Request) {
  const {
    school_id, day_of_week, name, year_level, email,
    catering_opted_out, dietary_restrictions,
    parent_name, parent_email, parent_mobile,
  } = await request.json();

  if (!school_id || !day_of_week || !name) {
    return Response.json({ error: "school_id, day_of_week, and name are required" }, { status: 400 });
  }

  const { data: session, error: sessionErr } = await supabaseAdmin
    .from("sessions")
    .select("id")
    .eq("school_id", school_id)
    .eq("day_of_week", day_of_week)
    .maybeSingle();

  if (sessionErr) return Response.json({ error: sessionErr.message }, { status: 500 });
  if (!session) return Response.json({ error: `No session found for ${day_of_week} at this school` }, { status: 404 });

  const { data: student, error: studentErr } = await supabaseAdmin
    .from("students")
    .insert({
      name,
      school_id,
      year_level: year_level ? Number(year_level) : null,
      email: email || null,
      catering_opted_out: catering_opted_out ?? false,
      parent_name: parent_name || null,
      parent_email: parent_email || null,
      parent_mobile: parent_mobile || null,
    })
    .select("id")
    .single();

  if (studentErr) return Response.json({ error: studentErr.message }, { status: 500 });

  if (dietary_restrictions?.length) {
    const { error: dietErr } = await supabaseAdmin
      .from("student_dietary_restrictions")
      .insert(dietary_restrictions.map((r: string) => ({ student_id: student.id, restriction: r })));
    if (dietErr) return Response.json({ error: dietErr.message }, { status: 500 });
  }

  const { error: ssErr } = await supabaseAdmin
    .from("student_sessions")
    .insert({ student_id: student.id, session_id: session.id });
  if (ssErr) return Response.json({ error: ssErr.message }, { status: 500 });

  return Response.json({ success: true, id: student.id });
}
