"use client";

import { useState } from "react";
import ConfirmModal from "@/app/components/ui/ConfirmModal";

const I = "w-full rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-slate-50 dark:bg-[#0f1117] text-slate-900 dark:text-white text-sm px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40 focus:border-[#7c3aed] transition-colors placeholder:text-slate-400 dark:placeholder:text-gray-500";
const S = `dark-select appearance-none ${I} pr-10 cursor-pointer`;
const L = "block text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2.5";
const CARD = "rounded-2xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] p-7 flex flex-col gap-6";

function Chevron() {
  return (
    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#7c3aed]">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

function Toggle({ checked, onChange, label, sub }: { checked: boolean; onChange: () => void; label: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</p>
        {sub && <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
      <button type="button" onClick={onChange} aria-pressed={checked}
        className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ml-4 ${checked ? "bg-[#7c3aed]" : "bg-slate-200 dark:bg-gray-600"}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

type Caterer = { id: string; name: string };

export default function MenuItemForm({ caterers }: { caterers: Caterer[] }) {
  const [catererId, setCatererId] = useState("");
  const [name, setName] = useState("");
  const [isGlutenFree, setIsGlutenFree] = useState(false);
  const [isDairyFree, setIsDairyFree] = useState(false);
  const [isNutFree, setIsNutFree] = useState(false);
  const [isVegetarian, setIsVegetarian] = useState(false);
  const [containsPork, setContainsPork] = useState(false);
  const [containsBeef, setContainsBeef] = useState(false);
  const [containsLamb, setContainsLamb] = useState(false);
  const [containsFish, setContainsFish] = useState(false);
  const [containsShellfish, setContainsShellfish] = useState(false);
  const [containsSeafood, setContainsSeafood] = useState(false);
  const [dietaryFlagsKnown, setDietaryFlagsKnown] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const catererName = caterers.find((c) => c.id === catererId)?.name ?? "";

  function handleFlagsKnownToggle() {
    const next = !dietaryFlagsKnown;
    setDietaryFlagsKnown(next);
    if (!next) {
      setIsGlutenFree(false); setIsDairyFree(false); setIsNutFree(false); setIsVegetarian(false);
      setContainsPork(false); setContainsBeef(false); setContainsLamb(false);
      setContainsFish(false); setContainsShellfish(false); setContainsSeafood(false);
    }
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/menu-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caterer_id: catererId,
          name: name.trim(),
          is_gluten_free: isGlutenFree,
          is_dairy_free: isDairyFree,
          is_nut_free: isNutFree,
          is_vegetarian: isVegetarian,
          contains_pork: containsPork,
          contains_beef: containsBeef,
          contains_lamb: containsLamb,
          contains_fish: containsFish,
          contains_shellfish: containsShellfish,
          contains_seafood: containsSeafood,
          dietary_flags_known: dietaryFlagsKnown,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to add menu item");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add menu item");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setSuccess(false);
    setCatererId(""); setName(""); setIsGlutenFree(false); setIsDairyFree(false);
    setIsNutFree(false); setIsVegetarian(false); setContainsPork(false); setContainsBeef(false);
    setContainsLamb(false); setContainsFish(false); setContainsShellfish(false); setContainsSeafood(false);
    setDietaryFlagsKnown(true); setError(null);
  }

  const canSubmit = !!catererId && !!name.trim() && !submitting;

  if (success) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] p-10 flex flex-col items-center text-center gap-5">
        <div className="w-14 h-14 rounded-full bg-[#10b981]/10 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Menu item added</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{name} added to {catererName}</p>
        </div>
        <button onClick={reset} className="mt-1 px-6 py-2.5 rounded-xl bg-[#7c3aed] text-white text-sm font-semibold hover:bg-[#6d28d9] transition-colors">
          Add another
        </button>
      </div>
    );
  }

  const dietaryChecks = [
    { label: "Gluten Free", val: isGlutenFree, set: setIsGlutenFree },
    { label: "Dairy Free", val: isDairyFree, set: setIsDairyFree },
    { label: "Nut Free", val: isNutFree, set: setIsNutFree },
    { label: "Vegetarian", val: isVegetarian, set: setIsVegetarian },
  ];
  const containsChecks = [
    { label: "Pork", val: containsPork, set: setContainsPork },
    { label: "Beef", val: containsBeef, set: setContainsBeef },
    { label: "Lamb", val: containsLamb, set: setContainsLamb },
    { label: "Fish", val: containsFish, set: setContainsFish },
    { label: "Shellfish", val: containsShellfish, set: setContainsShellfish },
    { label: "Seafood", val: containsSeafood, set: setContainsSeafood },
  ];

  return (
    <>
      {showConfirm && (
        <ConfirmModal
          title="Add Menu Item"
          message={`Add "${name.trim()}" to ${catererName}'s menu? Please review dietary flags before confirming.`}
          confirmLabel="Add item"
          onConfirm={() => { setShowConfirm(false); submit(); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
      <div className="flex flex-col gap-5">
        {/* Basic info */}
        <div className={CARD}>
          <div>
            <label className={L}>Caterer</label>
            <div className="relative">
              <select value={catererId} onChange={(e) => setCatererId(e.target.value)} className={S}>
                <option value="">Select caterer…</option>
                {caterers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <Chevron />
            </div>
          </div>
          <div>
            <label className={L}>Item Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chicken Pasta" className={I} />
          </div>
          <Toggle
            checked={dietaryFlagsKnown}
            onChange={handleFlagsKnownToggle}
            label="Dietary flags known"
            sub="Turn off if allergen info is not yet confirmed"
          />
        </div>

        {/* Dietary properties — only shown when flags are known */}
        {dietaryFlagsKnown && (
          <div className={CARD}>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white -mb-2">Dietary Properties</h3>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-3">This item is</p>
              <div className="grid grid-cols-2 gap-3">
                {dietaryChecks.map(({ label, val, set }) => (
                  <label key={label} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={val} onChange={() => set((v) => !v)}
                      className="w-4 h-4 rounded accent-[#7c3aed] cursor-pointer shrink-0" />
                    <span className="text-sm text-slate-800 dark:text-slate-200">{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-3">Contains</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {containsChecks.map(({ label, val, set }) => (
                  <label key={label} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={val} onChange={() => set((v) => !v)}
                      className="w-4 h-4 rounded accent-[#7c3aed] cursor-pointer shrink-0" />
                    <span className="text-sm text-slate-800 dark:text-slate-200">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-[#ef4444] px-1">{error}</p>}

        <button type="button" onClick={() => setShowConfirm(true)} disabled={!canSubmit}
          className="w-full py-3.5 rounded-xl text-sm font-semibold bg-[#7c3aed] text-white hover:bg-[#6d28d9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          {submitting ? "Adding item…" : "Add menu item"}
        </button>
      </div>
    </>
  );
}
