export function getCurrentWeekRange(): { monday: string; friday: string } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysFromMonday);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  function fmt(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  return { monday: fmt(monday), friday: fmt(friday) };
}

/** Returns a map of day name → YYYY-MM-DD for the current Mon–Fri. */
export function getWeekDates(): Record<string, string> {
  const { monday } = getCurrentWeekRange();
  const [y, m, d] = monday.split("-").map(Number);
  const names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const result: Record<string, string> = {};
  for (let i = 0; i < 5; i++) {
    const date = new Date(y, m - 1, d + i);
    result[names[i]] = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  return result;
}
