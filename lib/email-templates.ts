// ─── Order Email ────────────────────────────────────────────────────────────

export interface OrderEmailSession {
  schoolName: string;
  sessionDate: string;
  arrivalTime: string;
  building?: string | null;
  managerName?: string | null;
  managerMobile?: string | null;
  items: { name: string; quantity: number }[];
  totalMeals: number;
}

export interface OrderEmailParams {
  catererName: string;
  contactName: string;
  sessions: OrderEmailSession[];
}

function header(title: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e2235;">
      <tr>
        <td style="padding:20px 40px;">
          <span style="color:#7c3aed;font-size:24px;font-weight:bold;letter-spacing:2px;font-family:Arial,sans-serif;">PADEA</span>
          <span style="color:#475569;font-size:13px;margin-left:12px;font-family:Arial,sans-serif;">${title}</span>
        </td>
      </tr>
    </table>`;
}

function footer(note: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;">
      <tr>
        <td style="padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:12px;font-family:Arial,sans-serif;">
          ${note}
        </td>
      </tr>
    </table>`;
}

function deliveryRow(label: string, value: string | null | undefined): string {
  if (!value) return "";
  return `
    <tr>
      <td style="padding:3px 0;color:#c4b5fd;font-size:12px;font-family:Arial,sans-serif;width:130px;">${label}</td>
      <td style="padding:3px 0;color:#ffffff;font-size:13px;font-family:Arial,sans-serif;font-weight:500;">${value}</td>
    </tr>`;
}

export function orderEmail({ catererName, contactName, sessions }: OrderEmailParams): string {
  const sessionSections = sessions.map((s, idx) => {
    const itemRows = s.items.map((item, i) => `
      <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f8fafc"};">
        <td style="padding:10px 16px;font-size:14px;color:#1e293b;font-family:Arial,sans-serif;">${item.name}</td>
        <td style="padding:10px 16px;font-size:14px;color:#1e293b;font-family:Arial,sans-serif;text-align:right;font-weight:600;">${item.quantity}</td>
      </tr>`).join("");

    return `
      ${idx > 0 ? '<hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;">' : ""}
      <h3 style="margin:0 0 4px;font-size:16px;color:#0f172a;font-family:Arial,sans-serif;">${s.schoolName}</h3>
      <p style="margin:0 0 16px;font-size:13px;color:#64748b;font-family:Arial,sans-serif;">${s.sessionDate}</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:12px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="text-align:left;padding:10px 16px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.6px;font-family:Arial,sans-serif;font-weight:600;">Menu Item</th>
            <th style="text-align:right;padding:10px 16px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.6px;font-family:Arial,sans-serif;font-weight:600;">Qty</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
          <tr style="background:#f1f5f9;border-top:2px solid #e2e8f0;">
            <td style="padding:10px 16px;font-size:14px;color:#0f172a;font-family:Arial,sans-serif;font-weight:700;">Total</td>
            <td style="padding:10px 16px;font-size:14px;color:#7c3aed;font-family:Arial,sans-serif;font-weight:700;text-align:right;">${s.totalMeals} meals</td>
          </tr>
        </tbody>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#7c3aed;border-radius:8px;">
        <tr>
          <td style="padding:16px 20px;">
            <p style="margin:0 0 10px;color:#c4b5fd;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;font-family:Arial,sans-serif;font-weight:600;">Delivery Details</p>
            <table cellpadding="0" cellspacing="0" width="100%">
              ${deliveryRow("School", s.schoolName)}
              ${deliveryRow("Date", s.sessionDate)}
              ${deliveryRow("Arrival time", s.arrivalTime)}
              ${deliveryRow("Building", s.building)}
              ${deliveryRow("Manager", s.managerName)}
              ${deliveryRow("Manager mobile", s.managerMobile)}
            </table>
            <p style="margin:12px 0 0;color:#c4b5fd;font-size:12px;font-family:Arial,sans-serif;line-height:1.6;">
              For any concerns during delivery, please contact the on-site manager directly using the details above.
            </p>
          </td>
        </tr>
      </table>`;
  }).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;">
  ${header("Catering Order")}
  <table width="600" cellpadding="0" cellspacing="0" align="center" style="background:#ffffff;margin:24px auto;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <tr>
      <td style="padding:32px 40px;">
        <p style="margin:0 0 8px;font-size:15px;color:#0f172a;font-family:Arial,sans-serif;">Hi ${contactName},</p>
        <p style="margin:0 0 28px;font-size:14px;color:#475569;font-family:Arial,sans-serif;line-height:1.6;">
          Please find below the catering order for ${sessions.length > 1 ? "the following sessions" : `<strong>${sessions[0]?.schoolName}</strong>`} next week.
          Please confirm receipt and contact us if you have any questions.
        </p>
        ${sessionSections}
      </td>
    </tr>
  </table>
  ${footer("This is an automated order generated by the Padea catering system. · <a href='https://padea.vercel.app' style='color:#7c3aed;'>padea.vercel.app</a>")}
</body>
</html>`;
}


// ─── Flag Email ──────────────────────────────────────────────────────────────

export interface FlagEmailScore {
  food_quality: number;
  delivery_timing: number;
  presentation: number;
  weightedScore: number;
  submitted_at: string;
}

export interface FlagEmailCaterer {
  name: string;
  region?: string;
  currentlyServes: boolean;
}

export interface FlagEmailParams {
  coordinatorName: string;
  flagType: string;
  title: string;
  details: string;
  catererScores?: FlagEmailScore[];
  replacementCaterers?: FlagEmailCaterer[];
}

function pct(n: number) { return `${Math.round(n * 100)}%`; }
function scoreCell(n: number) {
  const color = n >= 0.8 ? "#10b981" : n >= 0.6 ? "#f59e0b" : "#ef4444";
  return `<td style="padding:8px 12px;font-size:13px;font-family:Arial,sans-serif;color:${color};font-weight:600;text-align:center;">${pct(n)}</td>`;
}

export function flagEmail({ coordinatorName, flagType, title, details, catererScores, replacementCaterers }: FlagEmailParams): string {
  const typeLabel = flagType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  const scoresTable = catererScores && catererScores.length > 0 ? `
    <h4 style="margin:24px 0 8px;font-size:13px;color:#0f172a;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:0.5px;">Last ${catererScores.length} Session Scores</h4>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background:#f1f5f9;">
          <th style="text-align:left;padding:8px 12px;font-size:11px;color:#64748b;font-family:Arial,sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Date</th>
          <th style="text-align:center;padding:8px 12px;font-size:11px;color:#64748b;font-family:Arial,sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Food</th>
          <th style="text-align:center;padding:8px 12px;font-size:11px;color:#64748b;font-family:Arial,sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Delivery</th>
          <th style="text-align:center;padding:8px 12px;font-size:11px;color:#64748b;font-family:Arial,sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Presentation</th>
          <th style="text-align:center;padding:8px 12px;font-size:11px;color:#64748b;font-family:Arial,sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Overall</th>
        </tr>
      </thead>
      <tbody>
        ${catererScores.map((s, i) => `
          <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f8fafc"};">
            <td style="padding:8px 12px;font-size:13px;color:#475569;font-family:Arial,sans-serif;">${new Date(s.submitted_at).toLocaleDateString()}</td>
            ${scoreCell(s.food_quality)}${scoreCell(s.delivery_timing)}${scoreCell(s.presentation)}${scoreCell(s.weightedScore)}
          </tr>`).join("")}
      </tbody>
    </table>` : "";

  const replacementsTable = replacementCaterers && replacementCaterers.length > 0 ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#7c3aed;border-radius:8px;margin-top:20px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 10px;color:#c4b5fd;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;font-family:Arial,sans-serif;font-weight:600;">Potential Replacement Caterers</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${replacementCaterers.map(c => `
            <tr>
              <td style="padding:4px 0;color:#ffffff;font-size:13px;font-family:Arial,sans-serif;font-weight:500;">${c.name}</td>
              ${c.region ? `<td style="color:#c4b5fd;font-size:12px;font-family:Arial,sans-serif;">${c.region}</td>` : "<td></td>"}
              <td style="text-align:right;"><span style="background:${c.currentlyServes ? "#10b981" : "#475569"};color:#fff;font-size:11px;padding:2px 8px;border-radius:99px;font-family:Arial,sans-serif;">${c.currentlyServes ? "Currently serves" : "Not current"}</span></td>
            </tr>`).join("")}
        </table>
      </td></tr>
    </table>` : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;">
  ${header("Action Required")}
  <table width="600" cellpadding="0" cellspacing="0" align="center" style="background:#ffffff;margin:24px auto;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <tr><td style="padding:32px 40px;">
      <p style="margin:0 0 20px;font-size:15px;color:#0f172a;font-family:Arial,sans-serif;">Hi ${coordinatorName},</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;margin-bottom:20px;">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0 0 6px;color:#b45309;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;font-family:Arial,sans-serif;font-weight:700;">⚠ ${typeLabel} Flag</p>
          <p style="margin:0 0 8px;font-size:16px;color:#92400e;font-family:Arial,sans-serif;font-weight:700;">Action required: ${title}</p>
          <p style="margin:0;font-size:13px;color:#78350f;font-family:Arial,sans-serif;line-height:1.6;">${details}</p>
        </td></tr>
      </table>
      ${scoresTable}${replacementsTable}
      <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
        <tr><td style="background:#7c3aed;border-radius:8px;">
          <a href="https://padea.vercel.app/flags" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;font-family:Arial,sans-serif;">Review in Dashboard →</a>
        </td></tr>
      </table>
      <p style="margin:0;font-size:13px;color:#94a3b8;font-family:Arial,sans-serif;">If no action is taken by Thursday 12pm, the order will proceed as normal.</p>
    </td></tr>
  </table>
  ${footer("Padea Catering System · <a href='https://padea.vercel.app/flags' style='color:#7c3aed;'>View all flags</a>")}
</body>
</html>`;
}


// ─── Pending Orders Review Email ─────────────────────────────────────────────

export interface PendingOrdersEmailParams {
  coordinatorName: string;
  weekDate: string;
  orders: {
    schoolName: string;
    day: string;
    catererName: string;
    mealCount: number;
    items: { name: string; quantity: number }[];
  }[];
  approveUrl: string;
}

export function pendingOrdersEmail({ coordinatorName, weekDate, orders, approveUrl }: PendingOrdersEmailParams): string {
  const orderRows = orders.map((o, i) => `
    <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f8fafc"};">
      <td style="padding:10px 16px;font-size:14px;color:#1e293b;font-family:Arial,sans-serif;font-weight:500;">${o.schoolName}</td>
      <td style="padding:10px 16px;font-size:14px;color:#475569;font-family:Arial,sans-serif;">${o.day}</td>
      <td style="padding:10px 16px;font-size:14px;color:#475569;font-family:Arial,sans-serif;">${o.catererName}</td>
      <td style="padding:10px 16px;font-size:14px;color:#475569;font-family:Arial,sans-serif;text-align:right;font-weight:600;">${o.mealCount}</td>
    </tr>`).join("");

  const totalMeals = orders.reduce((s, o) => s + o.mealCount, 0);

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;">
  ${header("Review Required")}
  <table width="600" cellpadding="0" cellspacing="0" align="center" style="background:#ffffff;margin:24px auto;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <tr><td style="padding:32px 40px;">
      <p style="margin:0 0 8px;font-size:15px;color:#0f172a;font-family:Arial,sans-serif;">Hi ${coordinatorName},</p>
      <p style="margin:0 0 24px;font-size:14px;color:#475569;font-family:Arial,sans-serif;line-height:1.6;">
        The automated system has generated meal orders for the week of <strong>${weekDate}</strong>.
        Please review and approve by <strong>Thursday 12pm</strong>.
      </p>
      <h3 style="margin:0 0 12px;font-size:14px;color:#0f172a;font-family:Arial,sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Order Summary</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:20px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="text-align:left;padding:10px 16px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.6px;font-family:Arial,sans-serif;font-weight:600;">School</th>
            <th style="text-align:left;padding:10px 16px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.6px;font-family:Arial,sans-serif;font-weight:600;">Day</th>
            <th style="text-align:left;padding:10px 16px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.6px;font-family:Arial,sans-serif;font-weight:600;">Caterer</th>
            <th style="text-align:right;padding:10px 16px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.6px;font-family:Arial,sans-serif;font-weight:600;">Meals</th>
          </tr>
        </thead>
        <tbody>
          ${orderRows}
          <tr style="background:#f1f5f9;border-top:2px solid #e2e8f0;">
            <td colspan="3" style="padding:10px 16px;font-size:14px;color:#0f172a;font-family:Arial,sans-serif;font-weight:700;">Total</td>
            <td style="padding:10px 16px;font-size:14px;color:#7c3aed;font-family:Arial,sans-serif;font-weight:700;text-align:right;">${totalMeals} meals</td>
          </tr>
        </tbody>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;margin-bottom:24px;">
        <tr><td style="padding:14px 18px;">
          <p style="margin:0;font-size:13px;color:#92400e;font-family:Arial,sans-serif;font-weight:500;">
            ⚠ If orders are not approved by Thursday 12pm, they will be sent to caterers automatically.
          </p>
        </td></tr>
      </table>
      <table cellpadding="0" cellspacing="0">
        <tr><td style="background:#7c3aed;border-radius:8px;">
          <a href="${approveUrl}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;font-family:Arial,sans-serif;">Review orders →</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
  ${footer("Padea Catering System · <a href='${approveUrl}' style='color:#7c3aed;'>Review pending orders</a>")}
</body>
</html>`;
}


// ─── Manager Order Email ──────────────────────────────────────────────────────

export interface ManagerOrderEmailParams {
  managerName: string;
  schoolName: string;
  sessionDate: string;
  catererName: string;
  dinnerTime?: string | null;
  arrivalTime?: string | null;
  building?: string | null;
  totalMeals: number;
  dietaryMeals: {
    mealName: string;
    students: { name: string; restrictions: string[] }[];
  }[];
}

export function managerOrderEmail({
  managerName, schoolName, sessionDate, catererName,
  arrivalTime, building, totalMeals, dietaryMeals,
}: ManagerOrderEmailParams): string {
  const hasDietary = dietaryMeals.length > 0;

  let allRows = 0;
  const dietaryTableRows = dietaryMeals.flatMap(meal =>
    meal.students.map(student => {
      const rowBg = allRows++ % 2 === 0 ? "#ffffff" : "#f8fafc";
      return `
        <tr style="background:${rowBg};">
          <td style="padding:8px 12px;font-size:13px;color:#1e293b;font-family:Arial,sans-serif;">${meal.mealName}</td>
          <td style="padding:8px 12px;font-size:13px;color:#475569;font-family:Arial,sans-serif;">${student.name}</td>
          <td style="padding:8px 12px;">
            ${student.restrictions.map(r => `<span style="background:#f59e0b;color:#fff;font-size:11px;padding:2px 8px;border-radius:99px;font-family:Arial,sans-serif;display:inline-block;margin-right:4px;">${r}</span>`).join("")}
          </td>
        </tr>`;
    })
  ).join("");

  const dietarySection = hasDietary ? `
    <h3 style="margin:24px 0 10px;font-size:14px;color:#0f172a;font-family:Arial,sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Dietary Requirement Meals</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:12px;">
      <thead>
        <tr style="background:#f1f5f9;">
          <th style="text-align:left;padding:8px 12px;font-size:11px;color:#64748b;font-family:Arial,sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Meal</th>
          <th style="text-align:left;padding:8px 12px;font-size:11px;color:#64748b;font-family:Arial,sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Student</th>
          <th style="text-align:left;padding:8px 12px;font-size:11px;color:#64748b;font-family:Arial,sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Requirement</th>
        </tr>
      </thead>
      <tbody>${dietaryTableRows}</tbody>
    </table>
    <p style="margin:0 0 20px;font-size:13px;color:#475569;font-family:Arial,sans-serif;line-height:1.6;">
      All other students may choose from any remaining general meals on the day.
    </p>` : `
    <p style="margin:20px 0;font-size:13px;color:#475569;font-family:Arial,sans-serif;line-height:1.6;">
      No specific dietary requirements for this session — students may choose freely on the day.
    </p>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;">
  ${header("Meal Delivery")}
  <table width="600" cellpadding="0" cellspacing="0" align="center" style="background:#ffffff;margin:24px auto;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <tr><td style="padding:32px 40px;">
      <p style="margin:0 0 8px;font-size:15px;color:#0f172a;font-family:Arial,sans-serif;">Hi ${managerName},</p>
      <p style="margin:0 0 24px;font-size:14px;color:#475569;font-family:Arial,sans-serif;line-height:1.6;">
        Meals have been ordered for tonight's session. Please see the delivery details and dietary requirements below.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#7c3aed;border-radius:8px;margin-bottom:24px;">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0 0 10px;color:#c4b5fd;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;font-family:Arial,sans-serif;font-weight:600;">Delivery Details</p>
          <table cellpadding="0" cellspacing="0" width="100%">
            ${deliveryRow("School", schoolName)}
            ${deliveryRow("Date", sessionDate)}
            ${deliveryRow("Caterer", catererName)}
            ${deliveryRow("Expected arrival", arrivalTime)}
            ${deliveryRow("Location", building)}
            ${deliveryRow("Total meals", String(totalMeals))}
          </table>
        </td></tr>
      </table>

      ${dietarySection}

      <p style="margin:0;font-size:13px;color:#475569;font-family:Arial,sans-serif;line-height:1.6;">
        If there are any issues with the delivery, please contact the caterer directly.
      </p>
    </td></tr>
  </table>
  ${footer("Padea Catering System · <a href='https://padea.vercel.app' style='color:#7c3aed;'>padea.vercel.app</a>")}
</body>
</html>`;
}


// ─── Feedback Form Email ─────────────────────────────────────────────────────

export interface FeedbackFormEmailParams {
  managerName: string;
  schoolName: string;
  catererName: string;
  sessionDate: string;
  formUrl: string;
}

export function feedbackFormEmail({
  managerName, schoolName, catererName, formUrl,
}: FeedbackFormEmailParams): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;">
  ${header("Feedback")}
  <table width="600" cellpadding="0" cellspacing="0" align="center" style="background:#ffffff;margin:24px auto;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <tr><td style="padding:40px 40px;text-align:center;">
      <p style="margin:0 0 8px;font-size:15px;color:#0f172a;font-family:Arial,sans-serif;text-align:left;">Hi ${managerName},</p>
      <p style="margin:0 0 32px;font-size:14px;color:#475569;font-family:Arial,sans-serif;line-height:1.6;text-align:left;">
        Thanks for running tonight's <strong>${schoolName}</strong> session. We'd love your feedback on the
        <strong>${catererName}</strong> delivery — it takes less than 60 seconds.
      </p>

      <table cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 32px;">
        <tr><td style="background:#7c3aed;border-radius:12px;">
          <a href="${formUrl}" style="display:inline-block;padding:16px 40px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;font-family:Arial,sans-serif;">
            Rate tonight's delivery →
          </a>
        </td></tr>
      </table>

      <p style="margin:0;font-size:13px;color:#94a3b8;font-family:Arial,sans-serif;line-height:1.6;">
        Your feedback helps us improve meal quality and delivery reliability for students.
      </p>
    </td></tr>
  </table>
  ${footer("Padea Catering System · <a href='https://padea.vercel.app' style='color:#7c3aed;'>padea.vercel.app</a>")}
</body>
</html>`;
}
