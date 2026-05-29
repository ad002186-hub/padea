"use client";

import { useState } from "react";
import ConfirmModal from "@/app/components/ui/ConfirmModal";

export type PendingOrderItem = {
  name: string;
  quantity: number;
  assignedStudents?: { studentId: string; name: string; restrictions: string[] }[] | null;
};

export type PendingOrder = {
  id: string;
  sessionDate: string;
  day: string;
  schoolName: string;
  catererName: string;
  mealCount: number;
  status: string;
  totalCost: number | null;
  items: PendingOrderItem[];
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function shortDate(ymd: string): string {
  if (!ymd) return "";
  const [, m, d] = ymd.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending:  "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20",
    approved: "bg-[#7c3aed]/10 text-[#7c3aed] border-[#7c3aed]/20",
    sent:     "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20",
    cancelled:"bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-[#2a2d3e]",
  };
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${styles[status] ?? styles.pending}`}>
      {status}
    </span>
  );
}

export default function PendingOrdersView({ orders: initial }: { orders: PendingOrder[] }) {
  const [orders, setOrders] = useState(initial);
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function patchOrder(id: string, status: string) {
    setLoading((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      setOrders((prev) =>
        status === "cancelled"
          ? prev.filter((o) => o.id !== id)
          : prev.map((o) => (o.id === id ? { ...o, status } : o))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
      setOrders(initial);
    } finally {
      setLoading((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  }

  async function approveAll() {
    const pending = orders.filter((o) => o.status === "pending");
    await Promise.all(pending.map((o) => patchOrder(o.id, "approved")));
  }

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const approvedCount = orders.filter((o) => o.status === "approved").length;

  return (
    <>
      {cancellingId && (
        <ConfirmModal
          title="Cancel Order"
          message={`Cancel this order for ${orders.find(o => o.id === cancellingId)?.schoolName}? This cannot be undone.`}
          confirmLabel="Cancel order"
          variant="danger"
          onConfirm={() => { const id = cancellingId; setCancellingId(null); patchOrder(id, "cancelled"); }}
          onCancel={() => setCancellingId(null)}
        />
      )}

      {/* Banner */}
      <div className="rounded-xl border border-amber-200 dark:border-[#f59e0b]/20 bg-amber-50 dark:bg-[#f59e0b]/5 px-5 py-3.5 mb-6 flex items-center gap-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <p className="text-sm text-amber-800 dark:text-amber-300">
          Unapproved orders will be sent automatically to caterers on <strong>Thursday at 12pm</strong>.
        </p>
      </div>

      {/* Actions toolbar */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {pendingCount} pending · {approvedCount} approved
        </p>
        {pendingCount > 0 && (
          <button onClick={approveAll}
            className="px-4 py-2 rounded-lg bg-[#7c3aed] text-white text-sm font-semibold hover:bg-[#6d28d9] transition-colors">
            Approve all ({pendingCount})
          </button>
        )}
      </div>

      {error && <p className="text-sm text-[#ef4444] mb-4">{error}</p>}

      {orders.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] p-16 flex items-center justify-center">
          <p className="text-sm text-slate-400 dark:text-gray-500">No pending orders.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => (
            <div key={order.id}
              className="rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">{order.schoolName}</h3>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {order.day} · {shortDate(order.sessionDate)} · {order.catererName} · {order.mealCount} meals
                    {order.totalCost !== null && (
                      <span className="ml-2 text-slate-700 dark:text-slate-300 font-medium">
                        · Total: ${order.totalCost.toFixed(2)} <span className="text-xs font-normal text-slate-400">(inc GST)</span>
                      </span>
                    )}
                  </p>
                </div>
                {(order.status === "pending" || order.status === "approved") && (
                  <div className="flex items-center gap-2 shrink-0">
                    {order.status === "pending" && (
                      <button
                        onClick={() => patchOrder(order.id, "approved")}
                        disabled={loading.has(order.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#7c3aed] text-white hover:bg-[#6d28d9] disabled:opacity-40 transition-colors"
                      >
                        {loading.has(order.id) ? "…" : "Approve"}
                      </button>
                    )}
                    {order.status === "approved" && (
                      <span className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#7c3aed] border border-[#7c3aed]/30 bg-violet-50 dark:bg-[#7c3aed]/10">
                        Approved ✓
                      </span>
                    )}
                    <button
                      onClick={() => setCancellingId(order.id)}
                      disabled={loading.has(order.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-[#2a2d3e] hover:text-[#ef4444] hover:border-[#ef4444]/30 disabled:opacity-40 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Items: split into dietary and general */}
              {order.items.length > 0 && (() => {
                // Dietary items: rows that have at least one assigned student
                const dietaryItems = order.items.filter(
                  i => Array.isArray(i.assignedStudents) && i.assignedStudents.length > 0
                );

                // General items: compute per-item general quantity.
                // For merged rows (item serves both restricted + unrestricted students),
                // general qty = total qty − restricted student count.
                // Items where general qty === 0 are omitted from this section.
                const generalItems: { name: string; quantity: number }[] = order.items
                  .map(i => {
                    const restrictedQty = Array.isArray(i.assignedStudents)
                      ? i.assignedStudents.length
                      : 0;
                    return { name: i.name, quantity: i.quantity - restrictedQty };
                  })
                  .filter(i => i.quantity > 0);

                const hasDietary = dietaryItems.length > 0;

                return (
                  <div className="flex flex-col gap-3">
                    {/* Dietary section — shows restricted-student qty only */}
                    {hasDietary && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                          Dietary requirement meals
                        </p>
                        <div className="rounded-lg border border-slate-100 dark:border-[#2a2d3e] overflow-hidden">
                          <table className="w-full text-sm">
                            <tbody className="divide-y divide-slate-100 dark:divide-[#2a2d3e]">
                              {dietaryItems.map((item, idx) => (
                                <tr key={`dietary-${idx}`}>
                                  <td className="px-4 py-3">
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                      {item.name} × {item.assignedStudents!.length}
                                    </p>
                                    {item.assignedStudents!.map((s) => (
                                      <p key={s.studentId} className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 pl-3">
                                        └ {s.name}
                                        {s.restrictions.length > 0 && (
                                          <span className="ml-1 text-[#f59e0b]">({s.restrictions.join(", ")})</span>
                                        )}
                                      </p>
                                    ))}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* General section — shows unrestricted qty; always shown when items exist */}
                    {generalItems.length > 0 && (
                    <div>
                      {hasDietary && (
                        <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                          General meals
                        </p>
                      )}
                      <div className="rounded-lg border border-slate-100 dark:border-[#2a2d3e] overflow-hidden">
                        <table className="w-full text-sm">
                          <tbody className="divide-y divide-slate-100 dark:divide-[#2a2d3e]">
                            {generalItems.map((item, idx) => (
                              <tr key={`general-${idx}`}>
                                <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{item.name}</td>
                                <td className="px-4 py-2.5 text-right font-semibold text-slate-800 dark:text-slate-200">
                                  {item.quantity}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {hasDietary && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                          Students with no dietary requirements may choose from any general meal option on the day.
                        </p>
                      )}
                    </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
