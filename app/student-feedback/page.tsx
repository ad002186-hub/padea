import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function NotFound({ school, day }: { school: string; day: string }) {
  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-full bg-[#2a2d3e] flex items-center justify-center mx-auto mb-5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-white mb-2">No active session found</h1>
        <p className="text-sm text-gray-400 leading-relaxed">
          No active session found for{school ? ` ${school}` : " this school"}{day ? ` on ${day}` : ""}.
          Please check with your session manager.
        </p>
      </div>
    </div>
  );
}

export default async function StudentFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ school?: string; day?: string }>;
}) {
  const params = await searchParams;
  const schoolParam = (params.school ?? "").trim();
  const dayParam = (params.day ?? "").trim();

  if (!schoolParam || !dayParam) {
    return <NotFound school={schoolParam} day={dayParam} />;
  }

  // 1. Find school by partial name match
  const { data: schoolRow } = await supabaseAdmin
    .from("schools")
    .select("id, name")
    .ilike("name", `%${schoolParam}%`)
    .limit(1)
    .maybeSingle();

  if (!schoolRow) return <NotFound school={schoolParam} day={dayParam} />;

  // 2. Find active session for this school + day
  const { data: session } = await supabaseAdmin
    .from("sessions")
    .select("id")
    .eq("school_id", schoolRow.id)
    .eq("day_of_week", dayParam)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!session) return <NotFound school={schoolParam} day={dayParam} />;

  // 3. Most recent sent order for this session
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id")
    .eq("session_id", session.id)
    .eq("status", "sent")
    .order("session_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!order) return <NotFound school={schoolParam} day={dayParam} />;

  redirect(
    `https://forms.fillout.com/t/r5TX6A84iAus?school=${encodeURIComponent(schoolParam)}&day=${encodeURIComponent(dayParam)}&order_id=${order.id}`
  );
}
