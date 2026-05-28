import Link from "next/link";

const logCards = [
  {
    title: "Add New Student",
    description: "Register a student and assign them to a school, year group, and dietary profile.",
    href: "/students/new",
  },
  {
    title: "Add New Caterer",
    description: "Onboard a catering provider with contact details, menu capabilities, and coverage area.",
    href: "/caterers/new",
  },
  {
    title: "Log Absence",
    description: "Record a student absence to automatically adjust today's meal count.",
    href: "/absences/new",
  },
  {
    title: "Log Exclusion",
    description: "Document a student exclusion event with relevant details and supervisor sign-off.",
    href: "/exclusions/new",
  },
  {
    title: "Add Menu Item",
    description: "Add a new meal to the menu, including allergen info, nutritional data, and caterer assignment.",
    href: "/menu-items/new",
  },
];

export default function LogDataPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Log Data</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Select an action below to add or update records in the system.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {logCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group flex items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] px-6 py-5 hover:border-slate-300 dark:hover:border-[#3a3f56] hover:shadow-sm dark:hover:bg-[#252840] transition-all"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                {card.title}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-snug">
                {card.description}
              </p>
            </div>
            <span className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 dark:border-[#2a2d3e] bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-slate-500 group-hover:border-[#7c3aed] group-hover:bg-[#7c3aed] group-hover:text-white transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
