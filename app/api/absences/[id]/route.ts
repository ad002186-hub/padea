import { supabaseAdmin } from "@/lib/supabase";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("absences")
    .delete()
    .eq("id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
