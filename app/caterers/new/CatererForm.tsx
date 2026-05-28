"use client";

import { useState } from "react";
import ConfirmModal from "@/app/components/ui/ConfirmModal";

const I = "w-full rounded-xl border border-slate-200 dark:border-[#2a2d3e] bg-slate-50 dark:bg-[#0f1117] text-slate-900 dark:text-white text-sm px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40 focus:border-[#7c3aed] transition-colors placeholder:text-slate-400 dark:placeholder:text-gray-500";
const L = "block text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2.5";
const CARD = "rounded-2xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] p-7 flex flex-col gap-6";

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange} aria-pressed={checked}
      className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${checked ? "bg-[#7c3aed]" : "bg-slate-200 dark:bg-gray-600"}`}>
      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

type School = { id: string; name: string };
type Elig = { selected: boolean; isCurrent: boolean };

export default function CatererForm({ schools }: { schools: School[] }) {
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [ccName, setCcName] = useState("");
  const [ccEmail, setCcEmail] = useState("");
  const [wantsCc, setWantsCc] = useState(false);
  const [pricePerItem, setPricePerItem] = useState("");
  const [priceIncludesGst, setPriceIncludesGst] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState("");
  const [deliveryFeeNote, setDeliveryFeeNote] = useState("");
  const [minMeals4, setMinMeals4] = useState("");
  const [minMeals5, setMinMeals5] = useState("");
  const [minMeals6, setMinMeals6] = useState("");
  const [eligibility, setEligibility] = useState<Record<string, Elig>>(
    () => Object.fromEntries(schools.map((s) => [s.id, { selected: false, isCurrent: false }]))
  );
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSchool(schoolId: string) {
    setEligibility((prev) => ({
      ...prev,
      [schoolId]: { ...prev[schoolId], selected: !prev[schoolId].selected },
    }));
  }

  function toggleCurrent(schoolId: string) {
    setEligibility((prev) => ({
      ...prev,
      [schoolId]: { ...prev[schoolId], isCurrent: !prev[schoolId].isCurrent },
    }));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const school_eligibility = Object.entries(eligibility)
        .filter(([, e]) => e.selected)
        .map(([school_id, e]) => ({ school_id, is_current: e.isCurrent }));

      const res = await fetch("/api/caterers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          contact_name: contactName.trim() || null,
          contact_email: contactEmail.trim() || null,
          cc_name: wantsCc ? (ccName.trim() || null) : null,
          cc_email: wantsCc ? (ccEmail.trim() || null) : null,
          no_cc: !wantsCc,
          price_per_item: pricePerItem ? parseFloat(pricePerItem) : null,
          price_includes_gst: priceIncludesGst,
          delivery_fee: deliveryFee ? parseFloat(deliveryFee) : null,
          delivery_fee_note: deliveryFeeNote.trim() || null,
          min_meals_4_items: minMeals4 ? parseInt(minMeals4) : null,
          min_meals_5_items: minMeals5 ? parseInt(minMeals5) : null,
          min_meals_6_items: minMeals6 ? parseInt(minMeals6) : null,
          school_eligibility,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to add caterer");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add caterer");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setSuccess(false);
    setName(""); setContactName(""); setContactEmail(""); setCcName(""); setCcEmail("");
    setWantsCc(false); setPricePerItem(""); setPriceIncludesGst(false); setDeliveryFee("");
    setDeliveryFeeNote(""); setMinMeals4(""); setMinMeals5(""); setMinMeals6("");
    setEligibility(Object.fromEntries(schools.map((s) => [s.id, { selected: false, isCurrent: false }])));
    setError(null);
  }

  const canSubmit = !!name.trim() && !submitting;

  if (success) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-[#2a2d3e] bg-white dark:bg-[#1e2235] p-10 flex flex-col items-center text-center gap-5">
        <div className="w-14 h-14 rounded-full bg-[#10b981]/10 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Caterer added</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{name} has been registered.</p>
        </div>
        <button onClick={reset} className="mt-1 px-6 py-2.5 rounded-xl bg-[#7c3aed] text-white text-sm font-semibold hover:bg-[#6d28d9] transition-colors">
          Add another
        </button>
      </div>
    );
  }

  return (
    <>
      {showConfirm && (
        <ConfirmModal
          title="Add Caterer"
          message={`Add "${name.trim()}" as a caterer? Please review all details before confirming.`}
          confirmLabel="Add caterer"
          onConfirm={() => { setShowConfirm(false); submit(); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
      <div className="flex flex-col gap-5">
        {/* Basic info */}
        <div className={CARD}>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white -mb-2">Basic Information</h3>
          <div>
            <label className={L}>Caterer Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sunrise Catering Co." className={I} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className={L}>Contact Name</label>
              <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)}
                placeholder="Full name" className={I} />
            </div>
            <div>
              <label className={L}>Contact Email</label>
              <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contact@caterer.com" className={I} />
            </div>
          </div>

          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Wants to be CC'd on orders</p>
              <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">Send order copies to a CC contact</p>
            </div>
            <Toggle checked={wantsCc} onChange={() => setWantsCc((v) => !v)} />
          </div>

          {wantsCc && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className={L}>CC Name</label>
                <input type="text" value={ccName} onChange={(e) => setCcName(e.target.value)}
                  placeholder="CC contact name" className={I} />
              </div>
              <div>
                <label className={L}>CC Email</label>
                <input type="email" value={ccEmail} onChange={(e) => setCcEmail(e.target.value)}
                  placeholder="cc@caterer.com" className={I} />
              </div>
            </div>
          )}
        </div>

        {/* Pricing */}
        <div className={CARD}>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white -mb-2">Pricing</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className={L}>Price Per Item ($)</label>
              <input type="number" min="0" step="0.01" value={pricePerItem}
                onChange={(e) => setPricePerItem(e.target.value)} placeholder="0.00" className={I} />
            </div>
            <div className="flex items-center justify-between pt-7">
              <p className="text-sm text-slate-800 dark:text-slate-200">Price includes GST</p>
              <Toggle checked={priceIncludesGst} onChange={() => setPriceIncludesGst((v) => !v)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className={L}>Delivery Fee ($)</label>
              <input type="number" min="0" step="0.01" value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)} placeholder="0.00" className={I} />
            </div>
            <div>
              <label className={L}>Delivery Fee Note</label>
              <input type="text" value={deliveryFeeNote} onChange={(e) => setDeliveryFeeNote(e.target.value)}
                placeholder="e.g. per trip" className={I} />
            </div>
          </div>

          <div>
            <label className={L}>Minimum Meals</label>
            <div className="grid grid-cols-3 gap-4">
              {[{ label: "4 items", val: minMeals4, set: setMinMeals4 },
                { label: "5 items", val: minMeals5, set: setMinMeals5 },
                { label: "6 items", val: minMeals6, set: setMinMeals6 }].map(({ label, val, set }) => (
                <div key={label}>
                  <p className="text-xs text-slate-400 dark:text-gray-500 mb-1.5">{label}</p>
                  <input type="number" min="0" step="1" value={val}
                    onChange={(e) => set(e.target.value)} placeholder="0" className={I} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* School eligibility */}
        <div className={CARD}>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white -mb-2">School Eligibility</h3>
          <div className="flex flex-col gap-3">
            {schools.map((school) => {
              const e = eligibility[school.id];
              return (
                <div key={school.id} className={`rounded-xl border p-4 transition-colors ${e.selected ? "border-[#7c3aed]/40 bg-violet-50 dark:bg-[#7c3aed]/5" : "border-slate-200 dark:border-[#2a2d3e]"}`}>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={e.selected} onChange={() => toggleSchool(school.id)}
                        className="w-4 h-4 rounded accent-[#7c3aed] cursor-pointer" />
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{school.name}</span>
                    </label>
                    {e.selected && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-xs text-slate-500 dark:text-gray-400">Currently serves</span>
                        <Toggle checked={e.isCurrent} onChange={() => toggleCurrent(school.id)} />
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {error && <p className="text-sm text-[#ef4444] px-1">{error}</p>}

        <button type="button" onClick={() => setShowConfirm(true)} disabled={!canSubmit}
          className="w-full py-3.5 rounded-xl text-sm font-semibold bg-[#7c3aed] text-white hover:bg-[#6d28d9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          {submitting ? "Adding caterer…" : "Add caterer"}
        </button>
      </div>
    </>
  );
}
