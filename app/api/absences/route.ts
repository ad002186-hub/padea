import { supabaseAdmin } from "@/lib/supabase";

type AbsenceInsert = {
  student_id: string;
  session_id: string;
  date: string;
};

export async function POST(request: Request) {
  const body = await request.json();
  const absences: AbsenceInsert[] = body.absences;

  if (!Array.isArray(absences) || absences.length === 0) {
    return Response.json({ error: "absences array is required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("absences").insert(absences);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
