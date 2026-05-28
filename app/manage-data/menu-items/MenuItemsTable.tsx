"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/app/components/ui/ConfirmModal";

export type MenuItem = {
  id: string;
  name: string;
  catererId: string;
  catererName: string;
  isGlutenFree: boolean;
  isDairyFree: boolean;
  isNutFree: boolean;
  isVegetarian: boolean;
  containsPork: boolean;
  containsBeef: boolean;
  containsLamb: boolean;
  containsFish: boolean;
  containsShellfish: boolean;
  containsSeafood: boolean;
  dietaryFlagsKnown: boolean;
  isActive: boolean;
};

const FI = "rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-slate-50 dark:bg-[#0f1117] text-slate-900 dark:text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40 focus:border-[#7c3aed] transition-colors";
const MI = "w-full rounded-xl border border-[#2a2d3e] bg-[#0f1117] text-white text-sm px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40 focus:border-[#7c3aed] transition-colors placeholder:text-gray-500";
const ML = "block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5";

function Tag({ label }: { label: string }) {
  return <span className="inline-block text-xs font-medium px-1.5 py-0.5 rounded bg-violet-50 dark:bg-[#7c3aed]/10 text-[#7c3aed] border border-violet-200 dark:border-[#7c3aed]/20">{label}</span>;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange} aria-pressed={checked}
      className={`relative w-9 rounded-full transition-colors shrink-0 ${checked ? "bg-[#7c3aed]" : "bg-gray-600"}`}
      style={{ height: "1.1rem" }}>
      <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

export default function MenuItemsTable({ items: initial }: { items: MenuItem[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [rows, setRows] = useState(initial);
  const [nameFilter, setNameFilter] = useState("");
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editGF, setEditGF] = useState(false);
  const [editDF, setEditDF] = useState(false);
  const [editNF, setEditNF] = useState(false);
  const [editVeg, setEditVeg] = useState(false);
  const [editPork, setEditPork] = useState(false);
  const [editBeef, setEditBeef] = useState(false);
  const [editLamb, setEditLamb] = useState(false);
  const [editFish, setEditFish] = useState(false);
  const [editShellfish, setEditShellfish] = useState(false);
  const [editSeafood, setEditSeafood] = useState(false);
  const [editFlagsKnown, setEditFlagsKnown] = useState(true);
  const [confirmSave, setConfirmSave] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<{ item: MenuItem; action: "deactivate" | "reactivate" } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setRows(initial); }, [initial]);

  const filteredRows = nameFilter
    ? rows.filter((r) => r.name.toLowerCase().includes(nameFilter.toLowerCase()))
    : rows;

  // Group by caterer
  const catererOrder: string[] = [];
  const groups = new Map<string, { name: string; active: MenuItem[]; inactive: MenuItem[] }>();
  for (const item of filteredRows) {
    if (!groups.has(item.catererId)) {
      catererOrder.push(item.catererId);
      groups.set(item.catererId, { name: item.catererName, active: [], inactive: [] });
    }
    const g = groups.get(item.catererId)!;
    (item.isActive ? g.active : g.inactive).push(item);
  }

  function openEdit(item: MenuItem) {
    setEditingItem(item);
    setEditName(item.name);
    setEditGF(item.isGlutenFree); setEditDF(item.isDairyFree);
    setEditNF(item.isNutFree); setEditVeg(item.isVegetarian);
    setEditPork(item.containsPork); setEditBeef(item.containsBeef);
    setEditLamb(item.containsLamb); setEditFish(item.containsFish);
    setEditShellfish(item.containsShellfish); setEditSeafood(item.containsSeafood);
    setEditFlagsKnown(item.dietaryFlagsKnown);
    setError(null);
  }

  async function handleSave() {
    if (!editingItem) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/menu-items/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          is_gluten_free: editGF, is_dairy_free: editDF,
          is_nut_free: editNF, is_vegetarian: editVeg,
          contains_pork: editPork, contains_beef: editBeef,
          contains_lamb: editLamb, contains_fish: editFish,
          contains_shellfish: editShellfish, contains_seafood: editSeafood,
          dietary_flags_known: editFlagsKnown,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Save failed");
      setEditingItem(null);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(item: MenuItem, isActive: boolean) {
    setRows((prev) => prev.map((r) => r.id === item.id ? { ...r, isActive } : r));
    setPending((prev) => new Set(prev).add(item.id));
    try {
      const res = await fetch(`/api/menu-items/${item.id}`, {
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
      setPending((prev) => { const n = new Set(prev); n.delete(item.id); return n; });
    }
  }

  const dietaryChecks: { label: string; val: boolean; set: (v: boolean) => void }[] = [
    { label: "Gluten Free", val: editGF, set: setEditGF },
    { label: "Dairy Free", val: editDF, set: setEditDF },
    { label: "Nut Free", val: editNF, set: setEditNF },
    { label: "Vegetarian", val: editVeg, set: setEditVeg },
  ];
  const containsChecks: { label: string; val: boolean; set: (v: boolean) => void }[] = [
    { label: "Pork", val: editPork, set: setEditPork },
    { label: "Beef", val: editBeef, set: setEditBeef },
    { label: "Lamb", val: editLamb, set: setEditLamb },
    { label: "Fish", val: editFish, set: setEditFish },
    { label: "Shellfish", val: editShellfish, set: setEditShellfish },
    { label: "Seafood", val: editSeafood, set: setEditSeafood },
  ];

  return (
    <>
      {/* Edit modal */}
      {editingItem && !confirmSave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingItem(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#2a2d3e] bg-[#1e2235] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-semibold text-white mb-5">Edit Menu Item</h2>
            <div className="flex flex-col gap-4">
              <div><label className={ML}>Item Name</label><input value={editName} onChange={(e) => setEditName(e.target.value)} className={MI} /></div>
              <div className="flex items-center justify-between py-1">
                <p className="text-sm text-slate-200">Dietary flags known</p>
                <Toggle checked={editFlagsKnown} onChange={() => setEditFlagsKnown((v) => !v)} />
              </div>
              {editFlagsKnown && (
                <>
                  <div>
                    <label className={ML}>This item is</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {dietaryChecks.map(({ label, val, set }) => (
                        <label key={label} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={val} onChange={() => set(!val)} className="w-4 h-4 rounded accent-[#7c3aed]" />
                          <span className="text-sm text-slate-200">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={ML}>Contains</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {containsChecks.map(({ label, val, set }) => (
                        <label key={label} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={val} onChange={() => set(!val)} className="w-4 h-4 rounded accent-[#7c3aed]" />
                          <span className="text-sm text-slate-200">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            {error && <p className="text-sm text-[#ef4444] mt-3">{error}</p>}
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setEditingItem(null)} className="px-4 py-2 rounded-lg border border-[#2a2d3e] text-sm text-slate-300 hover:bg-white/5 transition-colors">Cancel</button>
              <button onClick={() => setConfirmSave(true)} disabled={!editName.trim() || saving} className="px-4 py-2 rounded-lg bg-[#7c3aed] text-white text-sm font-semibold hover:bg-[#6d28d9] disabled:opacity-40 transition-colors">Save changes</button>
            </div>
          </div>
        </div>
      )}

      {confirmSave && (
        <ConfirmModal title="Save Changes" message={`Save changes to "${editingItem?.name}"?`} confirmLabel={saving ? "Saving…" : "Save"}
          onConfirm={() => { setConfirmSave(false); handleSave(); }} onCancel={() => setConfirmSave(false)} />
      )}

      {confirmAction && (
        <ConfirmModal
          title={confirmAction.action === "deactivate" ? "Deactivate Item" : "Reactivate Item"}
          message={`${confirmAction.action === "deactivate" ? "Deactivate" : "Reactivate"} "${confirmAction.item.name}"?`}
          confirmLabel={confirmAction.action === "deactivate" ? "Deactivate" : "Reactivate"}
          variant={confirmAction.action === "deactivate" ? "danger" : "primary"}
          onConfirm={() => { const { item, action } = confirmAction!; setConfirmAction(null); handleToggleActive(item, action === "reactivate"); }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* Filter */}
      <div className="flex items-center gap-3 mb-5">
        <input type="text" placeholder="Search items across all caterers…" value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} className={`${FI} min-w-64`} />
        <span className="text-xs text-slate-400 dark:text-gray-500 ml-auto">{filteredRows.length} item{filteredRows.length !== 1 ? "s" : ""}</span>
      </div>

      {error && <p className="text-sm text-[#ef4444] mb-3 px-1">{error}</p>}

      {catererOrder.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] p-16 flex items-center justify-center">
          <p className="text-sm text-slate-400 dark:text-gray-500">No menu items found.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {catererOrder.map((catererId) => {
            const group = groups.get(catererId)!;
            if (group.active.length === 0 && group.inactive.length === 0) return null;

            const renderRows = (items: MenuItem[], sectionLabel?: string) => {
              if (items.length === 0) return null;
              return (
                <>
                  {sectionLabel && (
                    <tr className="border-b border-slate-100 dark:border-[#2a2d3e]">
                      <td colSpan={4} className="px-5 py-2 text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wide bg-slate-50/50 dark:bg-white/[0.02]">
                        {sectionLabel}
                      </td>
                    </tr>
                  )}
                  {items.map((row) => {
                    const tags = [
                      row.isGlutenFree && "GF", row.isDairyFree && "DF",
                      row.isNutFree && "NF", row.isVegetarian && "Veg",
                    ].filter(Boolean) as string[];
                    return (
                      <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-200">{row.name}</td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-1">
                            {!row.dietaryFlagsKnown
                              ? <span className="text-xs text-slate-400 dark:text-slate-500 italic">Flags unknown</span>
                              : tags.length ? tags.map((t) => <Tag key={t} label={t} />) : <span className="text-slate-400 dark:text-slate-500">—</span>}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${row.isActive ? "bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20" : "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-[#2a2d3e]"}`}>
                            {row.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button onClick={() => openEdit(row)} className="text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-[#7c3aed] transition-colors">Edit</button>
                            <button
                              onClick={() => setConfirmAction({ item: row, action: row.isActive ? "deactivate" : "reactivate" })}
                              disabled={pending.has(row.id)}
                              className={`text-xs font-medium transition-colors disabled:opacity-40 ${row.isActive ? "text-slate-400 dark:text-slate-500 hover:text-[#ef4444]" : "text-slate-400 dark:text-slate-500 hover:text-[#10b981]"}`}>
                              {pending.has(row.id) ? <span className="w-3.5 h-3.5 rounded-full border border-current border-t-transparent animate-spin inline-block" /> : row.isActive ? "Deactivate" : "Reactivate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </>
              );
            };

            const hasBoth = group.active.length > 0 && group.inactive.length > 0;

            return (
              <div key={catererId}>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  {group.name}
                  <span className="text-xs font-normal text-slate-400 dark:text-gray-500">
                    {group.active.length} active{group.inactive.length > 0 ? `, ${group.inactive.length} inactive` : ""}
                  </span>
                </h3>
                <div className="rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-[#2a2d3e] bg-slate-50 dark:bg-white/[0.03]">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Item</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Dietary</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#2a2d3e]">
                      {renderRows(group.active, hasBoth ? "Active" : undefined)}
                      {renderRows(group.inactive, hasBoth ? "Inactive" : undefined)}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
