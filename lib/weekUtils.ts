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
