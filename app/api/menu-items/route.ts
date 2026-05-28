import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json();
  const { error } = await supabaseAdmin.from("menu_items").insert({ ...body, is_active: true });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
