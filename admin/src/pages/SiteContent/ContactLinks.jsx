import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Loader2, Save } from "lucide-react";

import { api } from "../../api/axios";
import { Field, Loading, PageHead } from "./bits";
import { errorOf } from "./helpers";

const FIELDS = [
  ["supportUrl", "Customer service link", "Opened by every “Customer service” button, the maintenance screen and forgot-password. Required."],
  ["telegramUrl", "Telegram", ""],
  ["whatsappUrl", "WhatsApp", ""],
  ["facebookUrl", "Facebook", ""],
  ["email", "Email", ""],
];

/** গ্রাহক সেবার ঠিকানা — ক্লায়েন্টের সব "গ্রাহক সেবা" বোতাম এটাই খোলে */
const ContactLinks = () => {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get("/api/site-content/admin/contact")
      .then(({ data }) => setForm(data?.data?.setting || {}))
      .catch((e) => toast.error(errorOf(e, "Failed to load")));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const { data } = await api.put("/api/site-content/admin/contact", form);
      setForm(data?.data?.setting || form);
      toast.success("Contact links saved");
    } catch (err) {
      toast.error(errorOf(err, "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <Loading />;

  return (
    <div className="mx-auto max-w-[760px]">
      <PageHead title="Contact Links" subtitle="Where players reach customer service." />
      <form onSubmit={save} className="ad-card grid gap-4">
        {FIELDS.map(([key, label, hint]) => (
          <Field key={key} label={label} hint={hint}>
            <input
              className="ad-input"
              value={form[key] || ""}
              placeholder={key === "email" ? "support@example.com" : "https://…"}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          </Field>
        ))}
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="ad-btn ad-btn--primary">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save
          </button>
        </div>
      </form>
    </div>
  );
};

export default ContactLinks;
