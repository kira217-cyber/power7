import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  Eye,
  EyeOff,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";

import { api } from "../../api/axios";
import SecretInput from "../../components/SecretInput/SecretInput";
import { allPermissions, roleLabels } from "../../data/navigation";
import { selectAdmin } from "../../features/auth/authSelectors";

const ROLE_OPTIONS = [
  { value: "sub", label: "Sub Admin — only the pages you tick" },
  { value: "viewer", label: "View Only Admin — sees everything, changes nothing" },
  { value: "mother", label: "Mother Admin — full control" },
];

/** অ্যাডমিন তালিকা আনে — কম্পোনেন্টের বাইরে, যাতে effect আর বোতাম দুজনেই ব্যবহার করতে পারে */
const fetchAdmins = async () => {
  const { data } = await api.get("/api/admin/admins");
  return data?.data?.admins || [];
};

const emptyForm = {
  email: "",
  password: "",
  role: "sub",
  permissions: [],
  showOnLogin: false,
};

/** অ্যাডমিন অ্যাকাউন্ট ব্যবস্থাপনা — শুধু mother অ্যাডমিন দেখে */
const Admins = () => {
  const me = useSelector(selectAdmin);

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [edit, setEdit] = useState({
    email: "",
    role: "sub",
    permissions: [],
    newPassword: "",
    showOnLogin: false,
  });
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    let alive = true;

    fetchAdmins()
      .then((list) => alive && setAdmins(list))
      .catch((error) =>
        toast.error(error?.response?.data?.message || "Failed to load admins"),
      )
      .finally(() => alive && setLoading(false));

    // পেজ ছেড়ে গেলে উত্তর এলে আর state বদলানো হয় না
    return () => {
      alive = false;
    };
  }, []);

  // তালিকা আবার আনা — Refresh বোতাম আর create/update/delete-এর পরে
  const load = async () => {
    try {
      setLoading(true);
      setAdmins(await fetchAdmins());
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load admins");
    } finally {
      setLoading(false);
    }
  };

  const togglePerm = (list, key) =>
    list.includes(key) ? list.filter((item) => item !== key) : [...list, key];

  const submitCreate = async (event) => {
    event.preventDefault();

    if (!form.email.trim()) return toast.error("Email is required");
    if (form.password.trim().length < 8) {
      return toast.error("Password must be at least 8 characters");
    }

    try {
      setCreating(true);

      await api.post("/api/admin/admins", {
        email: form.email.trim().toLowerCase(),
        password: form.password.trim(),
        role: form.role,
        permissions: form.role === "sub" ? form.permissions : [],
        showOnLogin: form.role === "viewer" && form.showOnLogin,
      });

      toast.success("Admin created");
      setForm(emptyForm);
      setShowPassword(false);
      load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (admin) => {
    setEditingId(admin._id);
    setEdit({
      email: admin.email || "",
      role: admin.role || "sub",
      permissions: Array.isArray(admin.permissions) ? admin.permissions : [],
      newPassword: "",
      showOnLogin: Boolean(admin.showOnLogin),
    });
  };

  const submitEdit = async (id) => {
    try {
      const payload = {
        email: edit.email.trim().toLowerCase(),
        permissions: edit.role === "sub" ? edit.permissions : [],
        showOnLogin: edit.role === "viewer" && edit.showOnLogin,
      };

      // নিজের role সার্ভারও বদলাতে দেয় না, তাই পাঠানোই হয় না
      if (id !== me?.id) {
        payload.role = edit.role;
      }

      if (edit.newPassword.trim()) {
        if (edit.newPassword.trim().length < 8) {
          return toast.error("New password must be at least 8 characters");
        }
        payload.newPassword = edit.newPassword.trim();
      }

      await api.put(`/api/admin/admins/${id}`, payload);
      toast.success("Admin updated");
      setEditingId(null);
      load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Update failed");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await api.delete(`/api/admin/admins/${deleteId}`);
      toast.success("Admin deleted");
      if (editingId === deleteId) setEditingId(null);
      load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Delete failed");
    } finally {
      setDeleteId(null);
    }
  };

  /**
   * "লগইন পেজে দেখাও" — শুধু viewer রোলে।
   *
   * পাসওয়ার্ড ডেটাবেসে bcrypt হ্যাশ হয়ে থাকে, হ্যাশ থেকে ফেরত আনা যায়
   * না। তাই লগইন পেজে দেখাতে হলে পাসওয়ার্ডটা আলাদা করে রাখতে হয় —
   * সেজন্য টিক দেওয়ার সময় পাসওয়ার্ডটাও দিতে হয়।
   */
  const demoToggle = (checked, onChange, hint) => (
    <label className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-[var(--primary500)]/25 bg-[var(--primary500)]/[0.06] px-4 py-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 cursor-pointer accent-[var(--primary500)]"
      />

      <span>
        <span className="block text-[14px] font-semibold text-[var(--text-primary)]">
          Show on login page
        </span>
        <span className="mt-0.5 block text-[12px] leading-relaxed text-[var(--text-muted)]">
          {hint}
        </span>
      </span>
    </label>
  );

  const permissionGrid = (selected, onToggle) => (
    <div>
      <label className="ad-label">Page permissions</label>

      <div className="grid gap-2 sm:grid-cols-2">
        {allPermissions.map((perm) => (
          <label
            key={perm.key}
            className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-white/5 bg-black/25 px-4 py-3 transition-colors hover:border-[var(--primary500)]/30 hover:bg-white/[0.06]"
          >
            <input
              type="checkbox"
              checked={selected.includes(perm.key)}
              onChange={() => onToggle(perm.key)}
              className="mt-0.5 h-4 w-4 cursor-pointer accent-[var(--primary500)]"
            />

            <span>
              <span className="block text-[14px] font-semibold text-[var(--neutral100)]">
                {perm.label}
              </span>
              <span className="text-[12px] text-[var(--text-muted)]">
                {perm.path}
              </span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1100px]">
      <h1 className="ad-title text-[26px] lg:text-[30px]">
        Admin Accounts
      </h1>
      <p className="mt-1 text-[14px] text-[var(--text-muted)]">
        Create admins and control what each one can reach.
      </p>

      {/* ── নতুন অ্যাডমিন ── */}
      <div className="ad-card mt-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-[var(--primary500)]/25 bg-[var(--primary500)]/10 text-[var(--primary500)]">
            <Plus size={18} />
          </span>

          <h2 className="text-[16px] font-bold text-[var(--neutral100)]">
            Create new admin
          </h2>
        </div>

        <form onSubmit={submitCreate} className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="ad-label">Email address</label>
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, email: event.target.value }))
                }
                placeholder="new.admin@power7.live"
                className="ad-input"
                required
              />
            </div>

            <div>
              <label className="ad-label">Password</label>

              <div className="ad-field !px-4 !py-0">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                  placeholder="Minimum 8 characters"
                  className="h-[46px] w-full bg-transparent text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-disabled)]"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="shrink-0 cursor-pointer text-[var(--text-disabled)] hover:text-[var(--text-secondary)]"
                >
                  {showPassword ? <Eye size={17} /> : <EyeOff size={17} />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="ad-label">Role</label>

            <select
              value={form.role}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, role: event.target.value }))
              }
              className="ad-input cursor-pointer"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {form.role === "viewer" &&
            demoToggle(
              form.showOnLogin,
              (checked) => setForm((prev) => ({ ...prev, showOnLogin: checked })),
              "This account's email and password will be shown to everyone on the login page, with copy buttons. Only view only admins can be shown.",
            )}

          {form.role === "sub" &&
            permissionGrid(form.permissions, (key) =>
              setForm((prev) => ({
                ...prev,
                permissions: togglePerm(prev.permissions, key),
              })),
            )}

          <button
            type="submit"
            disabled={creating}
            className="ad-btn ad-btn--primary w-full sm:w-auto"
          >
            {creating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <Plus size={16} />
                Create Admin
              </>
            )}
          </button>
        </form>
      </div>

      {/* ── তালিকা ── */}
      <div className="ad-card mt-4">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[16px] font-bold text-[var(--neutral100)]">
            All admins ({admins.length})
          </h2>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="ad-btn ad-btn--ghost ad-btn--sm"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="py-10 text-center text-[14px] text-[var(--text-muted)]">
            Loading…
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {admins.map((admin) => {
              const isEditing = editingId === admin._id;
              const isSelf = admin._id === me?.id;

              return (
                <div
                  key={admin._id}
                  className="rounded-[16px] border border-white/5 bg-black/25 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="break-all text-[15px] font-bold text-[var(--neutral100)]">
                        {admin.email}
                        {isSelf && (
                          <span className="ms-2 text-[12px] font-medium text-[var(--text-muted)]">
                            (you)
                          </span>
                        )}
                      </p>

                      <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                        {roleLabels[admin.role] || admin.role}
                        {admin.isActive === false && (
                          <span className="ms-2 text-[var(--status-danger)]">
                            · disabled
                          </span>
                        )}
                        {admin.showOnLogin && (
                          <span className="ms-2 text-[var(--primary500)]">
                            · shown on login page
                          </span>
                        )}
                      </p>

                      {admin.role === "sub" && (
                        <p className="mt-1 break-words text-[13px] text-[var(--text-muted)]">
                          Permissions:{" "}
                          {admin.permissions?.length
                            ? admin.permissions.join(", ")
                            : "None"}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => submitEdit(admin._id)}
                            className="ad-btn ad-btn--primary ad-btn--sm"
                          >
                            <Save size={15} />
                            Save
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="ad-btn ad-btn--ghost ad-btn--sm"
                          >
                            <X size={15} />
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(admin)}
                            className="ad-btn ad-btn--ghost ad-btn--sm"
                          >
                            Edit
                          </button>

                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => setDeleteId(admin._id)}
                              className="ad-btn ad-btn--danger ad-btn--sm"
                            >
                              Delete
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div className="mt-5 flex flex-col gap-5 border-t border-[var(--neutral700)] pt-5">
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label className="ad-label">Email</label>
                          <input
                            type="email"
                            value={edit.email}
                            onChange={(event) =>
                              setEdit((prev) => ({ ...prev, email: event.target.value }))
                            }
                            className="ad-input !bg-[var(--neutral900)]"
                          />
                        </div>

                        <div>
                          <label className="ad-label">Role</label>
                          <select
                            value={edit.role}
                            disabled={isSelf}
                            onChange={(event) =>
                              setEdit((prev) => ({ ...prev, role: event.target.value }))
                            }
                            className="ad-input cursor-pointer !bg-[var(--neutral900)] disabled:cursor-not-allowed"
                          >
                            {ROLE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>

                          {isSelf && (
                            <p className="mt-2 text-[12px] text-[var(--text-muted)]">
                              You cannot change your own role.
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="ad-label">New password</label>
                        <SecretInput
                          value={edit.newPassword}
                          onChange={(event) =>
                            setEdit((prev) => ({
                              ...prev,
                              newPassword: event.target.value,
                            }))
                          }
                          placeholder="Leave empty to keep current"
                          className="!bg-[var(--neutral900)]"
                        />
                      </div>

                      {edit.role === "viewer" &&
                        demoToggle(
                          edit.showOnLogin,
                          (checked) =>
                            setEdit((prev) => ({
                              ...prev,
                              showOnLogin: checked,
                            })),
                          "Type a new password above as well — the saved one is hashed, so it cannot be read back to show here.",
                        )}

                      {edit.role === "sub" &&
                        permissionGrid(edit.permissions, (key) =>
                          setEdit((prev) => ({
                            ...prev,
                            permissions: togglePerm(prev.permissions, key),
                          })),
                        )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── ডিলিট নিশ্চিতকরণ ── */}
      {deleteId && (
        <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black/70 p-4">
          <div className="ad-card w-full max-w-[400px]">
            <span className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-[var(--status-danger)]/30 bg-[var(--status-danger)]/10 text-[var(--status-danger)]">
              <Trash2 size={19} />
            </span>

            <h3 className="mt-4 text-[18px] font-bold text-[var(--neutral100)]">
              Delete this admin?
            </h3>

            <p className="mt-2 text-[14px] text-[var(--text-muted)]">
              This cannot be undone. The account will lose access immediately.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="ad-btn ad-btn--ghost flex-1"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="ad-btn ad-btn--danger flex-1"
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admins;
