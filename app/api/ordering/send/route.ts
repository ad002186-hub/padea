import { supabaseAdmin } from "@/lib/supabase";
import { orderEmail, managerOrderEmail } from "@/lib/email-templates";
import { sendEmail, getArrivalTime } from "@/lib/ordering";

export const dynamic = "force-dynamic";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
function formatDisplayDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export async function GET() {
  const summary = {
    emailsSent: 0,
    managerEmailsSent: 0,
    ordersUpdated: 0,
    errors: [] as string[],
  };

  try {
    // Query all pending/approved orders regardless of date — the generate script
    // already scopes orders to the correct week, so no date filter is needed here.
    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select(`
        id, session_date, meal_count, email_to, email_cc, caterer_id,
        sessions(id, day_of_week, dinner_time, manager_name, manager_mobile, manager_email, school_id, schools(name)),
        caterers(id, name, contact_name, contact_email, no_cc, cc_email),
        order_items(id, quantity, assigned_students, menu_items(id, name))
      `)
      .in("status", ["pending", "approved"])
      .order("session_date", { ascending: true });

    if (error) throw new Error(`Query orders: ${error.message}`);

    // Group by caterer_id
    const catererGroups = new Map<string, typeof orders>();
    for (const order of orders ?? []) {
      const cid = order.caterer_id;
      if (!catererGroups.has(cid)) catererGroups.set(cid, []);
      catererGroups.get(cid)!.push(order);
    }

    // Send one caterer email per caterer covering all their sessions
    for (const [, group] of catererGroups) {
      const firstOrder = group[0];
      const caterer = firstOrder.caterers as any;
      if (!caterer?.contact_email) {
        summary.errors.push(`Caterer ${firstOrder.caterer_id}: no contact_email — skipped`);
        continue;
      }

      try {
        const emailSessions = group.map((order: any) => {
          const session = order.sessions as any;
          return {
            schoolName: session?.schools?.name ?? "Unknown",
            sessionDate: formatDisplayDate(order.session_date),
            arrivalTime: getArrivalTime(session?.dinner_time),
            managerName: session?.manager_name ?? null,
            managerMobile: session?.manager_mobile ?? null,
            items: (order.order_items ?? []).map((oi: any) => ({
              name: oi.menu_items?.name ?? "Unknown",
              quantity: oi.quantity as number,
            })),
            totalMeals: order.meal_count as number,
          };
        });

        const html = orderEmail({
          catererName: caterer.name,
          contactName: caterer.contact_name ?? caterer.name,
          sessions: emailSessions,
        });

        const cc = !caterer.no_cc && caterer.cc_email ? caterer.cc_email : undefined;
        const schoolNames = [...new Set(group.map((o: any) => o.sessions?.schools?.name ?? "School"))];

        await sendEmail({
          to: caterer.contact_email,
          cc,
          subject: `Padea Catering Order — ${schoolNames.join(", ")}`,
          html,
        });

        // Update all orders in this group to 'sent'
        const sentAt = new Date().toISOString();
        const orderIds = group.map((o: any) => o.id);
        await supabaseAdmin
          .from("orders")
          .update({
            status: "sent",
            email_sent_at: sentAt,
            email_to: caterer.contact_email,
            email_cc: cc ?? null,
          })
          .in("id", orderIds);

        summary.emailsSent++;
        summary.ordersUpdated += group.length;

        // Send manager order email per session in this group
        for (const order of group) {
          const session = (order as any).sessions as any;
          const managerEmail = session?.manager_email;
          if (!managerEmail) continue;

          try {
            const dietaryMeals = ((order as any).order_items ?? [])
              .filter((oi: any) => Array.isArray(oi.assigned_students) && oi.assigned_students.length > 0)
              .map((oi: any) => ({
                mealName: oi.menu_items?.name ?? "Unknown",
                students: (oi.assigned_students as { name: string; restrictions: string[] }[]).map(s => ({
                  name: s.name,
                  restrictions: s.restrictions ?? [],
                })),
              }));

            await sendEmail({
              to: managerEmail,
              subject: `Meal delivery details — ${session.schools?.name ?? "School"}, ${session.day_of_week} ${formatDisplayDate((order as any).session_date)}`,
              html: managerOrderEmail({
                managerName: session.manager_name ?? "Manager",
                schoolName: session.schools?.name ?? "School",
                sessionDate: formatDisplayDate((order as any).session_date),
                catererName: caterer.name,
                dinnerTime: session.dinner_time ?? null,
                arrivalTime: getArrivalTime(session.dinner_time),
                totalMeals: (order as any).meal_count as number,
                dietaryMeals,
              }),
            });
            summary.managerEmailsSent++;
          } catch (err) {
            summary.errors.push(
              `Manager email session ${(order as any).session_id}: ${err instanceof Error ? err.message : String(err)}`
            );
          }
        }
      } catch (err) {
        summary.errors.push(`Caterer ${caterer.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    summary.errors.push(`Fatal: ${err instanceof Error ? err.message : String(err)}`);
  }

  return Response.json(summary);
}
