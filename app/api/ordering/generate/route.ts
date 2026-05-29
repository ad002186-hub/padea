import { supabaseAdmin } from "@/lib/supabase";
import {
  getNextWeekSessions,
  getNextWeekDate,
  checkExclusion,
  getAttendingStudents,
  buildRestrictionSet,
  checkMinimumOrders,
  getTasteScores,
  getOrderHistory,
  selectMealsWithAI,
  sendEmail,
  createFlag,
  type SessionRow,
  type MenuItem,
} from "@/lib/ordering";
import { pendingOrdersEmail } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

interface ProcessedSession {
  session: SessionRow;
  sessionDate: string;
  mealCount: number;
  students: Awaited<ReturnType<typeof getAttendingStudents>>;
}

export async function GET() {
  const summary = {
    ordersGenerated: 0,
    reviewEmailSent: false,
    flagsCreated: 0,
    skippedSessions: 0,
    errors: [] as string[],
  };

  try {
    // 1. Fetch all active sessions
    const sessions = await getNextWeekSessions();

    // 2. Check exclusions + get attending students
    const processed: ProcessedSession[] = [];
    for (const session of sessions) {
      try {
        const sessionDate = getNextWeekDate(session.day_of_week);
        const exclusion = await checkExclusion(session.id, sessionDate);
        if (exclusion.fullyCancelled) { summary.skippedSessions++; continue; }
        const students = await getAttendingStudents(session.id, sessionDate, exclusion.excludedYearLevels);
        if (students.length === 0) { summary.skippedSessions++; continue; }
        processed.push({ session, sessionDate, mealCount: students.length, students });
      } catch (err) {
        summary.errors.push(`Session ${session.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 3. Group by caterer
    const catererGroups = new Map<string, ProcessedSession[]>();
    for (const ps of processed) {
      if (!catererGroups.has(ps.session.caterer_id)) catererGroups.set(ps.session.caterer_id, []);
      catererGroups.get(ps.session.caterer_id)!.push(ps);
    }

    // 4. Check minimum orders — flag and skip below-minimum caterers
    const skippedCaterers = new Set<string>();
    const itemCountByCaterer = new Map<string, 4 | 5 | 6>();

    for (const [catererId, group] of catererGroups) {
      const caterer = group[0].session.caterers;
      const totalMeals = group.reduce((s, ps) => s + ps.mealCount, 0);
      const info = checkMinimumOrders(caterer, totalMeals);
      itemCountByCaterer.set(catererId, info.itemCount);

      if (!info.meetsMinimum) {
        try {
          await createFlag({
            type: "minimum_order",
            sessionId: group[0].session.id,
            catererId,
            title: `Minimum order not met — ${caterer?.name ?? catererId}`,
            details: `Total meals: ${totalMeals}. Minimum required for 4 items: ${info.minRequired}.`,
          });
          summary.flagsCreated++;
        } catch (err) {
          summary.errors.push(`Flag for ${catererId}: ${err instanceof Error ? err.message : String(err)}`);
        }
        skippedCaterers.add(catererId);
        summary.skippedSessions += group.length;
      }
    }

    // 5. Fetch menu items per active caterer
    const menuItemsByCaterer = new Map<string, MenuItem[]>();
    for (const [catererId] of catererGroups) {
      if (skippedCaterers.has(catererId)) continue;
      const { data } = await supabaseAdmin
        .from("menu_items")
        .select("id, name, is_gluten_free, is_dairy_free, is_nut_free, is_vegetarian, contains_pork, contains_beef, contains_lamb, contains_fish, contains_shellfish, contains_seafood")
        .eq("caterer_id", catererId)
        .eq("is_active", true)
        .eq("dietary_flags_known", true);
      menuItemsByCaterer.set(catererId, (data ?? []) as MenuItem[]);
    }

    // 6. AI meal selection + insert orders (status='pending')
    const pendingOrdersSummary: {
      schoolName: string; day: string; catererName: string;
      mealCount: number; items: { name: string; quantity: number }[];
      sessionDate: string;
    }[] = [];

    for (const [catererId, group] of catererGroups) {
      if (skippedCaterers.has(catererId)) continue;
      const menuItems = menuItemsByCaterer.get(catererId) ?? [];
      const itemCount = itemCountByCaterer.get(catererId) ?? 4;
      const caterer = group[0].session.caterers;

      for (const ps of group) {
        try {
          const restrictions = buildRestrictionSet(ps.students);
          const tasteScores = await getTasteScores(menuItems.map(m => m.id), ps.session.school_id);
          const orderHistory = await getOrderHistory(ps.session.id);

          const selectedItems = await selectMealsWithAI({
            menuItems,
            restrictions,
            tasteScores,
            orderHistory,
            mealCount: ps.mealCount,
            itemCount,
            schoolName: ps.session.schools?.name ?? "School",
            sessionDate: ps.sessionDate,
            catererName: caterer?.name ?? "Caterer",
          });

          const emailTo = caterer?.contact_email ?? "";
          const emailCc = !caterer?.no_cc && caterer?.cc_email ? caterer.cc_email : null;

          // Insert order with status='pending'
          const { data: order, error: orderErr } = await supabaseAdmin
            .from("orders")
            .insert({
              session_id: ps.session.id,
              caterer_id: catererId,
              order_date: new Date().toISOString().split("T")[0],
              session_date: ps.sessionDate,
              meal_count: ps.mealCount,
              email_to: emailTo,
              email_cc: emailCc,
              status: "pending",
            })
            .select("id")
            .single();
          if (orderErr) throw new Error(`Insert order: ${orderErr.message}`);

          const { error: itemsErr } = await supabaseAdmin
            .from("order_items")
            .insert(selectedItems.map(i => ({ order_id: order.id, menu_item_id: i.itemId, quantity: i.quantity })));
          if (itemsErr) throw new Error(`Insert order_items: ${itemsErr.message}`);

          summary.ordersGenerated++;

          const itemMap = new Map(menuItems.map(m => [m.id, m.name]));
          pendingOrdersSummary.push({
            schoolName: ps.session.schools?.name ?? "Unknown",
            day: ps.session.day_of_week,
            catererName: caterer?.name ?? "Unknown",
            mealCount: ps.mealCount,
            sessionDate: ps.sessionDate,
            items: selectedItems.map(i => ({ name: itemMap.get(i.itemId) ?? i.itemId, quantity: i.quantity })),
          });
        } catch (err) {
          summary.errors.push(`Session ${ps.session.id}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    // 7. Send pending orders review email to coordinator
    if (pendingOrdersSummary.length > 0) {
      try {
        await sendEmail({
          to: process.env.COORDINATOR_EMAIL ?? "dylan@padea.com.au",
          subject: `Review required — meal orders for week of ${pendingOrdersSummary[0].sessionDate}`,
          html: pendingOrdersEmail({
            coordinatorName: "Dylan",
            weekDate: pendingOrdersSummary[0].sessionDate,
            orders: pendingOrdersSummary,
            approveUrl: "https://padea.vercel.app/orders/pending",
          }),
        });
        summary.reviewEmailSent = true;
      } catch (err) {
        summary.errors.push(`Review email: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    summary.errors.push(`Fatal: ${err instanceof Error ? err.message : String(err)}`);
  }

  return Response.json(summary);
}
