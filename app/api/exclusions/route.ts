import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  const { school_id, date, cancelled_year_levels, reason } = await request.json();

  if (!school_id || !date) {
    return Response.json({ error: "school_id and date are required" }, { status: 400 });
  }

  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayOfWeek = DAY_NAMES[new Date(date + "T12:00:00Z").getUTCDay()];

  const { data: session, error: sessionErr } = await supabaseAdmin
    .from("sessions")
    .select("id")
    .eq("school_id", school_id)
    .eq("day_of_week", dayOfWeek)
    .maybeSingle();

  if (sessionErr) return Response.json({ error: sessionErr.message }, { status: 500 });
  if (!session) return Response.json({ error: `No session found for ${dayOfWeek} at this school` }, { status: 404 });

  const { error } = await supabaseAdmin.from("exclusions").insert({
    session_id: session.id,
    date,
    cancelled_year_levels: cancelled_year_levels?.length ? cancelled_year_levels : null,
    reason: reason || null,
  });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
