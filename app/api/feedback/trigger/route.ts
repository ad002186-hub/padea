import { supabaseAdmin } from "@/lib/supabase";
import { feedbackFormEmail } from "@/lib/email-templates";
import { sendEmail } from "@/lib/ordering";

export const dynamic = "force-dynamic";

export async function GET() {
  const summary = { sent: 0, skipped: 0, errors: [] as string[] };

  const now = new Date();
  const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const todayDayName = DAY_NAMES[now.getDay()];
  const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD

  try {
    // Active sessions running today
    const { data: sessions, error } = await supabaseAdmin
      .from("sessions")
      .select("id, day_of_week, manager_name, manager_email, schools(name), caterers(name)")
      .eq("is_active", true)
      .eq("day_of_week", todayDayName);

    if (error) throw new Error(`Query sessions: ${error.message}`);

    for (const session of sessions ?? []) {
      try {
        // Skip if fully cancelled today
        const { data: exclusion } = await supabaseAdmin
          .from("exclusions")
          .select("id")
          .eq("session_id", session.id)
          .eq("date", todayStr)
          .is("cancelled_year_levels", null)
          .maybeSingle();

        if (exclusion) { summary.skipped++; continue; }

        // Skip if already sent today
        const { data: alreadySent } = await supabaseAdmin
          .from("survey_sends")
          .select("id")
          .eq("session_id", session.id)
          .eq("date", todayStr)
          .eq("form_type", "manager")
          .maybeSingle();

        if (alreadySent) { summary.skipped++; continue; }

        const managerEmail = (session as any).manager_email as string | null;
        if (!managerEmail) { summary.skipped++; continue; }

        // Most recent sent order for this session (for caterer name context)
        const { data: recentOrder } = await supabaseAdmin
          .from("orders")
          .select("id, caterers(name)")
          .eq("session_id", session.id)
          .eq("status", "sent")
          .order("session_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        const catererName =
          (recentOrder as any)?.caterers?.name ??
          (session as any).caterers?.name ??
          "the caterer";

        const schoolName = (session as any).schools?.name ?? "School";
        const formUrl = `https://forms.fillout.com/manager-feedback?session_id=${session.id}&date=${todayStr}`;

        await sendEmail({
          to: managerEmail,
          subject: `How did tonight's delivery go? — ${schoolName}`,
          html: feedbackFormEmail({
            managerName: (session as any).manager_name ?? "Manager",
            schoolName,
            catererName,
            sessionDate: todayStr,
            formUrl,
          }),
        });

        // Record the send so we don't send again today
        await supabaseAdmin.from("survey_sends").insert({
          session_id: session.id,
          date: todayStr,
          form_type: "manager",
          sent_to: managerEmail,
        });

        summary.sent++;
      } catch (err) {
        summary.errors.push(
          `Session ${(session as any).id}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  } catch (err) {
    summary.errors.push(`Fatal: ${err instanceof Error ? err.message : String(err)}`);
  }

  return Response.json(summary);
}
