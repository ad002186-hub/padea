import { type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const schoolId = request.nextUrl.searchParams.get("school_id");
  if (!schoolId) {
    return Response.json({ error: "school_id is required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("student_sessions")
    .select("student_id, session_id, students!inner(name, school_id)")
    .eq("students.school_id", schoolId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const students = (data ?? []).map((row: any) => {
    const s = row.students as { name?: string } | null;
    const name = s?.name || "Unknown";
    return {
      ssId: `${row.student_id}:${row.session_id}`,
      student_id: row.student_id as string,
      session_id: row.session_id as string,
      name,
    };
  });

  return Response.json({ students });
}
