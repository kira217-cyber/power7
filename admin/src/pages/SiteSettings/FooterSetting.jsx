import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Loader2, Save } from "lucide-react";

import { api } from "../../api/axios";
import { HistoryHeader } from "../../components/HistoryBits/HistoryBits";
import { ImageRow, LangRow } from "./bits";

const EMPTY = { bn: "", en: "" };

/**
 * ফুটার সেটিং — ক্লায়েন্ট ও অ্যাফিলিয়েট দুটোর জন্য। `fields` বলে দেয়
 * কোন কোন লেখা দেখাবে (ক্লায়েন্টে subtitle/license, অ্যাফিলিয়েটে
 * description/ageNotice)।
 */
const FooterPage = ({ title, subtitle, endpoint, Icon, fields, logoKey = "logo" }) => {
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const set = (k, v) => setDraft((p) => ({ ...p, [k]: v }));

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/api/site-settings/admin/${endpoint}`);
      const d = data?.data?.data || {};
      const next = { [logoKey]: d[logoKey] || "" };
      fields.forEach((f) => {
        next[f.key] = d[f.key] || { ...EMPTY };
      });
      setDraft(next);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // এক ধাপ পরে — effect এর ভিতরে সরাসরি setState নয়
    queueMicrotask(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  const save = async () => {
    try {
      setBusy(true);
      await api.put(`/api/site-settings/admin/${endpoint}`, draft);
      toast.success("Saved");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="ad-card flex items-center gap-3 text-[var(--text-muted)]">
        <Loader2 size={16} className="animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[860px]">
      <HistoryHeader title={title} subtitle={subtitle} Icon={Icon} />

      <div className="ad-card mb-4 flex flex-col gap-4">
        <ImageRow
          label="Footer logo"
          size="≈ 200 × 64 px"
          value={draft[logoKey] || ""}
          onChange={(v) => set(logoKey, v)}
        />
        {fields.map((f) => (
          <LangRow
            key={f.key}
            label={f.label}
            value={draft[f.key] || EMPTY}
            onChange={(v) => set(f.key, v)}
            textarea={f.textarea}
            rows={f.rows}
          />
        ))}
      </div>

      <button type="button" onClick={save} disabled={busy} className="ad-btn ad-btn--primary">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        Save
      </button>
    </div>
  );
};

export default FooterPage;
