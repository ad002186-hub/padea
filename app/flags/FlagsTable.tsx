"use client";

import { useState } from "react";

export type Flag = {
  id: string;
  title: string;
  details: string | null;
  type: string;
  created_at: string;
  is_resolved: boolean;
  resolved_at: string | null;
};

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const STATUS_OPTIONS = [
  { value: "unresolved", label: "Unresolved" },
  { value: "resolved", label: "Resolved" },
  { value: "all", label: "All" },
];

const FI = "rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-slate-50 dark:bg-[#0f1117] text-slate-900 dark:text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40 hover:border-[#7c3aed]/60 transition-colors";

export default function FlagsTable({ flags: initial }: { flags: Flag[] }) {
  const [flags, setFlags] = useState(initial);
  const [statusFilter, setStatusFilter] = useState<"unresolved" | "resolved" | "all">("unresolved");
  const [typeFilter, setTypeFilter] = useState("");
  const [resolving, setResolving] = useState<Set<string>>(new Set());

  const uniqueTypes = [...new Set(initial.map((f) => f.type))].sort();

  const filtered = flags.filter((f) => {
    if (statusFilter === "unresolved" && f.is_resolved) return false;
    if (statusFilter === "resolved" && !f.is_resolved) return false;
    if (typeFilter && f.type !== typeFilter) return false;
    return true;
  });

  async function markResolved(id: string) {
    setResolving((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/flags/${id}`, { method: "PATCH" });
      if (res.ok) {
        setFlags((prev) =>
          prev.map((f) => f.id === id ? { ...f, is_resolved: true, resolved_at: new Date().toISOString() } : f)
        );
      }
    } finally {
      setResolving((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  }

  return (
    <>
      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Status tabs */}
        <div className="flex border border-slate-200 dark:border-[#2a2d3e] rounded-xl overflow-hidden">
          {STATUS_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => setStatusFilter(opt.value as typeof statusFilter)}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                statusFilter === opt.value
                  ? "bg-[#7c3aed] text-white"
                  : "text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-[#0f1117]"
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
        {/* Type filter */}
        {uniqueTypes.length > 0 && (
          <div className="relative">
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
              className={`dark-select appearance-none ${FI} pr-8 cursor-pointer`}>
              <option value="">All types</option>
              {uniqueTypes.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#7c3aed]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
          </div>
        )}
        <span className="text-xs text-slate-400 dark:text-gray-500 ml-auto">
          {filtered.length} flag{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] p-16 flex items-center justify-center">
          <p className="text-sm text-slate-400 dark:text-gray-500">No flags match the current filters.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-[#2a2d3e] bg-slate-50 dark:bg-white/[0.03]">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Type</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Title</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Created</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#2a2d3e]">
              {filtered.map((flag) => (
                <tr key={flag.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3.5">
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                      flag.type === "caterer_quality"
                        ? "bg-red-50 dark:bg-red-500/10 text-[#ef4444] border border-red-200 dark:border-red-500/20"
                        : "bg-amber-50 dark:bg-[#f59e0b]/10 text-[#f59e0b] border border-amber-200 dark:border-[#f59e0b]/20"
                    }`}>
                      {flag.type.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-slate-800 dark:text-slate-200">{flag.title}</p>
                    {flag.details && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">{flag.details}</p>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{timeAgo(flag.created_at)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                      flag.is_resolved
                        ? "bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20"
                        : "bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20"
                    }`}>
                      {flag.is_resolved ? "Resolved" : "Open"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {!flag.is_resolved && (
                      <button
                        onClick={() => markResolved(flag.id)}
                        disabled={resolving.has(flag.id)}
                        className="text-xs font-medium text-[#10b981] hover:text-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {resolving.has(flag.id) ? "Saving…" : "Mark resolved"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
