import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  const { school_eligibility, ...catererData } = await request.json();

  const { data: caterer, error } = await supabaseAdmin
    .from("caterers")
    .insert(catererData)
    .select("id")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  if (school_eligibility?.length) {
    const rows = school_eligibility.map((s: { school_id: string; is_current: boolean }) => ({
      caterer_id: caterer.id,
      school_id: s.school_id,
      is_current: s.is_current,
    }));
    const { error: eligErr } = await supabaseAdmin.from("caterer_school_eligibility").insert(rows);
    if (eligErr) return Response.json({ error: eligErr.message }, { status: 500 });
  }

  return Response.json({ success: true, id: caterer.id });
}
