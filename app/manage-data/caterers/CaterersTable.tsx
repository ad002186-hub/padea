"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/app/components/ui/ConfirmModal";

export type Caterer = {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  ccName: string | null;
  ccEmail: string | null;
  noCC: boolean;
  pricePerItem: number | null;
  priceIncludesGst: boolean;
  deliveryFee: number | null;
  deliveryFeeNote: string | null;
  minMeals4: number | null;
  minMeals5: number | null;
  minMeals6: number | null;
  isActive: boolean;
  schoolEligibility: { schoolId: string; schoolName: string; isCurrent: boolean }[];
};

type School = { id: string; name: string };
type Elig = { selected: boolean; isCurrent: boolean };

const FI = "rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-slate-50 dark:bg-[#0f1117] text-slate-900 dark:text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40 focus:border-[#7c3aed] transition-colors";
const MI = "w-full rounded-xl border border-[#2a2d3e] bg-[#0f1117] text-white text-sm px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40 focus:border-[#7c3aed] transition-colors placeholder:text-gray-500";
const ML = "block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5";

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange} aria-pressed={checked}
      className={`relative w-9 h-4.5 rounded-full transition-colors shrink-0 ${checked ? "bg-[#7c3aed]" : "bg-gray-600"}`}
      style={{ height: "1.1rem" }}>
      <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

export default function CaterersTable({ caterers: initial, allSchools }: { caterers: Caterer[]; allSchools: School[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [rows, setRows] = useState(initial);
  const [tab, setTab] = useState<"active" | "inactive">("active");
  const [nameFilter, setNameFilter] = useState("");
  const [editingCaterer, setEditingCaterer] = useState<Caterer | null>(null);
  const [editName, setEditName] = useState("");
  const [editContactName, setEditContactName] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");
  const [editWantsCc, setEditWantsCc] = useState(false);
  const [editCcName, setEditCcName] = useState("");
  const [editCcEmail, setEditCcEmail] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editGst, setEditGst] = useState(false);
  const [editDelivery, setEditDelivery] = useState("");
  const [editDeliveryNote, setEditDeliveryNote] = useState("");
  const [editMin4, setEditMin4] = useState("");
  const [editMin5, setEditMin5] = useState("");
  const [editMin6, setEditMin6] = useState("");
  const [editElig, setEditElig] = useState<Record<string, Elig>>({});
  const [confirmSave, setConfirmSave] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<{ caterer: Caterer; action: "deactivate" | "reactivate" } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setRows(initial); }, [initial]);

  const filtered = rows.filter((r) => {
    if (r.isActive !== (tab === "active")) return false;
    if (nameFilter && !r.name.toLowerCase().includes(nameFilter.toLowerCase())) return false;
    return true;
  });

  function openEdit(c: Caterer) {
    setEditingCaterer(c);
    setEditName(c.name);
    setEditContactName(c.contactName ?? "");
    setEditContactEmail(c.contactEmail ?? "");
    setEditWantsCc(!c.noCC);
    setEditCcName(c.ccName ?? "");
    setEditCcEmail(c.ccEmail ?? "");
    setEditPrice(c.pricePerItem?.toString() ?? "");
    setEditGst(c.priceIncludesGst);
    setEditDelivery(c.deliveryFee?.toString() ?? "");
    setEditDeliveryNote(c.deliveryFeeNote ?? "");
    setEditMin4(c.minMeals4?.toString() ?? "");
    setEditMin5(c.minMeals5?.toString() ?? "");
    setEditMin6(c.minMeals6?.toString() ?? "");
    const eligMap: Record<string, Elig> = Object.fromEntries(
      allSchools.map((s) => [s.id, { selected: false, isCurrent: false }])
    );
    for (const e of c.schoolEligibility) {
      eligMap[e.schoolId] = { selected: true, isCurrent: e.isCurrent };
    }
    setEditElig(eligMap);
    setError(null);
  }

  async function handleSave() {
    if (!editingCaterer) return;
    setSaving(true);
    setError(null);
    try {
      const school_eligibility = Object.entries(editElig)
        .filter(([, e]) => e.selected)
        .map(([school_id, e]) => ({ school_id, is_current: e.isCurrent }));

      const res = await fetch(`/api/caterers/${editingCaterer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          contact_name: editContactName.trim() || null,
          contact_email: editContactEmail.trim() || null,
          cc_name: editWantsCc ? (editCcName.trim() || null) : null,
          cc_email: editWantsCc ? (editCcEmail.trim() || null) : null,
          no_cc: !editWantsCc,
          price_per_item: editPrice ? parseFloat(editPrice) : null,
          price_includes_gst: editGst,
          delivery_fee: editDelivery ? parseFloat(editDelivery) : null,
          delivery_fee_note: editDeliveryNote.trim() || null,
          min_meals_4_items: editMin4 ? parseInt(editMin4) : null,
          min_meals_5_items: editMin5 ? parseInt(editMin5) : null,
          min_meals_6_items: editMin6 ? parseInt(editMin6) : null,
          school_eligibility,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Save failed");
      setEditingCaterer(null);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(caterer: Caterer, isActive: boolean) {
    setRows((prev) => prev.map((r) => r.id === caterer.id ? { ...r, isActive } : r));
    setPending((prev) => new Set(prev).add(caterer.id));
    try {
      const res = await fetch(`/api/caterers/${caterer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: isActive }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed");
      startTransition(() => router.refresh());
    } catch (err) {
      setRows(initial);
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setPending((prev) => { const n = new Set(prev); n.delete(caterer.id); return n; });
    }
  }

  const activeCount = rows.filter((r) => r.isActive).length;
  const inactiveCount = rows.filter((r) => !r.isActive).length;

  return (
    <>
      {/* Edit modal */}
      {editingCaterer && !confirmSave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingCaterer(null)} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-[#2a2d3e] bg-[#1e2235] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-semibold text-white mb-5">Edit Caterer</h2>
            <div className="flex flex-col gap-4">
              <div><label className={ML}>Name</label><input value={editName} onChange={(e) => setEditName(e.target.value)} className={MI} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={ML}>Contact Name</label><input value={editContactName} onChange={(e) => setEditContactName(e.target.value)} className={MI} placeholder="Optional" /></div>
                <div><label className={ML}>Contact Email</label><input type="email" value={editContactEmail} onChange={(e) => setEditContactEmail(e.target.value)} className={MI} placeholder="Optional" /></div>
              </div>
              <div className="flex items-center justify-between py-1">
                <p className="text-sm text-slate-200">Wants to be CC'd on orders</p>
                <Toggle checked={editWantsCc} onChange={() => setEditWantsCc((v) => !v)} />
              </div>
              {editWantsCc && (
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={ML}>CC Name</label><input value={editCcName} onChange={(e) => setEditCcName(e.target.value)} className={MI} placeholder="Optional" /></div>
                  <div><label className={ML}>CC Email</label><input type="email" value={editCcEmail} onChange={(e) => setEditCcEmail(e.target.value)} className={MI} placeholder="Optional" /></div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><label className={ML}>Price Per Item ($)</label><input type="number" step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className={MI} placeholder="0.00" /></div>
                <div className="flex items-center justify-between pt-6">
                  <p className="text-sm text-slate-200">Incl. GST</p>
                  <Toggle checked={editGst} onChange={() => setEditGst((v) => !v)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={ML}>Delivery Fee ($)</label><input type="number" step="0.01" value={editDelivery} onChange={(e) => setEditDelivery(e.target.value)} className={MI} placeholder="0.00" /></div>
                <div><label className={ML}>Delivery Note</label><input value={editDeliveryNote} onChange={(e) => setEditDeliveryNote(e.target.value)} className={MI} placeholder="e.g. per trip" /></div>
              </div>
              <div>
                <label className={ML}>Min Meals</label>
                <div className="grid grid-cols-3 gap-3">
                  {[{ l: "4 items", v: editMin4, s: setEditMin4 }, { l: "5 items", v: editMin5, s: setEditMin5 }, { l: "6 items", v: editMin6, s: setEditMin6 }].map(({ l, v, s }) => (
                    <div key={l}>
                      <p className="text-xs text-gray-500 mb-1">{l}</p>
                      <input type="number" step="1" value={v} onChange={(e) => s(e.target.value)} className={MI} placeholder="0" />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className={ML}>School Eligibility</label>
                <div className="flex flex-col gap-2 mt-1">
                  {allSchools.map((school) => {
                    const e = editElig[school.id] ?? { selected: false, isCurrent: false };
                    return (
                      <div key={school.id} className={`flex items-center justify-between rounded-lg px-3 py-2 border ${e.selected ? "border-[#7c3aed]/40 bg-[#7c3aed]/5" : "border-[#2a2d3e]"}`}>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={e.selected} onChange={() => setEditElig((prev) => ({ ...prev, [school.id]: { ...e, selected: !e.selected } }))} className="w-4 h-4 rounded accent-[#7c3aed]" />
                          <span className="text-sm text-slate-200">{school.name}</span>
                        </label>
                        {e.selected && (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <span className="text-xs text-gray-400">Currently serves</span>
                            <Toggle checked={e.isCurrent} onChange={() => setEditElig((prev) => ({ ...prev, [school.id]: { ...e, isCurrent: !e.isCurrent } }))} />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            {error && <p className="text-sm text-[#ef4444] mt-3">{error}</p>}
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setEditingCaterer(null)} className="px-4 py-2 rounded-lg border border-[#2a2d3e] text-sm text-slate-300 hover:bg-white/5 transition-colors">Cancel</button>
              <button onClick={() => setConfirmSave(true)} disabled={!editName.trim() || saving} className="px-4 py-2 rounded-lg bg-[#7c3aed] text-white text-sm font-semibold hover:bg-[#6d28d9] disabled:opacity-40 transition-colors">Save changes</button>
            </div>
          </div>
        </div>
      )}

      {confirmSave && (
        <ConfirmModal title="Save Changes" message={`Save changes to ${editingCaterer?.name}?`} confirmLabel={saving ? "Saving…" : "Save"}
          onConfirm={() => { setConfirmSave(false); handleSave(); }} onCancel={() => setConfirmSave(false)} />
      )}

      {confirmAction && (
        <ConfirmModal
          title={confirmAction.action === "deactivate" ? "Deactivate Caterer" : "Reactivate Caterer"}
          message={`${confirmAction.action === "deactivate" ? "Deactivate" : "Reactivate"} ${confirmAction.caterer.name}?`}
          confirmLabel={confirmAction.action === "deactivate" ? "Deactivate" : "Reactivate"}
          variant={confirmAction.action === "deactivate" ? "danger" : "primary"}
          onConfirm={() => { const { caterer, action } = confirmAction!; setConfirmAction(null); handleToggleActive(caterer, action === "reactivate"); }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-[#2a2d3e] mb-5">
        {(["active", "inactive"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${tab === t ? "border-[#7c3aed] text-[#7c3aed]" : "border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"}`}>
            {t === "active" ? `Active (${activeCount})` : `Inactive (${inactiveCount})`}
          </button>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-5">
        <input type="text" placeholder="Search by name…" value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} className={`${FI} min-w-48`} />
        <span className="text-xs text-slate-400 dark:text-gray-500 ml-auto">{filtered.length} caterer{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {error && <p className="text-sm text-[#ef4444] mb-3 px-1">{error}</p>}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] p-16 flex items-center justify-center">
          <p className="text-sm text-slate-400 dark:text-gray-500">No caterers found.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-[#2a2d3e] bg-slate-50 dark:bg-white/[0.03]">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Min Meals (4/5/6)</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Wants CC</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Contact</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#2a2d3e]">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-200">{row.name}</td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 tabular-nums">
                    {[row.minMeals4, row.minMeals5, row.minMeals6].map((v) => v ?? "—").join(" / ")}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-medium ${!row.noCC ? "text-[#10b981]" : "text-slate-400 dark:text-slate-500"}`}>
                      {!row.noCC ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{row.contactEmail ?? "—"}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => openEdit(row)} className="text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-[#7c3aed] transition-colors">Edit</button>
                      <button
                        onClick={() => setConfirmAction({ caterer: row, action: row.isActive ? "deactivate" : "reactivate" })}
                        disabled={pending.has(row.id)}
                        className={`text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${row.isActive ? "text-slate-400 dark:text-slate-500 hover:text-[#ef4444]" : "text-slate-400 dark:text-slate-500 hover:text-[#10b981]"}`}>
                        {pending.has(row.id) ? <span className="w-3.5 h-3.5 rounded-full border border-current border-t-transparent animate-spin inline-block" /> : row.isActive ? "Deactivate" : "Reactivate"}
                      </button>
                    </div>
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
