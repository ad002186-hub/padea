"use client";

import { useState } from "react";
import Link from "next/link";

export type Order = {
  id: string;
  sessionDate: string;
  day: string;
  schoolName: string;
  catererName: string;
  mealCount: number;
  status: string;
  totalCost: number | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20",
  approved:  "bg-[#7c3aed]/10 text-[#7c3aed] border-[#7c3aed]/20",
  sent:      "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20",
  cancelled: "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-[#2a2d3e]",
};

const STATUS_OPTIONS = ["all", "pending", "approved", "sent", "cancelled"];
const FI = "rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-slate-50 dark:bg-[#0f1117] text-slate-900 dark:text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40 hover:border-[#7c3aed]/60 transition-colors";

function fmtCost(c: number | null) {
  return c === null ? "—" : `$${c.toFixed(2)}`;
}

export default function OrdersTable({ orders }: { orders: Order[] }) {
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = orders.filter((o) => statusFilter === "all" || o.status === statusFilter);
  const weekTotal = filtered.reduce((s, o) => s + (o.totalCost ?? 0), 0);
  const hasAnyCost = filtered.some((o) => o.totalCost !== null);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex border border-slate-200 dark:border-[#2a2d3e] rounded-xl overflow-hidden">
          {STATUS_OPTIONS.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 text-sm font-medium capitalize transition-colors ${
                statusFilter === s
                  ? "bg-[#7c3aed] text-white"
                  : "text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-[#0f1117]"
              }`}>
              {s}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400 dark:text-gray-500 ml-auto">{filtered.length} order{filtered.length !== 1 ? "s" : ""}</span>
        <Link href="/orders/pending"
          className="px-4 py-2 rounded-lg border border-[#7c3aed]/30 text-[#7c3aed] text-sm font-medium hover:bg-[#7c3aed]/5 transition-colors">
          Review pending →
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] p-16 flex items-center justify-center">
          <p className="text-sm text-slate-400 dark:text-gray-500">No orders match the current filter.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-[#2a2d3e] bg-slate-50 dark:bg-white/[0.03]">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">School</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Day</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Session Date</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Caterer</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Meals</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Cost (inc GST)</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#2a2d3e]">
              {filtered.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-200">{order.schoolName}</td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{order.day}</td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 tabular-nums">{order.sessionDate}</td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{order.catererName}</td>
                  <td className="px-5 py-3.5 text-right text-slate-800 dark:text-slate-200 tabular-nums">{order.mealCount}</td>
                  <td className="px-5 py-3.5 text-right text-slate-800 dark:text-slate-200 tabular-nums">
                    {fmtCost(order.totalCost)}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${STATUS_COLORS[order.status] ?? STATUS_COLORS.pending}`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            {hasAnyCost && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 dark:border-[#2a2d3e] bg-slate-50 dark:bg-white/[0.03]">
                  <td colSpan={5} className="px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    {statusFilter === "all" ? "Total" : `${statusFilter} total`}
                  </td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                    ${weekTotal.toFixed(2)}
                  </td>
                  <td className="px-5 py-3" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </>
  );
}
