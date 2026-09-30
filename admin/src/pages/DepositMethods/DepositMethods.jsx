import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

import { api } from "../../api/axios";
import ManualSwitch from "../../components/ManualSwitch/ManualSwitch";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/** সার্ভারে রাখা ছবির পুরো ঠিকানা */
const imageUrl = (url) => {
  if (!url) return "";

  return url.startsWith("http") ? url : `${API_URL}${url}`;
};

const fetchMethods = async () => {
  const { data } = await api.get("/api/deposit-methods");
  return data?.data?.methods || [];
};

const emptyDraft = {
  methodId: "",
  nameBn: "",
  nameEn: "",
  methodType: "agent",
  group: "ewallet",
  logoUrl: "",
  minDepositAmount: "300",
  maxDepositAmount: "25000",
  sort: "0",
  isActive: true,
  contacts: [],
};

const draftFrom = (method) => ({
  methodId: method.methodId || "",
  nameBn: method.methodName?.bn || "",
  nameEn: method.methodName?.en || "",
  methodType: method.methodType || "agent",
  group: method.group || "ewallet",
  logoUrl: method.logoUrl || "",
  minDepositAmount: String(method.minDepositAmount ?? 0),
  maxDepositAmount: String(method.maxDepositAmount ?? 0),
  sort: String(method.sort ?? 0),
  isActive: method.isActive !== false,
  contacts: (method.contacts || []).map((contact) => ({
    id: contact.id || "",
    labelBn: contact.label?.bn || "",
    labelEn: contact.label?.en || "",
    number: contact.number || "",
    isActive: contact.isActive !== false,
  })),
});

/**
 * ডিপোজিটের উপায়।
 *
 * এখানে শুধু উপায়টার পরিচয় আর টাকা পাঠানোর নম্বর। ফর্মে ব্যবহারকারী
 * কী লিখবে সেটা "Deposit Field" পেজে, আর বোনাস ও টার্নওভারের নিয়ম
 * "Bonus & Turnover" পেজে — তিনটে আলাদা রাখায় একটা বদলাতে গিয়ে
 * অন্যটায় হাত পড়ে না।
 */
const DepositMethods = () => {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);

  // বাছা ফাইল আর তার পূর্বরূপ — সেভ না করা পর্যন্ত সার্ভারে যায় না
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const fileRef = useRef(null);

  const pickLogo = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5MB or smaller");
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  useEffect(() => {
    let alive = true;

    fetchMethods()
      .then((list) => alive && setMethods(list))
      .catch((error) =>
        toast.error(error?.response?.data?.message || "Failed to load"),
      )
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setMethods(await fetchMethods());
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const set = (key) => (event) => {
    const value =
      event.target.type === "checkbox" ? event.target.checked : event.target.value;

    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const setContact = (index, key, value) =>
    setDraft((prev) => ({
      ...prev,
      contacts: prev.contacts.map((row, i) =>
        i === index ? { ...row, [key]: value } : row,
      ),
    }));

  const close = () => {
    setEditing(null);
    setDraft(emptyDraft);
    setLogoFile(null);
    setLogoPreview("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!draft.methodId.trim()) {
      toast.error("Method id is required");
      return;
    }

    if (!draft.nameBn.trim() && !draft.nameEn.trim()) {
      toast.error("Give the method a name");
      return;
    }

    const contacts = draft.contacts
      .filter((contact) => contact.number.trim())
      .map((contact, index) => ({
        id: contact.id || "",
        label: { bn: contact.labelBn, en: contact.labelEn },
        number: contact.number.trim(),
        isActive: contact.isActive,
        sort: index,
      }));

    // ছবির সাথে পাঠাতে multipart লাগে, তাই nested অংশগুলো JSON স্ট্রিং
    // হয়ে যায় — সার্ভার সেগুলো খুলে নেয়
    const payload = new FormData();

    payload.append("methodId", draft.methodId.trim().toLowerCase());
    payload.append(
      "methodName",
      JSON.stringify({ bn: draft.nameBn, en: draft.nameEn }),
    );
    payload.append("methodType", draft.methodType);
    payload.append("group", draft.group);
    payload.append("logoUrl", draft.logoUrl);
    payload.append("minDepositAmount", Number(draft.minDepositAmount) || 0);
    payload.append("maxDepositAmount", Number(draft.maxDepositAmount) || 0);
    payload.append("sort", Number(draft.sort) || 0);
    payload.append("isActive", draft.isActive ? "true" : "false");
    payload.append("contacts", JSON.stringify(contacts));

    if (logoFile) payload.append("logo", logoFile);

    try {
      setBusy("save");

      const { data } =
        editing === "new"
          ? await api.post("/api/deposit-methods", payload)
          : await api.put(`/api/deposit-methods/${editing}`, payload);

      toast.success(data?.message || "Saved");
      close();
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Save failed");
    } finally {
      setBusy("");
    }
  };

  const handleDelete = async (method) => {
    const name = method.methodName?.en || method.methodId;

    if (
      !window.confirm(
        `Delete ${name}? Its form fields and bonus rules go too. Past requests keep their record.`,
      )
    ) {
      return;
    }

    try {
      setBusy(method._id);
      const { data } = await api.delete(`/api/deposit-methods/${method._id}`);

      toast.success(data?.message || "Deleted");
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Delete failed");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ad-title text-[26px] lg:text-[30px]">
            Add Deposit Method
          </h1>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">
            The ways a player can put money in, and the numbers to send it to.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="ad-btn ad-btn--ghost ad-btn--sm"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => {
              setDraft(emptyDraft);
              setEditing("new");
            }}
            className="ad-btn ad-btn--primary ad-btn--sm"
          >
            <Plus size={15} />
            New method
          </button>
        </div>
      </div>

      <ManualSwitch kind="deposit" />

      {editing && (
        <div className="ad-card mb-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[16px] font-extrabold text-[var(--neutral100)]">
              {editing === "new" ? "New method" : "Edit method"}
            </h2>

            <button
              type="button"
              onClick={close}
              className="ad-btn ad-btn--ghost ad-btn--sm"
            >
              <X size={15} />
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="ad-label" htmlFor="dm-id">
                  Method id
                </label>
                <input
                  id="dm-id"
                  value={draft.methodId}
                  onChange={set("methodId")}
                  disabled={editing !== "new"}
                  placeholder="bkash"
                  className="ad-input disabled:opacity-60"
                />
              </div>

              <div>
                <label className="ad-label" htmlFor="dm-name-bn">
                  Name (Bangla)
                </label>
                <input
                  id="dm-name-bn"
                  value={draft.nameBn}
                  onChange={set("nameBn")}
                  className="ad-input"
                />
              </div>

              <div>
                <label className="ad-label" htmlFor="dm-name-en">
                  Name (English)
                </label>
                <input
                  id="dm-name-en"
                  value={draft.nameEn}
                  onChange={set("nameEn")}
                  className="ad-input"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="ad-label" htmlFor="dm-group">
                  Group
                </label>
                <select
                  id="dm-group"
                  value={draft.group}
                  onChange={set("group")}
                  className="ad-input"
                >
                  <option value="ewallet">E-Wallet</option>
                  <option value="crypto">Crypto</option>
                  <option value="bank">Bank</option>
                </select>
              </div>

              <div>
                <label className="ad-label" htmlFor="dm-type">
                  Account type
                </label>
                <select
                  id="dm-type"
                  value={draft.methodType}
                  onChange={set("methodType")}
                  className="ad-input"
                >
                  <option value="agent">Agent</option>
                  <option value="personal">Personal</option>
                </select>
              </div>

              <div>
                <label className="ad-label" htmlFor="dm-min">
                  Minimum
                </label>
                <input
                  id="dm-min"
                  type="number"
                  min="0"
                  value={draft.minDepositAmount}
                  onChange={set("minDepositAmount")}
                  className="ad-input"
                />
              </div>

              <div>
                <label className="ad-label" htmlFor="dm-max">
                  Maximum
                </label>
                <input
                  id="dm-max"
                  type="number"
                  min="0"
                  value={draft.maxDepositAmount}
                  onChange={set("maxDepositAmount")}
                  className="ad-input"
                />
              </div>

              <div>
                <label className="ad-label" htmlFor="dm-sort">
                  Order
                </label>
                <input
                  id="dm-sort"
                  type="number"
                  min="0"
                  value={draft.sort}
                  onChange={set("sort")}
                  className="ad-input"
                />
              </div>
            </div>

            {/* ── লোগো ── */}
            <div className="rounded-[14px] border border-white/[0.07] p-4">
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-white/[0.08] bg-black/30 p-1">
                  {logoPreview || draft.logoUrl ? (
                    <img
                      src={logoPreview || imageUrl(draft.logoUrl)}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <ImagePlus size={24} className="text-[var(--text-disabled)]" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-[var(--neutral100)]">
                    Logo
                  </p>
                  <p className="text-[12px] text-[var(--text-muted)]">
                    png, jpg, webp, svg or gif — up to 5MB
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="ad-btn ad-btn--ghost ad-btn--sm"
                    >
                      <ImagePlus size={14} />
                      {logoPreview || draft.logoUrl ? "Change" : "Choose image"}
                    </button>

                    {(logoPreview || draft.logoUrl) && (
                      <button
                        type="button"
                        onClick={() => {
                          setLogoFile(null);
                          setLogoPreview("");
                          setDraft((prev) => ({ ...prev, logoUrl: "" }));
                          if (fileRef.current) fileRef.current.value = "";
                        }}
                        className="ad-btn ad-btn--danger ad-btn--sm"
                      >
                        <Trash2 size={14} />
                        Remove
                      </button>
                    )}
                  </div>

                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={pickLogo}
                    className="hidden"
                  />
                </div>

                <label className="flex items-center gap-2 text-[14px] text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={draft.isActive}
                    onChange={set("isActive")}
                  />
                  Active
                </label>
              </div>
            </div>

            {/* ── নম্বর ── */}
            <div className="rounded-[14px] border border-white/[0.07] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-extrabold text-[var(--neutral100)]">
                    Numbers to send money to
                  </h3>
                  <p className="text-[12px] text-[var(--text-muted)]">
                    The first active one is shown on the deposit form.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      contacts: [
                        ...prev.contacts,
                        { id: "", labelBn: "", labelEn: "", number: "", isActive: true },
                      ],
                    }))
                  }
                  className="ad-btn ad-btn--ghost ad-btn--sm"
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>

              {draft.contacts.length === 0 ? (
                <p className="text-[13px] text-[var(--text-disabled)]">
                  No number yet.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {draft.contacts.map((contact, index) => (
                    <div
                      key={index}
                      className="grid items-center gap-3 lg:grid-cols-[1fr_1fr_1fr_auto_auto]"
                    >
                      <input
                        value={contact.labelBn}
                        onChange={(e) => setContact(index, "labelBn", e.target.value)}
                        placeholder="Label (Bangla)"
                        className="ad-input"
                      />

                      <input
                        value={contact.labelEn}
                        onChange={(e) => setContact(index, "labelEn", e.target.value)}
                        placeholder="Label (English)"
                        className="ad-input"
                      />

                      <input
                        value={contact.number}
                        onChange={(e) => setContact(index, "number", e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="ad-input"
                      />

                      <label className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
                        <input
                          type="checkbox"
                          checked={contact.isActive}
                          onChange={(e) =>
                            setContact(index, "isActive", e.target.checked)
                          }
                        />
                        Active
                      </label>

                      <button
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            contacts: prev.contacts.filter((_, i) => i !== index),
                          }))
                        }
                        className="ad-btn ad-btn--danger ad-btn--sm"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={Boolean(busy)}
              className="ad-btn ad-btn--primary w-full sm:w-auto"
            >
              {busy === "save" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Save method
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="ad-card flex items-center gap-3 text-[var(--text-muted)]">
          <Loader2 size={16} className="animate-spin" />
          Loading methods…
        </div>
      ) : methods.length === 0 ? (
        <div className="ad-card flex flex-col items-center gap-3 py-10 text-center">
          <Wallet size={28} className="text-[var(--text-disabled)]" />
          <p className="text-[15px] font-semibold text-[var(--neutral100)]">
            No deposit method yet
          </p>
          <p className="max-w-[420px] text-[13px] text-[var(--text-muted)]">
            Until one is added, the deposit page on the client site stays empty.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {methods.map((method) => (
            <div key={method._id} className="ad-card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  {method.logoUrl && (
                    <img
                      src={imageUrl(method.logoUrl)}
                      alt=""
                      className="h-16 w-16 shrink-0 rounded-[12px] bg-white/[0.04] object-contain p-1"
                    />
                  )}

                  <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[18px] font-extrabold text-[var(--neutral100)]">
                      {method.methodName?.en || method.methodId}
                    </h3>

                    <span
                      className="rounded-full px-2 py-[2px] text-[11px] font-bold"
                      style={{
                        background:
                          method.isActive !== false
                            ? "color-mix(in srgb, var(--status-success), transparent 88%)"
                            : "color-mix(in srgb, var(--status-danger), transparent 88%)",
                        color:
                          method.isActive !== false
                            ? "var(--status-success)"
                            : "var(--status-danger)",
                      }}
                    >
                      {method.isActive !== false ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {method.methodName?.bn && (
                    <p className="mt-1 text-[15px] text-[var(--text-secondary)]">
                      {method.methodName.bn}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[14px] text-[var(--text-muted)]">
                    <span className="capitalize">{method.group}</span>
                    <span className="capitalize">{method.methodType}</span>
                    <span>
                      {method.minDepositAmount} – {method.maxDepositAmount}
                    </span>
                    <span>{method.contacts?.length || 0} number(s)</span>
                    <span>Order {method.sort}</span>
                  </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(draftFrom(method));
                      setLogoFile(null);
                      setLogoPreview("");
                      setEditing(method._id);
                    }}
                    className="ad-btn ad-btn--ghost ad-btn--sm"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>

                  <button
                    type="button"
                    disabled={busy === method._id}
                    onClick={() => handleDelete(method)}
                    className="ad-btn ad-btn--danger ad-btn--sm"
                  >
                    {busy === method._id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-[12px] text-[var(--text-disabled)]">
        A new method still needs its form fields and its bonus rules before a
        player can use it — those live on their own pages.
      </p>
    </div>
  );
};

export default DepositMethods;
