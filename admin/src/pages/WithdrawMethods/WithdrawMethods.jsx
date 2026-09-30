import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  Banknote,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";

import { api } from "../../api/axios";
import DailyLimitCard from "./DailyLimitCard";
import ManualSwitch from "../../components/ManualSwitch/ManualSwitch";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const imageUrl = (url) => {
  if (!url) return "";

  return url.startsWith("http") ? url : `${API_URL}${url}`;
};

const fetchMethods = async () => {
  const { data } = await api.get("/api/withdraw-methods");
  return data?.data?.methods || [];
};

const emptyDraft = {
  methodId: "",
  nameBn: "",
  nameEn: "",
  logoUrl: "",
  minimumWithdrawAmount: "500",
  maximumWithdrawAmount: "25000",
  sort: "0",
  isActive: true,
};

const draftFrom = (method) => ({
  methodId: method.methodId || "",
  nameBn: method.name?.bn || "",
  nameEn: method.name?.en || "",
  logoUrl: method.logoUrl || "",
  minimumWithdrawAmount: String(method.minimumWithdrawAmount ?? 0),
  maximumWithdrawAmount: String(method.maximumWithdrawAmount ?? 0),
  sort: String(method.sort ?? 0),
  isActive: method.isActive !== false,
});

/**
 * টাকা তোলার উপায়।
 *
 * ডিপোজিটের মেথডের মতো এখানে নম্বর বসাতে হয় না — নম্বরটা ব্যবহারকারী
 * নিজে দেন, কারণ টাকা তাঁর কাছেই যাবে।
 */
const WithdrawMethods = () => {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const fileRef = useRef(null);

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

    const payload = new FormData();

    payload.append("methodId", draft.methodId.trim().toUpperCase());
    payload.append(
      "name",
      JSON.stringify({ bn: draft.nameBn, en: draft.nameEn }),
    );
    payload.append("logoUrl", draft.logoUrl);
    payload.append("minimumWithdrawAmount", Number(draft.minimumWithdrawAmount) || 0);
    payload.append("maximumWithdrawAmount", Number(draft.maximumWithdrawAmount) || 0);
    payload.append("sort", Number(draft.sort) || 0);
    payload.append("isActive", draft.isActive ? "true" : "false");

    if (logoFile) payload.append("logo", logoFile);

    try {
      setBusy("save");

      const { data } =
        editing === "new"
          ? await api.post("/api/withdraw-methods", payload)
          : await api.put(`/api/withdraw-methods/${editing}`, payload);

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
    const name = method.name?.en || method.methodId;

    if (!window.confirm(`Delete ${name}? Past requests keep their record.`)) {
      return;
    }

    try {
      setBusy(method._id);
      const { data } = await api.delete(`/api/withdraw-methods/${method._id}`);

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
            Add Withdraw Method
          </h1>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">
            The ways a player can take money out.
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
              setLogoFile(null);
              setLogoPreview("");
              setEditing("new");
            }}
            className="ad-btn ad-btn--primary ad-btn--sm"
          >
            <Plus size={15} />
            New method
          </button>
        </div>
      </div>

      <ManualSwitch kind="withdraw" />
      <DailyLimitCard />

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
                <label className="ad-label" htmlFor="wm-id">
                  Method id
                </label>
                <input
                  id="wm-id"
                  value={draft.methodId}
                  onChange={set("methodId")}
                  disabled={editing !== "new"}
                  placeholder="BKASH"
                  className="ad-input disabled:opacity-60"
                />
              </div>

              <div>
                <label className="ad-label" htmlFor="wm-name-bn">
                  Name (Bangla)
                </label>
                <input
                  id="wm-name-bn"
                  value={draft.nameBn}
                  onChange={set("nameBn")}
                  className="ad-input"
                />
              </div>

              <div>
                <label className="ad-label" htmlFor="wm-name-en">
                  Name (English)
                </label>
                <input
                  id="wm-name-en"
                  value={draft.nameEn}
                  onChange={set("nameEn")}
                  className="ad-input"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="ad-label" htmlFor="wm-min">
                  Minimum
                </label>
                <input
                  id="wm-min"
                  type="number"
                  min="0"
                  value={draft.minimumWithdrawAmount}
                  onChange={set("minimumWithdrawAmount")}
                  className="ad-input"
                />
              </div>

              <div>
                <label className="ad-label" htmlFor="wm-max">
                  Maximum
                </label>
                <input
                  id="wm-max"
                  type="number"
                  min="0"
                  value={draft.maximumWithdrawAmount}
                  onChange={set("maximumWithdrawAmount")}
                  className="ad-input"
                />
              </div>

              <div>
                <label className="ad-label" htmlFor="wm-sort">
                  Order
                </label>
                <input
                  id="wm-sort"
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
                <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-white/[0.08] bg-black/30">
                  {logoPreview || draft.logoUrl ? (
                    <img
                      src={logoPreview || imageUrl(draft.logoUrl)}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <ImagePlus size={20} className="text-[var(--text-disabled)]" />
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
          <Banknote size={28} className="text-[var(--text-disabled)]" />
          <p className="text-[15px] font-semibold text-[var(--neutral100)]">
            No withdraw method yet
          </p>
          <p className="max-w-[420px] text-[13px] text-[var(--text-muted)]">
            Until one is added, players cannot take money out.
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
                      className="h-10 w-10 shrink-0 rounded-[10px] object-contain"
                    />
                  )}

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[16px] font-extrabold text-[var(--neutral100)]">
                        {method.name?.en || method.methodId}
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

                    {method.name?.bn && (
                      <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                        {method.name.bn}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-[var(--text-muted)]">
                      <span>{method.methodId}</span>
                      <span>
                        {method.minimumWithdrawAmount} –{" "}
                        {method.maximumWithdrawAmount}
                      </span>
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
        Players cannot withdraw while they still have a running turnover — the
        amount left is shown to them on the withdraw page.
      </p>
    </div>
  );
};

export default WithdrawMethods;
