import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Loader2, Plus, Save, X } from "lucide-react";

import { api } from "../../api/axios";
import { Field, Loading, PageHead } from "../SiteContent/bits";
import { errorOf } from "../SiteContent/helpers";
import { KINDS } from "./kinds";

/**
 * সাইন-ইন (পুরস্কার কেন্দ্র) — ধারার দিনগুলো, প্রতিদিনের শর্ত (জমা + বাজি),
 * প্রতিটা দিনের টিকিট, আর নতুন খেলোয়াড়কে নিবন্ধনে দেওয়া টিকিট।
 */
const SignInSetting = () => {
  const [form, setForm] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api.get("/api/rewards/admin/signin"), api.get("/api/rewards/admin/templates")])
      .then(([a, b]) => {
        const s = a.data?.data?.setting || {};
        setForm({
          enabled: s.enabled !== false,
          title: s.title || { bn: "", en: "" },
          rules: s.rules || { bn: "", en: "" },
          depositReq: s.depositReq ?? 0,
          betReq: s.betReq ?? 0,
          registerTemplate: s.registerTemplate || "",
          days: (s.days || []).map((d) => ({ name: d.name || { bn: "", en: "" }, template: d.template || "" })),
        });
        setTemplates(b.data?.data?.templates || []);
      })
      .catch((e) => toast.error(errorOf(e, "Failed to load")));
  }, []);

  if (!form) return <Loading />;

  const set = (key, value) => setForm((v) => ({ ...v, [key]: value }));
  const setDay = (i, patch) => set("days", form.days.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const options = templates.filter((t) => t.isActive);

  const save = async () => {
    try {
      setBusy(true);
      await api.put("/api/rewards/admin/signin", { ...form, registerTemplate: form.registerTemplate || null });
      toast.success("Sign-in saved");
    } catch (err) {
      toast.error(errorOf(err, "Could not save"));
    } finally {
      setBusy(false);
    }
  };

  const templateSelect = (value, onChange, none) => (
    <select className="ad-input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{none}</option>
      {options.map((t) => (
        <option key={t._id} value={t._id}>
          {t.name?.bn || t.name?.en} — {KINDS[t.kind]}
        </option>
      ))}
    </select>
  );

  return (
    <div className="mx-auto max-w-[1000px]">
      <PageHead title="Sign-in Setting" subtitle="Daily check-in in the Reward Center. Each day a player meets the deposit + betting condition, they claim that day's ticket. Missing a day starts again from day 1.">
        <button type="button" disabled={busy} onClick={save} className="ad-btn ad-btn--primary ad-btn--sm">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save
        </button>
      </PageHead>

      <div className="ad-card mb-5 grid gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-[14px] text-[var(--text-secondary)]">
          <input type="checkbox" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} /> Sign-in is on
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Deposit needed that day (৳)">
            <input type="number" min={0} className="ad-input" value={form.depositReq} onChange={(e) => set("depositReq", e.target.value)} />
          </Field>
          <Field label="Bets needed that day (৳)">
            <input type="number" min={0} className="ad-input" value={form.betReq} onChange={(e) => set("betReq", e.target.value)} />
          </Field>
          {["bn", "en"].map((lng) => (
            <Field key={`t${lng}`} label={`Title (${lng === "bn" ? "বাংলা" : "English"})`}>
              <input className="ad-input" value={form.title[lng] || ""} onChange={(e) => set("title", { ...form.title, [lng]: e.target.value })} />
            </Field>
          ))}
          {["bn", "en"].map((lng) => (
            <Field key={`r${lng}`} label={`Rules (${lng === "bn" ? "বাংলা" : "English"})`}>
              <textarea rows={7} className="ad-input" style={{ minHeight: 170 }} value={form.rules[lng] || ""} onChange={(e) => set("rules", { ...form.rules, [lng]: e.target.value })} />
            </Field>
          ))}
        </div>
        <Field label="Register gift" hint="Every new player gets this ticket once when they sign up (like the TEMU grand prize on the main site).">
          {templateSelect(form.registerTemplate, (v) => set("registerTemplate", v), "— No register gift —")}
        </Field>
      </div>

      <div className="ad-card grid gap-3">
        <p className="ad-label">Days of the streak (up to 10)</p>
        {form.days.map((day, i) => (
          <div key={i} className="grid items-end gap-2 md:grid-cols-[50px_1fr_1fr_1.2fr_40px]">
            <span className="pb-2 text-[13px] font-bold text-[var(--text-muted)]">Day {i + 1}</span>
            <Field label="Name (বাংলা)">
              <input className="ad-input" value={day.name.bn || ""} onChange={(e) => setDay(i, { name: { ...day.name, bn: e.target.value } })} />
            </Field>
            <Field label="Name (English)">
              <input className="ad-input" value={day.name.en || ""} onChange={(e) => setDay(i, { name: { ...day.name, en: e.target.value } })} />
            </Field>
            <Field label="Ticket">
              {templateSelect(day.template, (v) => setDay(i, { template: v }), "— No ticket —")}
            </Field>
            <button type="button" onClick={() => set("days", form.days.filter((_, j) => j !== i))} className="ad-btn ad-btn--ghost ad-btn--sm mb-1">
              <X size={14} />
            </button>
          </div>
        ))}
        {form.days.length < 10 && (
          <button type="button" onClick={() => set("days", [...form.days, { name: { bn: "", en: "" }, template: "" }])} className="ad-btn ad-btn--ghost ad-btn--sm w-fit">
            <Plus size={14} /> Add day
          </button>
        )}
      </div>
    </div>
  );
};

export default SignInSetting;
