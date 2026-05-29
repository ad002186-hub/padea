"use client";

import { useState } from "react";

export type PendingFlag = {
  id: string;
  title: string;
  details: string | null;
  type: string;
  created_at: string;
};

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function FlagDot({ type }: { type: string }) {
  const isRed = type === "caterer_quality";
  return (
    <span className={`shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full ${
      isRed ? "text-[#ef4444] bg-red-500/10 dark:bg-red-500/15" : "text-[#f59e0b] bg-amber-500/10 dark:bg-amber-500/15"
    }`}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    </span>
  );
}

export default function PendingFlagsSection({ flags: initial }: { flags: PendingFlag[] }) {
  const [flags, setFlags] = useState(initial);
  const [resolving, setResolving] = useState<Set<string>>(new Set());

  async function markResolved(id: string) {
    setResolving((prev) => new Set(prev).add(id));
    setFlags((prev) => prev.filter((f) => f.id !== id));
    try {
      await fetch(`/api/flags/${id}`, { method: "PATCH" });
    } finally {
      setResolving((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  }

  if (flags.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] p-8 flex items-center justify-center">
        <p className="text-sm text-slate-400 dark:text-slate-500">No pending flags. All clear.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {flags.map((flag) => (
        <div key={flag.id}
          className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] p-4">
          <FlagDot type={flag.type} />
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold mb-0.5 uppercase tracking-wide ${
              flag.type === "caterer_quality" ? "text-[#ef4444]" : "text-[#f59e0b]"
            }`}>
              {flag.type.replace(/_/g, " ")}
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">{flag.title}</p>
            {flag.details && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">{flag.details}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0 pt-0.5">
            <span className="text-xs text-slate-400 dark:text-slate-500">{timeAgo(flag.created_at)}</span>
            <button
              onClick={() => markResolved(flag.id)}
              disabled={resolving.has(flag.id)}
              className="text-xs font-medium text-[#10b981] hover:text-emerald-600 transition-colors disabled:opacity-40"
            >
              {resolving.has(flag.id) ? "Saving…" : "Mark resolved"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
