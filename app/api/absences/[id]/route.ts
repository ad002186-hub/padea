import { supabaseAdmin } from "@/lib/supabase";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;

  if (!rawId) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  const parts = rawId.split("::");
  if (parts.length !== 3) {
    return Response.json({ error: "invalid id format" }, { status: 400 });
  }

  const [student_id, session_id, date] = parts;

  const { error } = await supabaseAdmin
    .from("absences")
    .delete()
    .eq("student_id", student_id)
    .eq("session_id", session_id)
    .eq("date", date);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
