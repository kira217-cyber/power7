import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Eye, EyeOff, Loader2, Save, ShieldAlert } from "lucide-react";

import { api } from "../../api/axios";
import { logout } from "../../features/auth/authSlice";
import { selectAdmin, selectCanWrite } from "../../features/auth/authSelectors";
import { roleLabels } from "../../data/navigation";

/** নিজের ইমেইল ও পাসওয়ার্ড বদলানো — viewer পারবে না */
const Profile = () => {
  const dispatch = useDispatch();
  const admin = useSelector(selectAdmin);
  const canWrite = useSelector(selectCanWrite);

  const [email, setEmail] = useState(admin?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!currentPassword.trim()) {
      return toast.error("Current password is required");
    }

    if (newPassword.trim() && newPassword.trim().length < 8) {
      return toast.error("New password must be at least 8 characters");
    }

    try {
      setSaving(true);

      await api.put("/api/admin/profile", {
        email: email.trim().toLowerCase(),
        currentPassword,
        newPassword: newPassword.trim(),
      });

      toast.success("Profile updated. Please login again.");

      // ইমেইল/পাসওয়ার্ড বদলালে পুরোনো টোকেন আর বিশ্বাসযোগ্য নয়
      dispatch(logout());
      window.location.href = `${import.meta.env.BASE_URL}login`;
    } catch (error) {
      toast.error(error?.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const passwordField = (label, value, onChange, show, setShow, placeholder) => (
    <div>
      <label className="ad-label">{label}</label>

      <div className="ad-field !px-4 !py-0">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={!canWrite}
          className="h-[46px] w-full bg-transparent text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-disabled)] disabled:cursor-not-allowed"
        />

        <button
          type="button"
          onClick={() => setShow((prev) => !prev)}
          aria-label={show ? "Hide" : "Show"}
          className="shrink-0 cursor-pointer text-[var(--text-disabled)] hover:text-[var(--text-secondary)]"
        >
          {show ? <Eye size={17} /> : <EyeOff size={17} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-[900px]">
      <h1 className="ad-title text-[26px] lg:text-[30px]">
        My Profile
      </h1>
      <p className="mt-1 text-[14px] text-[var(--text-muted)]">
        Manage your admin email and password.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="ad-card h-fit">
          <p className="text-[12px] uppercase tracking-wider text-[var(--text-disabled)]">
            Email
          </p>
          <p className="mt-1 break-all text-[15px] font-semibold text-[var(--neutral100)]">
            {admin?.email}
          </p>

          <p className="mt-5 text-[12px] uppercase tracking-wider text-[var(--text-disabled)]">
            Role
          </p>
          <p className="mt-1 text-[15px] font-semibold text-[var(--primary500)]">
            {roleLabels[admin?.role] || admin?.role}
          </p>

          <p className="mt-5 text-[12px] uppercase tracking-wider text-[var(--text-disabled)]">
            Permissions
          </p>
          <p className="mt-1 text-[14px] text-[var(--text-secondary)]">
            {admin?.role === "mother"
              ? "All pages"
              : admin?.role === "viewer"
                ? "All pages, read only"
                : admin?.permissions?.length
                  ? admin.permissions.join(", ")
                  : "None"}
          </p>
        </div>

        <div className="ad-card">
          {!canWrite && (
            <div className="mb-5 flex items-start gap-3 rounded-[14px] border border-[var(--primary500)]/20 bg-[var(--primary500)]/[0.07] p-4">
              <ShieldAlert size={18} className="mt-0.5 shrink-0 text-[var(--primary500)]" />
              <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
                A view only admin cannot change anything, not even its own
                profile. Ask a mother admin if you need a change.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="ad-label">Email address</label>

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={!canWrite}
                className="ad-input disabled:cursor-not-allowed"
              />
            </div>

            {passwordField(
              "Current password",
              currentPassword,
              setCurrentPassword,
              showCurrent,
              setShowCurrent,
              "Required for any change",
            )}

            {passwordField(
              "New password",
              newPassword,
              setNewPassword,
              showNew,
              setShowNew,
              "Leave empty to keep current",
            )}

            <button
              type="submit"
              disabled={saving || !canWrite}
              className="ad-btn ad-btn--primary w-full sm:w-auto"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Updating…
                </>
              ) : (
                <>
                  <Save size={16} />
                  Update Profile
                </>
              )}
            </button>
          </form>

          <p className="mt-5 text-[13px] text-[var(--text-muted)]">
            After changing your email or password you will be logged out and
            must sign in again.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Profile;
