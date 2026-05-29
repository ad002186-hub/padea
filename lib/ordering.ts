import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase";
import { orderEmail, flagEmail } from "@/lib/email-templates";
import type { OrderEmailSession } from "@/lib/email-templates";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionRow {
  id: string;
  day_of_week: string;
  dinner_time: string | null;
  manager_name: string | null;
  manager_mobile: string | null;
  school_id: string;
  caterer_id: string;
  schools: { name: string } | null;
  caterers: {
    id: string;
    name: string;
    contact_name: string | null;
    contact_email: string | null;
    cc_name: string | null;
    cc_email: string | null;
    no_cc: boolean;
    min_meals_4_items: number | null;
    min_meals_5_items: number | null;
    min_meals_6_items: number | null;
  } | null;
}

export interface AttendingStudent {
  studentId: string;
  name: string;
  yearLevel: number | null;
  dietaryRestrictions: string[];
}

export interface MenuItem {
  id: string;
  name: string;
  is_gluten_free: boolean;
  is_dairy_free: boolean;
  is_nut_free: boolean;
  is_vegetarian: boolean;
  contains_pork: boolean;
  contains_beef: boolean;
  contains_lamb: boolean;
  contains_fish: boolean;
  contains_shellfish: boolean;
  contains_seafood: boolean;
}

export interface RestrictionSet {
  allRestrictions: string[];
  requireGlutenFree: boolean;
  requireDairyFree: boolean;
  requireNutFree: boolean;
  requireVegetarian: boolean;
  noBeef: boolean;
  noPork: boolean;
  noLamb: boolean;
  noFish: boolean;
  noShellfish: boolean;
  noSeafood: boolean;
}

// ─── Date / Time Helpers ─────────────────────────────────────────────────────

// ORDERING_WEEK_OVERRIDE: set to a Monday date (YYYY-MM-DD) to generate orders for that
// specific week. Used for demo purposes only.
function getTargetMonday(): Date {
  const override = process.env.ORDERING_WEEK_OVERRIDE;
  if (override) {
    const [y, m, d] = override.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    if (!isNaN(date.getTime())) {
      date.setHours(0, 0, 0, 0);
      return date;
    }
  }
  // Default: calculate next week's Monday from today
  const today = new Date();
  const todayDay = today.getDay(); // 0=Sun
  const daysToNextMonday = todayDay === 0 ? 1 : 8 - todayDay;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysToNextMonday);
  nextMonday.setHours(0, 0, 0, 0);
  return nextMonday;
}

export function getNextWeekDate(dayOfWeek: string): string {
  const nextMonday = getTargetMonday();
  const offsets: Record<string, number> = {
    Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3,
    Friday: 4, Saturday: 5, Sunday: 6,
  };
  const result = new Date(nextMonday);
  result.setDate(nextMonday.getDate() + (offsets[dayOfWeek] ?? 0));
  return result.toISOString().split("T")[0];
}

function formatDisplayDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${months[m - 1]} ${d}, ${y}`;
}

export function getArrivalTime(dinnerTime: string | null): string {
  if (!dinnerTime) return "";
  const [h, m] = dinnerTime.split(":").map(Number);
  let am = m - 7, ah = h;
  if (am < 0) { am += 60; ah -= 1; }
  const ampm = ah >= 12 ? "PM" : "AM";
  const h12 = ah % 12 || 12;
  return `${h12}:${String(am).padStart(2, "0")} ${ampm}`;
}

// ─── Database Queries ─────────────────────────────────────────────────────────

export async function getNextWeekSessions(): Promise<SessionRow[]> {
  // getNextWeekDate (called per session) uses getTargetMonday(), which respects
  // ORDERING_WEEK_OVERRIDE — so all date calculations for this run target the same week.
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select(`
      id, day_of_week, dinner_time, manager_name, manager_mobile, school_id, caterer_id,
      schools(name),
      caterers(id, name, contact_name, contact_email, cc_name, cc_email, no_cc,
               min_meals_4_items, min_meals_5_items, min_meals_6_items)
    `)
    .eq("is_active", true);
  if (error) throw new Error(`getNextWeekSessions: ${error.message}`);
  return (data ?? []) as unknown as SessionRow[];
}

export async function checkExclusion(
  sessionId: string,
  date: string
): Promise<{ fullyCancelled: boolean; excludedYearLevels: number[] | null }> {
  const { data } = await supabaseAdmin
    .from("exclusions")
    .select("cancelled_year_levels")
    .eq("session_id", sessionId)
    .eq("date", date)
    .maybeSingle();

  if (!data) return { fullyCancelled: false, excludedYearLevels: null };
  if (data.cancelled_year_levels === null) return { fullyCancelled: true, excludedYearLevels: null };
  return { fullyCancelled: false, excludedYearLevels: data.cancelled_year_levels as number[] };
}

export async function getAttendingStudents(
  sessionId: string,
  date: string,
  excludedYearLevels: number[] | null
): Promise<AttendingStudent[]> {
  const { data: ss, error } = await supabaseAdmin
    .from("student_sessions")
    .select(`
      student_id,
      students(id, name, year_level, catering_opted_out, is_active,
               student_dietary_restrictions(restriction))
    `)
    .eq("session_id", sessionId);

  if (error) throw new Error(`getAttendingStudents: ${error.message}`);

  const studentIds = (ss ?? []).map((r: any) => r.student_id as string);

  let absentIds = new Set<string>();
  if (studentIds.length > 0) {
    const { data: abs } = await supabaseAdmin
      .from("absences")
      .select("student_id")
      .eq("session_id", sessionId)
      .eq("date", date)
      .in("student_id", studentIds);
    absentIds = new Set((abs ?? []).map((a: any) => a.student_id as string));
  }

  return (ss ?? [])
    .filter((r: any) => {
      const s = r.students;
      if (!s || !s.is_active || s.catering_opted_out) return false;
      if (absentIds.has(r.student_id)) return false;
      if (excludedYearLevels && s.year_level && excludedYearLevels.includes(s.year_level)) return false;
      return true;
    })
    .map((r: any) => ({
      studentId: r.student_id,
      name: r.students.name,
      yearLevel: r.students.year_level ?? null,
      dietaryRestrictions: (r.students.student_dietary_restrictions ?? []).map((d: any) => d.restriction as string),
    }));
}

export async function getTasteScores(menuItemIds: string[], schoolId: string): Promise<Map<string, number>> {
  if (menuItemIds.length === 0) return new Map();
  const { data } = await supabaseAdmin
    .from("item_taste_scores")
    .select("menu_item_id, liked, neutral, disliked, last_served")
    .in("menu_item_id", menuItemIds)
    .eq("school_id", schoolId);

  const scores = new Map<string, number>();
  const now = Date.now();

  for (const row of data ?? []) {
    const total = row.liked + row.neutral + row.disliked;
    const laplace = (row.liked + 1) / (total + 2);
    let decay = 1;
    if (row.last_served) {
      const weeksSince = (now - new Date(row.last_served).getTime()) / (7 * 24 * 3600 * 1000);
      decay = Math.max(0.5, 1 - weeksSince / 16);
    }
    scores.set(row.menu_item_id, 0.5 + (laplace - 0.5) * decay);
  }
  return scores;
}

export async function getOrderHistory(sessionId: string, weeksBack = 4): Promise<Set<string>> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - weeksBack * 7);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const { data: orders } = await supabaseAdmin
    .from("orders")
    .select("id")
    .eq("session_id", sessionId)
    .gte("session_date", cutoffStr);

  if (!orders || orders.length === 0) return new Set();

  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("menu_item_id")
    .in("order_id", orders.map((o: any) => o.id));

  return new Set((items ?? []).map((i: any) => i.menu_item_id as string));
}

// ─── Business Logic ───────────────────────────────────────────────────────────

export function buildRestrictionSet(students: AttendingStudent[]): RestrictionSet {
  const all = new Set<string>();
  for (const s of students) for (const r of s.dietaryRestrictions) all.add(r);
  const has = (r: string) => all.has(r);
  return {
    allRestrictions: [...all],
    requireGlutenFree: has("Gluten Free"),
    requireDairyFree: has("Dairy Free"),
    requireNutFree: has("Nut Free"),
    requireVegetarian: has("Vegetarian"),
    noBeef: has("No Beef") || has("No Red Meat"),
    noPork: has("No Pork") || has("Halal"),
    noLamb: has("No Red Meat"),
    noFish: has("No Fish") || has("No Seafood"),
    noShellfish: has("No Shellfish") || has("No Seafood") || has("Halal"),
    noSeafood: has("No Seafood"),
  };
}

export function isItemSafe(item: MenuItem, r: RestrictionSet): boolean {
  if (r.requireGlutenFree && !item.is_gluten_free) return false;
  if (r.requireDairyFree && !item.is_dairy_free) return false;
  if (r.requireNutFree && !item.is_nut_free) return false;
  if (r.requireVegetarian && !item.is_vegetarian) return false;
  if (r.noBeef && item.contains_beef) return false;
  if (r.noPork && item.contains_pork) return false;
  if (r.noLamb && item.contains_lamb) return false;
  if (r.noFish && item.contains_fish) return false;
  if (r.noShellfish && item.contains_shellfish) return false;
  if (r.noSeafood && (item.contains_seafood || item.contains_fish || item.contains_shellfish)) return false;
  return true;
}

export function checkMinimumOrders(
  caterer: SessionRow["caterers"],
  totalMeals: number
): { meetsMinimum: boolean; itemCount: 4 | 5 | 6; totalMeals: number; minRequired: number } {
  const min4 = caterer?.min_meals_4_items ?? 0;
  const min5 = caterer?.min_meals_5_items ?? null;
  const min6 = caterer?.min_meals_6_items ?? null;

  let itemCount: 4 | 5 | 6 = 4;
  if (min6 !== null && totalMeals >= min6) itemCount = 6;
  else if (min5 !== null && totalMeals >= min5) itemCount = 5;

  return { meetsMinimum: totalMeals >= min4, itemCount, totalMeals, minRequired: min4 };
}

export async function selectMealsWithAI(params: {
  menuItems: MenuItem[];
  restrictions: RestrictionSet;
  tasteScores: Map<string, number>;
  orderHistory: Set<string>;
  mealCount: number;
  itemCount: number;
  schoolName: string;
  sessionDate: string;
  catererName: string;
}): Promise<{ itemId: string; quantity: number }[]> {
  const { menuItems, restrictions, tasteScores, orderHistory, mealCount, itemCount, schoolName, sessionDate, catererName } = params;

  const safeItems = menuItems.filter((m) => isItemSafe(m, restrictions));
  const recentNames = menuItems.filter((m) => orderHistory.has(m.id)).map((m) => m.name);

  const menuList = safeItems.map((m) => {
    const score = tasteScores.get(m.id) ?? 0.5;
    const tags: string[] = [];
    if (m.is_gluten_free) tags.push("GF");
    if (m.is_dairy_free) tags.push("DF");
    if (m.is_nut_free) tags.push("NF");
    if (m.is_vegetarian) tags.push("Veg");
    if (m.contains_pork) tags.push("pork");
    if (m.contains_beef) tags.push("beef");
    if (m.contains_lamb) tags.push("lamb");
    if (m.contains_fish) tags.push("fish");
    if (m.contains_shellfish) tags.push("shellfish");
    if (m.contains_seafood) tags.push("seafood");
    return `- ${m.id}: ${m.name} | taste:${score.toFixed(2)} | ${tags.join(", ") || "no tags"}`;
  }).join("\n");

  const prompt = `You are selecting meals for ${schoolName} on ${sessionDate}.
Caterer: ${catererName}
Total meals needed: ${mealCount}
Select exactly ${itemCount} menu items. Return ONLY a JSON array like: [{"itemId":"uuid","quantity":number}]
Quantities must sum to exactly ${mealCount}.

Safe menu items (dietary restrictions already filtered):
${menuList || "No safe items found."}

Dietary restrictions this session (already applied to menu above):
${restrictions.allRestrictions.length > 0 ? restrictions.allRestrictions.join(", ") : "None"}

Do NOT include these recently ordered items (avoid repetition):
${recentNames.length > 0 ? recentNames.join(", ") : "None"}

Maximise taste scores. Distribute quantities reasonably (no item should have 0 or all meals).`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: "You are a meal selection assistant for Padea, a school tutoring company. Select meals that satisfy ALL dietary restrictions, maximise student satisfaction based on taste scores, and avoid items ordered recently. Respond ONLY with a valid JSON array, no other text.",
    messages: [{ role: "user", content: prompt }],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text : "";
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error(`AI did not return valid JSON. Response: ${text.slice(0, 200)}`);

  const parsed: { itemId: string; quantity: number }[] = JSON.parse(match[0]);
  const total = parsed.reduce((s, i) => s + i.quantity, 0);
  if (total !== mealCount) {
    // Adjust last item to make quantities sum correctly
    parsed[parsed.length - 1].quantity += mealCount - total;
  }
  return parsed;
}

// ─── Communication ────────────────────────────────────────────────────────────

export async function sendEmail({
  to, cc, subject, html,
}: {
  to: string;
  cc?: string;
  subject: string;
  html: string;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: "onboarding@resend.dev", // TODO: replace with verified domain email before production
    to: [to],
    cc: cc ? [cc] : undefined,
    subject,
    html,
  });
}

export async function createFlag({
  type, sessionId, catererId, title, details,
}: {
  type: string;
  sessionId: string | null;
  catererId: string | null;
  title: string;
  details: string;
}) {
  const { data: flag, error } = await supabaseAdmin
    .from("flags")
    .insert({ type, session_id: sessionId, caterer_id: catererId, title, details })
    .select("id")
    .single();
  if (error) throw new Error(`createFlag insert: ${error.message}`);

  let catererScores;
  let replacementCaterers;

  if (type === "caterer_quality" && catererId) {
    const { data: scores } = await supabaseAdmin
      .from("caterer_scores")
      .select("food_quality, delivery_timing, presentation, submitted_at")
      .eq("caterer_id", catererId)
      .order("submitted_at", { ascending: false })
      .limit(5);

    catererScores = (scores ?? []).map((s: any) => ({
      food_quality: s.food_quality,
      delivery_timing: s.delivery_timing,
      presentation: s.presentation,
      weightedScore: (s.food_quality + s.delivery_timing + s.presentation) / 3,
      submitted_at: s.submitted_at,
    }));

    if (sessionId) {
      const { data: session } = await supabaseAdmin
        .from("sessions")
        .select("school_id")
        .eq("id", sessionId)
        .single();

      if (session) {
        const { data: replacements } = await supabaseAdmin
          .from("caterer_school_eligibility")
          .select("caterer_id, is_current, caterers(name)")
          .eq("school_id", session.school_id)
          .neq("caterer_id", catererId);

        replacementCaterers = (replacements ?? []).map((r: any) => ({
          name: (r.caterers as { name: string })?.name ?? "Unknown",
          currentlyServes: r.is_current as boolean,
        }));
      }
    }
  }

  await sendEmail({
    to: process.env.COORDINATOR_EMAIL ?? "dylan@padea.com.au",
    subject: `[Padea Flag] ${title}`,
    html: flagEmail({
      coordinatorName: "Dylan",
      flagType: type,
      title,
      details,
      catererScores,
      replacementCaterers,
    }),
  });

  return flag;
}

// ─── Build Order Email ────────────────────────────────────────────────────────

export function buildOrderEmailHtml(
  caterer: NonNullable<SessionRow["caterers"]>,
  sessions: {
    session: SessionRow;
    sessionDate: string;
    selectedItems: { itemId: string; quantity: number }[];
    menuItems: MenuItem[];
    mealCount: number;
  }[]
): string {
  const emailSessions: OrderEmailSession[] = sessions.map(({ session, sessionDate, selectedItems, menuItems, mealCount }) => {
    const itemMap = new Map(menuItems.map((m) => [m.id, m.name]));
    return {
      schoolName: session.schools?.name ?? "Unknown School",
      sessionDate: formatDisplayDate(sessionDate),
      arrivalTime: getArrivalTime(session.dinner_time),
      managerName: session.manager_name,
      managerMobile: session.manager_mobile,
      items: selectedItems.map((i) => ({ name: itemMap.get(i.itemId) ?? i.itemId, quantity: i.quantity })),
      totalMeals: mealCount,
    };
  });

  return orderEmail({
    catererName: caterer.name,
    contactName: caterer.contact_name ?? caterer.name,
    sessions: emailSessions,
  });
}
