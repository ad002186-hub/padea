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
  buildOrderEmailHtml,
  type SessionRow,
  type MenuItem,
} from "@/lib/ordering";

export const dynamic = "force-dynamic";

interface ProcessedSession {
  session: SessionRow;
  sessionDate: string;
  mealCount: number;
  students: Awaited<ReturnType<typeof getAttendingStudents>>;
}

interface OrderResult {
  sessionId: string;
  orderId: string;
  selectedItems: { itemId: string; quantity: number }[];
}

export async function GET() {
  const summary = {
    ordersPlaced: 0,
    emailsSent: 0,
    flagsCreated: 0,
    skippedSessions: 0,
    errors: [] as string[],
  };

  try {
    // ── 1. Fetch all active sessions ─────────────────────────────────────────
    const sessions = await getNextWeekSessions();

    // ── 2. Process each session (exclusions + attending students) ────────────
    const processed: ProcessedSession[] = [];

    for (const session of sessions) {
      try {
        const sessionDate = getNextWeekDate(session.day_of_week);
        const exclusion = await checkExclusion(session.id, sessionDate);

        if (exclusion.fullyCancelled) {
          summary.skippedSessions++;
          continue;
        }

        const students = await getAttendingStudents(session.id, sessionDate, exclusion.excludedYearLevels);
        if (students.length === 0) { summary.skippedSessions++; continue; }

        processed.push({ session, sessionDate, mealCount: students.length, students });
      } catch (err) {
        summary.errors.push(`Session ${session.id} pre-processing: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // ── 3. Group by caterer ──────────────────────────────────────────────────
    const catererGroups = new Map<string, ProcessedSession[]>();
    for (const ps of processed) {
      const cid = ps.session.caterer_id;
      if (!catererGroups.has(cid)) catererGroups.set(cid, []);
      catererGroups.get(cid)!.push(ps);
    }

    // ── 4. Check minimum orders; flag + skip caterers below minimum ──────────
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
            details: `Total meals across all sessions: ${totalMeals}. Minimum required for 4 items: ${info.minRequired}. Order has been skipped.`,
          });
          summary.flagsCreated++;
        } catch (err) {
          summary.errors.push(`Flag creation for ${catererId}: ${err instanceof Error ? err.message : String(err)}`);
        }
        skippedCaterers.add(catererId);
        summary.skippedSessions += group.length;
      }
    }

    // ── 5. Fetch menu items per active caterer ───────────────────────────────
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

    // ── 6. AI meal selection + insert orders ────────────────────────────────
    const orderResultsByCaterer = new Map<string, (ProcessedSession & { orderId: string; selectedItems: { itemId: string; quantity: number }[] })[]>();

    for (const [catererId, group] of catererGroups) {
      if (skippedCaterers.has(catererId)) continue;
      const menuItems = menuItemsByCaterer.get(catererId) ?? [];
      const itemCount = itemCountByCaterer.get(catererId) ?? 4;

      for (const ps of group) {
        try {
          const restrictions = buildRestrictionSet(ps.students);
          const tasteScores = await getTasteScores(menuItems.map((m) => m.id), ps.session.school_id);
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
            catererName: ps.session.caterers?.name ?? "Caterer",
          });

          // Insert order row
          const caterer = ps.session.caterers;
          const emailTo = caterer?.contact_email ?? "";
          const emailCc = !caterer?.no_cc && caterer?.cc_email ? caterer.cc_email : null;

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
            })
            .select("id")
            .single();
          if (orderErr) throw new Error(`Insert order: ${orderErr.message}`);

          // Insert order_items
          const { error: itemsErr } = await supabaseAdmin
            .from("order_items")
            .insert(selectedItems.map((i) => ({ order_id: order.id, menu_item_id: i.itemId, quantity: i.quantity })));
          if (itemsErr) throw new Error(`Insert order_items: ${itemsErr.message}`);

          summary.ordersPlaced++;

          if (!orderResultsByCaterer.has(catererId)) orderResultsByCaterer.set(catererId, []);
          orderResultsByCaterer.get(catererId)!.push({ ...ps, orderId: order.id, selectedItems });
        } catch (err) {
          summary.errors.push(`Session ${ps.session.id} meal selection: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    // ── 7. Send one email per caterer covering all their sessions ────────────
    for (const [catererId, results] of orderResultsByCaterer) {
      if (results.length === 0) continue;
      const caterer = results[0].session.caterers;
      if (!caterer?.contact_email) {
        summary.errors.push(`Caterer ${catererId}: no contact_email — email skipped`);
        continue;
      }

      try {
        const menuItems = menuItemsByCaterer.get(catererId) ?? [];
        const html = buildOrderEmailHtml(
          caterer,
          results.map((r) => ({
            session: r.session,
            sessionDate: r.sessionDate,
            selectedItems: r.selectedItems,
            menuItems,
            mealCount: r.mealCount,
          }))
        );

        const cc = !caterer.no_cc && caterer.cc_email ? caterer.cc_email : undefined;
        const schoolNames = [...new Set(results.map((r) => r.session.schools?.name ?? "School"))];
        const firstDate = results[0].sessionDate;

        await sendEmail({
          to: caterer.contact_email,
          cc,
          subject: `Padea Catering Order — ${schoolNames.join(", ")} — Week of ${firstDate}`,
          html,
        });

        // Mark orders as sent
        const orderIds = results.map((r) => r.orderId);
        await supabaseAdmin
          .from("orders")
          .update({ email_sent_at: new Date().toISOString() })
          .in("id", orderIds);

        summary.emailsSent++;
      } catch (err) {
        summary.errors.push(`Email to ${caterer.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    summary.errors.push(`Fatal: ${err instanceof Error ? err.message : String(err)}`);
  }

  return Response.json(summary);
}
