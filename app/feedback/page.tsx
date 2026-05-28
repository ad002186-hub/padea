export default function FeedbackPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          All Feedback
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Browse all submitted feedback from students and staff.
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] p-12 flex items-center justify-center">
        <p className="text-sm text-slate-400 dark:text-slate-500">No feedback to display yet.</p>
      </div>
    </div>
  );
}
