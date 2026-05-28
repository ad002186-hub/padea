import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { school_eligibility, ...catererData } = await request.json();

  if (Object.keys(catererData).length > 0) {
    const { error } = await supabaseAdmin.from("caterers").update(catererData).eq("id", id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  if (school_eligibility !== undefined) {
    const { error: delErr } = await supabaseAdmin
      .from("caterer_school_eligibility")
      .delete()
      .eq("caterer_id", id);
    if (delErr) return Response.json({ error: delErr.message }, { status: 500 });

    if (school_eligibility.length > 0) {
      const { error: insErr } = await supabaseAdmin
        .from("caterer_school_eligibility")
        .insert(school_eligibility.map((s: { school_id: string; is_current: boolean }) => ({
          caterer_id: id,
          school_id: s.school_id,
          is_current: s.is_current,
        })));
      if (insErr) return Response.json({ error: insErr.message }, { status: 500 });
    }
  }

  return Response.json({ success: true });
}
