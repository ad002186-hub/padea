import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { notFound } from "next/navigation";

export const revalidate = 0;

function ScoreBar({ label, value, max = 5 }: { label: string; value: number; max?: number }) {
  const pct = (value / max) * 100;
  const color = pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-slate-500 dark:text-gray-400">{label}</span>
        <span className="text-sm font-semibold text-slate-900 dark:text-white">{value}/{max}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} at ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
}

export default async function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  noStore();
  const { id } = await params;

  const { data: score, error } = await supabaseAdmin
    .from("caterer_scores")
    .select(`
      id, food_quality, delivery_timing, presentation, notes, submitted_at,
      caterers(name),
      orders(session_date, sessions(day_of_week, schools(name)))
    `)
    .eq("id", id)
    .single();

  if (error || !score) notFound();

  const order = (score as any).orders as any;
  const schoolName = order?.sessions?.schools?.name ?? "Unknown";
  const sessionDay = order?.sessions?.day_of_week ?? "";
  const sessionDate = order?.session_date ?? "";
  const catererName = (score as any).caterers?.name ?? "Unknown";
  const weighted = ((score as any).food_quality * 0.50) + ((score as any).delivery_timing * 0.40) + ((score as any).presentation * 0.10);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Dashboard
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Feedback Details</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Submitted {formatDate((score as any).submitted_at)}
        </p>
      </div>

      {/* Session info */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] p-6 mb-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Session</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            ["School", schoolName],
            ["Day", sessionDay],
            ["Session date", sessionDate],
            ["Caterer", catererName],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-slate-400 dark:text-gray-500 mb-0.5">{label}</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{value || "—"}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Scores */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] p-6 mb-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Scores</h2>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{weighted.toFixed(1)}<span className="text-base font-normal text-slate-400 dark:text-gray-500">/5</span></p>
            <p className="text-xs text-slate-400 dark:text-gray-500">weighted average</p>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <ScoreBar label="Food Quality (50%)" value={(score as any).food_quality} />
          <ScoreBar label="Delivery Timing (40%)" value={(score as any).delivery_timing} />
          <ScoreBar label="Presentation (10%)" value={(score as any).presentation} />
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] p-6">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Comments</h2>
        {(score as any).notes ? (
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">"{(score as any).notes}"</p>
        ) : (
          <p className="text-sm text-slate-400 dark:text-gray-500 italic">No comments provided.</p>
        )}
      </div>
    </div>
  );
}
