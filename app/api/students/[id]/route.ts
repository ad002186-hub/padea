import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { dietary_restrictions, ...studentData } = await request.json();

  if (Object.keys(studentData).length > 0) {
    const { error } = await supabaseAdmin.from("students").update(studentData).eq("id", id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  if (dietary_restrictions !== undefined) {
    const { error: delErr } = await supabaseAdmin
      .from("student_dietary_restrictions")
      .delete()
      .eq("student_id", id);
    if (delErr) return Response.json({ error: delErr.message }, { status: 500 });

    if (dietary_restrictions.length > 0) {
      const { error: insErr } = await supabaseAdmin
        .from("student_dietary_restrictions")
        .insert(dietary_restrictions.map((r: string) => ({ student_id: id, restriction: r })));
      if (insErr) return Response.json({ error: insErr.message }, { status: 500 });
    }
  }

  return Response.json({ success: true });
}
