import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
    console.error("Student feedback webhook:", JSON.stringify(body, null, 2));
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const questions: { name: string; value: any }[] = body?.submission?.questions ?? [];
  const urlParams: { name: string; value: string }[] = body?.submission?.urlParameters ?? [];

  function param(name: string) {
    return urlParams.find(p => p.name === name)?.value ?? null;
  }
  function question(name: string) {
    return questions.find(q => q.name === name)?.value ?? null;
  }

  const orderId = param("order_id");
  if (!orderId) return Response.json({ error: "order_id missing" }, { status: 400 });

  const ratingRaw = question("Overall rating");
  const rating = Number(ratingRaw);
  if (!rating || rating < 1 || rating > 5) {
    return Response.json({ error: "Overall rating missing or invalid" }, { status: 400 });
  }

  // Get order with session and order_items
  const { data: order, error: orderErr } = await supabaseAdmin
    .from("orders")
    .select("id, session_id, order_items(menu_item_id)")
    .eq("id", orderId)
    .single();

  if (orderErr || !order) {
    return Response.json({ error: "Order not found" }, { status: 400 });
  }

  // Get school_id from the session
  const { data: session, error: sessionErr } = await supabaseAdmin
    .from("sessions")
    .select("school_id")
    .eq("id", (order as any).session_id)
    .single();

  if (sessionErr || !session) {
    return Response.json({ error: "Session not found" }, { status: 400 });
  }

  const schoolId = (session as any).school_id as string;
  const today = new Date().toISOString().split("T")[0];
  const orderItems = ((order as any).order_items ?? []) as { menu_item_id: string }[];

  // Upsert taste score for each menu item in the order
  for (const item of orderItems) {
    const menuItemId = item.menu_item_id;

    const { data: existing } = await supabaseAdmin
      .from("item_taste_scores")
      .select("liked, neutral, disliked")
      .eq("menu_item_id", menuItemId)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (existing) {
      const update: Record<string, number | string> = { last_served: today };
      if (rating >= 4)      update.liked    = (existing.liked    ?? 0) + 1;
      else if (rating === 3) update.neutral  = (existing.neutral  ?? 0) + 1;
      else                   update.disliked = (existing.disliked ?? 0) + 1;

      await supabaseAdmin
        .from("item_taste_scores")
        .update(update)
        .eq("menu_item_id", menuItemId)
        .eq("school_id", schoolId);
    } else {
      await supabaseAdmin.from("item_taste_scores").insert({
        menu_item_id: menuItemId,
        school_id: schoolId,
        liked:    rating >= 4 ? 1 : 0,
        neutral:  rating === 3 ? 1 : 0,
        disliked: rating <= 2 ? 1 : 0,
        last_served: today,
      });
    }
  }

  return Response.json({ success: true });
}
