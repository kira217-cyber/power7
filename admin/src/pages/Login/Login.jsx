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
  Sparkles,
} from "lucide-react";

import { api } from "../../api/axios";
import { setCredentials } from "../../features/auth/authSlice";
import { selectIsAuth } from "../../features/auth/authSelectors";

/**
 * যে একটাই যোগাযোগ এই পেজে দেখানো হয় — নাম, নম্বর আর লিংক এক জায়গায়
 * রাখা, যাতে কোনোদিন একটা বদলে অন্যটা পুরোনো থেকে না যায়।
 */
const SUPPORT = {
  name: "Abir Hassan Durjoy",
  phone: "+447473953402",
  notice:
    "প্রতারক থেকে সাবধান! এই ধরনের বেটিং সাইট তৈরি করে নিতে একমাত্র ওরাকল " +
    "টেকনোলজী — আবির হাসান দুর্জয় এর সাথে যোগাযোগ করবেন, শুধুমাত্র এখানে " +
    "দেওয়া হোয়াটসঅ্যাপ নাম্বারে।",
};

/** wa.me শুধু সংখ্যা নেয় — প্লাস, স্পেস বা ড্যাশ নয়। */
const whatsappUrl = (phone) => `https://wa.me/${phone.replace(/\D/g, "")}`;

const WhatsAppIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35Z" />
    <path d="M12.04 2C6.6 2 2.18 6.42 2.18 11.86c0 1.74.46 3.44 1.32 4.94L2.1 22l5.34-1.39a9.83 9.83 0 0 0 4.6 1.16h.01c5.43 0 9.85-4.42 9.85-9.86A9.79 9.79 0 0 0 19 4.88 9.78 9.78 0 0 0 12.04 2Zm0 17.94h-.01a8.2 8.2 0 0 1-4.16-1.14l-.3-.18-3.09.81.83-3.01-.2-.31a8.13 8.13 0 0 1-1.25-4.35c0-4.52 3.68-8.2 8.19-8.2a8.14 8.14 0 0 1 5.79 2.4 8.13 8.13 0 0 1 2.4 5.8c0 4.52-3.68 8.19-8.2 8.19Z" />
  </svg>
);

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
            {/* ── প্রতারণা সতর্কতা ও একমাত্র নম্বর ──
                কার্ড আর নম্বরের বার — দুটোই ঘূর্ণায়মান রঙিন ফ্রেমে, যাতে
                পেজের সবচেয়ে চোখে পড়া জিনিস এটাই থাকে */}
            <div className="relative mb-6">
              <div
                className="rgb-frame rgb-glow pointer-events-none absolute -inset-[3px] rounded-[22px]"
                aria-hidden="true"
              />

              <div className="rgb-frame relative rounded-[22px] p-0.5">
                <div className="rounded-[20px] bg-[#080807] p-4">
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary500)]" />

                    <p className="text-[13px] font-semibold leading-relaxed text-[var(--primary300)]">
                      {SUPPORT.notice}
                    </p>
                  </div>

                  <a
                    href={whatsappUrl(SUPPORT.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`WhatsApp ${SUPPORT.name} — ${SUPPORT.phone}`}
                    className="rgb-frame group mt-4 block rounded-[14px] p-0.5 transition hover:scale-[1.01]"
                  >
                    {/* ফোনে উপর-নিচে: পাশাপাশি রাখলে নামটা তিন লাইনে ভেঙে
                        নম্বরের জায়গা খেয়ে ফেলে।
                        flex-auto + flex-wrap — দুটো একসাথে না আঁটলে নম্বর নিজে
                        পরের লাইনে নামে, কখনো কেটে যায় না */}
                    <div className="flex flex-col items-stretch overflow-hidden rounded-xl sm:flex-row sm:flex-wrap">
                      <span className="flex flex-auto items-center justify-center gap-2 whitespace-nowrap bg-[#16a34a] px-2.5 py-2.5 text-[13px] font-black text-white sm:justify-start">
                        <WhatsAppIcon className="h-4 w-4 shrink-0" />
                        {SUPPORT.name}
                      </span>

                      <span className="flex flex-auto items-center justify-center whitespace-nowrap bg-[var(--primary500)] px-2.5 py-2.5 text-center text-[15px] font-black text-[var(--neutral1000)] group-hover:bg-[var(--primary400)] sm:text-[17px]">
                        {SUPPORT.phone}
                      </span>
                    </div>
                  </a>
                </div>
              </div>
            </div>

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
