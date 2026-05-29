import { supabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/ordering";
import { flagEmail } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

const DELIVERY_TIMING_SCORES: Record<string, number> = {
  "Early (earlier than 10 minutes before break)": 5,
  "On time (5-10 minute before break)": 5,
  "Slightly late (Less than 5 minutes before break)": 4,
  "Late (0-10 minutes after break)": 2,
  "Very late (+15 minutes after break)": 1,
};

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
    console.error("Fillout webhook payload:", JSON.stringify(body, null, 2));
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const questions: { name: string; value: any }[] = body?.submission?.questions ?? [];
  const urlParams: { name: string; value: string }[] = body?.submission?.urlParameters ?? [];

  function q(name: string) {
    return questions.find(x => x.name === name)?.value ?? null;
  }

  // 1–3: Extract and convert scores
  const food_quality = Number(q("Food Quality")) || null;
  const presentation = Number(q("Food Presentation")) || null;
  const deliveryRaw: string | null = q(" Delivery timing"); // leading space intentional
  const delivery_timing = deliveryRaw ? (DELIVERY_TIMING_SCORES[deliveryRaw] ?? 3) : 3;
  const notes: string | null = q("Any other comments") || null;

  if (!food_quality || !presentation) {
    console.error("Missing required scores — food_quality:", food_quality, "presentation:", presentation);
    return Response.json({ error: "Missing required score fields" }, { status: 400 });
  }

  // 5–6: Extract session_id
  const session_id = urlParams.find(p => p.name === "session_id")?.value ?? null;
  if (!session_id) {
    return Response.json({ error: "session_id not found in urlParameters" }, { status: 400 });
  }

  // 7: Get session + caterer
  const { data: session, error: sessionErr } = await supabaseAdmin
    .from("sessions")
    .select("id, caterer_id, caterers(id, name)")
    .eq("id", session_id)
    .single();

  if (sessionErr || !session) {
    console.error("Session not found:", session_id, sessionErr?.message);
    return Response.json({ error: "Session not found" }, { status: 400 });
  }

  const caterer_id = session.caterer_id as string;
  const catererName = (session.caterers as any)?.name ?? "Unknown";

  // 8: Most recent sent order for this session
  const { data: recentOrder } = await supabaseAdmin
    .from("orders")
    .select("id")
    .eq("session_id", session_id)
    .eq("status", "sent")
    .order("session_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const order_id = recentOrder?.id ?? null;

  // 9: Insert score
  const { error: insertErr } = await supabaseAdmin.from("caterer_scores").insert({
    caterer_id,
    order_id,
    food_quality,
    delivery_timing,
    presentation,
    notes,
    submitted_at: new Date().toISOString(),
  });

  if (insertErr) {
    console.error("Failed to insert caterer_scores:", insertErr.message);
    return Response.json({ error: insertErr.message }, { status: 500 });
  }

  // 10: Rolling average — last 5 scores
  const { data: recent } = await supabaseAdmin
    .from("caterer_scores")
    .select("food_quality, delivery_timing, presentation, submitted_at")
    .eq("caterer_id", caterer_id)
    .order("submitted_at", { ascending: false })
    .limit(5);

  if (recent && recent.length > 0) {
    const weightedPerRow = recent.map((s: any) =>
      s.food_quality * 0.50 + s.delivery_timing * 0.40 + s.presentation * 0.10
    );
    const avg = weightedPerRow.reduce((a, b) => a + b, 0) / weightedPerRow.length;

    if (avg < 3.0) {
      const details = `Rolling average score: ${avg.toFixed(2)}/5.0 based on the last ${recent.length} session${recent.length !== 1 ? "s" : ""}. Immediate review recommended.`;

      await supabaseAdmin.from("flags").insert({
        type: "caterer_quality",
        caterer_id,
        session_id,
        title: `Caterer quality alert — ${catererName}`,
        details,
      });

      // Normalise 1–5 scores to 0–1 for the email template's percentage display
      const emailScores = recent.map((s: any) => ({
        food_quality: s.food_quality / 5,
        delivery_timing: s.delivery_timing / 5,
        presentation: s.presentation / 5,
        weightedScore: (s.food_quality * 0.50 + s.delivery_timing * 0.40 + s.presentation * 0.10) / 5,
        submitted_at: s.submitted_at as string,
      }));

      try {
        await sendEmail({
          to: process.env.COORDINATOR_EMAIL ?? "dylan@padea.com.au",
          subject: `[Padea Flag] Caterer quality alert — ${catererName}`,
          html: flagEmail({
            coordinatorName: "Dylan",
            flagType: "caterer_quality",
            title: `Caterer quality alert — ${catererName}`,
            details,
            catererScores: emailScores,
          }),
        });
      } catch (emailErr) {
        console.error("Flag email failed:", emailErr instanceof Error ? emailErr.message : String(emailErr));
      }
    }
  }

  return Response.json({ success: true });
}
