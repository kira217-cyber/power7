import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router";
import { toast } from "react-toastify";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { api } from "../../api/axios";
import { setCredentials } from "../../features/auth/authSlice";
import { selectIsAuth } from "../../features/auth/authSelectors";

/** ডেমো অ্যাকাউন্ট আছে কিনা জানায়; না থাকলে বাক্সটাই দেখানো হয় না */
const fetchDemo = async () => {
  const { data } = await api.get("/api/admin/demo-credentials");
  return data?.data?.demo || null;
};

/** অ্যাডমিন লগইন — ক্লায়েন্ট সাইটের ডার্ক + গোল্ড চেহারায় */
const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const isAuth = useSelector(selectIsAuth);
  const from = location.state?.from?.pathname || "/";

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [demo, setDemo] = useState(null);

  useEffect(() => {
    if (isAuth) {
      navigate(from, { replace: true });
    }
  }, [isAuth, navigate, from]);

  useEffect(() => {
    let alive = true;

    fetchDemo()
      .then((next) => alive && setDemo(next))
      .catch(() => alive && setDemo(null));

    return () => {
      alive = false;
    };
  }, []);

  const update = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const copyValue = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.email.trim() || !form.password) {
      toast.error("Email and password are required");
      return;
    }

    try {
      setSubmitting(true);

      const { data } = await api.post("/api/admin/login", {
        email: form.email.trim(),
        password: form.password,
      });

      const token = data?.data?.token;
      const admin = data?.data?.admin;

      if (!token || !admin?.email) {
        toast.error("Login response invalid");
        return;
      }

      dispatch(setCredentials({ admin, token }));
      toast.success("Login successful");
      navigate(from, { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--neutral1000)] text-[var(--neutral100)]">
      {/* ── পেছনের সোনালি আভা ── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(249,185,1,0.20), transparent 34%), radial-gradient(circle at bottom right, rgba(227,134,20,0.16), transparent 38%)",
        }}
      />

      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-[var(--primary500)]/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-16 h-80 w-80 rounded-full bg-[var(--primary600)]/15 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-[var(--primary500)]/12 blur-3xl" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="login-rise w-full max-w-[460px]">
          {/* ── লোগো ও শিরোনাম ── */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-20 w-[190px] items-center justify-center rounded-3xl border border-[var(--primary500)]/30 bg-white/10 shadow-[0_0_45px_rgba(173,0,255,0.3)] backdrop-blur">
              <img
                src={`${import.meta.env.BASE_URL}assets/brand/logo.png`}
                alt="POWER7"
                className="h-12 w-auto object-contain"
                draggable="false"
              />
            </div>

            <h1 className="ad-title text-3xl md:text-4xl">
              Admin
            </h1>

            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Secure access to your control panel
            </p>
          </div>

          <div className="rounded-[32px] border border-[var(--primary500)]/20 bg-white/[0.06] p-6 shadow-2xl shadow-black/50 backdrop-blur-xl md:p-8">
            {/* ── ডেমো অ্যাকাউন্ট — viewer অ্যাকাউন্ট থাকলে তবেই ── */}
            {demo && (
              <div className="mb-6 rounded-2xl border-2 border-[var(--status-danger)] bg-black/40 px-4 py-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="text-sm font-black text-[var(--primary500)]">
                    DEMO E-Mail :
                  </span>

                  <span className="text-sm text-[var(--text-secondary)]">
                    {demo.email}
                  </span>

                  <button
                    type="button"
                    onClick={() => copyValue(demo.email, "Email")}
                    className="login-copy"
                  >
                    Copy
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="text-sm font-black text-[var(--primary500)]">
                    DEMO Password :
                  </span>

                  <span className="text-sm text-[var(--text-secondary)]">
                    {demo.password}
                  </span>

                  <button
                    type="button"
                    onClick={() => copyValue(demo.password, "Password")}
                    className="login-copy"
                  >
                    Copy
                  </button>
                </div>

                <p className="mt-3 text-[12px] text-[var(--text-disabled)]">
                  This account is view only — nothing can be changed.
                </p>
              </div>
            )}

            {/* ── ফর্ম ── */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  className="mb-2 block text-sm font-semibold text-[var(--text-primary)]"
                  htmlFor="admin-email"
                >
                  Email Address
                </label>

                <div className="ad-field">
                  <Mail className="h-5 w-5 shrink-0 text-[var(--primary500)]" />

                  <input
                    id="admin-email"
                    type="email"
                    autoComplete="username"
                    value={form.email}
                    onChange={update("email")}
                    placeholder="admin@power7.live"
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[var(--text-disabled)]"
                  />
                </div>
              </div>

              <div>
                <label
                  className="mb-2 block text-sm font-semibold text-[var(--text-primary)]"
                  htmlFor="admin-password"
                >
                  Password
                </label>

                <div className="ad-field">
                  <Lock className="h-5 w-5 shrink-0 text-[var(--primary500)]" />

                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={form.password}
                    onChange={update("password")}
                    placeholder="Enter password"
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[var(--text-disabled)]"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="shrink-0 cursor-pointer text-[var(--text-secondary)] transition hover:text-white"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="ad-btn ad-btn--primary h-[50px] w-full text-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-5 w-5" />
                    Login to Admin Panel
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="mt-5 text-center text-xs text-[var(--text-disabled)]">
            Admin Secure Control System
          </p>

          <p className="mt-1 text-center text-xs font-bold text-[var(--status-success)]">
            Development by Oracle technology LLC API Provider Oracle API
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
