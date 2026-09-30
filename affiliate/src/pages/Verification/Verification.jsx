import React, { useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, Car, Check, Clock3, IdCard, Info, Plane, ShieldCheck, TriangleAlert, Upload, X } from "lucide-react";

import { Loading } from "../../components/Panel/Panel";
import { Glass, Hero, Ring, Title } from "../../components/Panel/Pro";
import { HEROES, TONES } from "../../components/Panel/tones";
import FormAlert from "../../components/FormAlert/FormAlert";
import FormField from "../../components/FormField/FormField";
import { useLanguage } from "../../Context/LanguageProvider";
import OtpStep from "../../components/OtpStep/OtpStep";
import { useSelector } from "react-redux";
import { selectUser } from "../../features/auth/authSelectors";
import { authError, sendOtp } from "../../features/auth/authApi";
import { fetchVerification, submitVerification } from "../../features/verification/verificationApi";

const TONE = TONES.verify;

const DOC_TYPES = [
  { key: "nid", label: "docNid", Icon: IdCard },
  { key: "passport", label: "docPassport", Icon: Plane },
  { key: "driving", label: "docDriving", Icon: Car },
];

/**
 * অ্যাফিলিয়েটের পরিচয় যাচাই — "নিরাপত্তা", সবুজ রঙে।
 *
 * ব্যানারে তিন ধাপের পথ (জমা → যাচাই চলছে → সম্পন্ন), এখন কোন ধাপে
 * আছেন সেটা আলো করে দেখায়। কাগজের ধরন আইকনের টাইলে, ছবি তোলার ঘর
 * বড় ফাঁকা বাক্সে — বাছার পর প্রিভিউ, যাতে ভুল ছবি জমা না পড়ে।
 *
 * অ্যাফিলিয়েট ডিপোজিট করেন না — যাচাই শুধু টাকা তোলার আগে লাগে, আর
 * সেই সুইচটাও admin এর হাতে।
 */
const Verification = () => {
  const { t, tv } = useLanguage();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  const user = useSelector(selectUser);

  // OTP লাগলে কোডের ধাপ — সার্ভার না চাওয়া পর্যন্ত খোলা হয় না
  const [otpOpen, setOtpOpen] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState("");

  const [form, setForm] = useState({ fullName: "", dateOfBirth: "", documentType: "nid", documentNumber: "" });
  const [files, setFiles] = useState({ frontImage: null, backImage: null, selfieImage: null });

  useEffect(() => {
    let alive = true;
    fetchVerification()
      .then((next) => alive && setData(next))
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [reload]);

  const update = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  /**
   * কাগজপত্র পাঠানো। সার্ভার OTP চাইলে তখনই কোড পাঠানো হয়, আগেভাগে নয়;
   * কোড মিলে গেলে এই ফাংশনটাই আবার ডাকা হয়।
   */
  const send = async () => {
    try {
      setBusy(true);
      setError("");
      await submitVerification({ ...form, ...files });
      setOtpOpen(false);
      setReload((prev) => prev + 1);
    } catch (err) {
      if (err?.response?.data?.code === "otpNotVerified") {
        try {
          const sent = await sendOtp({ flow: "profileVerify", userId: user?.userId });
          setMaskedPhone(sent.maskedPhone || "");
          setOtpOpen(true);
          return;
        } catch (otpErr) {
          setError(authError(otpErr, t("somethingWrong"), t));
          return;
        }
      }
      setError(authError(err, t("somethingWrong"), t));
    } finally {
      setBusy(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    if (busy) return;
    send();
  };

  if (loading) return <Loading label={t("loading")} />;

  if (otpOpen) {
    return (
      <Glass tone={TONE} lined className="mx-auto w-full max-w-[560px] p-6">
        <Title tone={TONE} Icon={ShieldCheck} title={t("otpTitle")} />
        <OtpStep flow="profileVerify" userId={user?.userId} maskedPhone={maskedPhone} onVerified={send} />
      </Glass>
    );
  }

  const row = data?.verification;
  const status = row?.status;
  // ০ = জমা বাকি, ১ = যাচাই চলছে, ২ = সম্পন্ন
  const stage = status === "approved" ? 2 : status === "pending" ? 1 : 0;

  const steps = [
    { label: t("submitDeposit"), Icon: Upload },
    { label: t("verifyPendingTitle"), Icon: Clock3 },
    { label: t("verifyApprovedTitle"), Icon: BadgeCheck },
  ];

  const stepper = (
    <div className="flex w-full items-center lg:w-[420px]">
      {steps.map((step, i) => {
        const reached = i <= stage;
        const current = i === stage;
        return (
          <React.Fragment key={step.label}>
            <div className="flex w-[84px] shrink-0 flex-col items-center gap-2 text-center">
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-full ${current ? "rgb-edge" : ""}`}
                style={{
                  background: reached ? `color-mix(in srgb, ${TONE}, transparent ${current ? 78 : 86}%)` : "rgb(255 255 255 / 0.05)",
                  color: reached ? TONE : "var(--text-disabled)",
                  border: current ? "none" : `1px solid ${reached ? `color-mix(in srgb, ${TONE}, transparent 60%)` : "rgb(255 255 255 / 0.08)"}`,
                }}
              >
                {i < stage ? <Check size={20} /> : <step.Icon size={19} />}
              </span>
              <span className="text-[11.5px] leading-tight" style={{ color: reached ? "var(--text-primary)" : "var(--text-disabled)" }}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 ? (
              <span className="mb-6 h-[3px] flex-1 rounded-full" style={{ background: i < stage ? TONE : "rgb(255 255 255 / 0.08)" }} />
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );

  /* ── হয়ে গেছে বা চলছে ── */
  if (status === "approved" || status === "pending") {
    const done = status === "approved";
    const tone = done ? TONE : TONES.pending;
    return (
      <div className="flex flex-col gap-5">
        <Hero tone={TONE} heroBg={HEROES.verify} Icon={ShieldCheck} eyebrow={t("navDashboard")} title={t("verification")} subtitle={t("verifyIntro")} aside={stepper} />
        <Glass tone={tone} rgb={done} lined={!done} className="mx-auto w-full max-w-[640px] p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <Ring value={done ? 1 : 0.62} max={1} size={116} stroke={9} tone={tone}>
              {done ? <BadgeCheck size={42} style={{ color: tone }} /> : <Clock3 size={40} style={{ color: tone }} />}
            </Ring>
            <p className="text-[19px] font-black text-[var(--text-primary)]">{t(done ? "verifyApprovedTitle" : "verifyPendingTitle")}</p>
            <p className="max-w-[420px] text-[14px] leading-relaxed text-[var(--text-muted)]">{t(done ? "verifyApprovedText" : "verifyPendingText")}</p>
          </div>
        </Glass>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Hero tone={TONE} heroBg={HEROES.verify} Icon={ShieldCheck} eyebrow={t("navDashboard")} title={t("verification")} subtitle={t("verifyIntro")} aside={stepper} />

      {tv(data?.setting?.note) ? (
        <p className="flex items-start gap-2 rounded-[16px] border border-white/[0.06] bg-white/[0.03] p-4 text-[13px] text-[var(--text-muted)]">
          <Info size={15} className="mt-0.5 shrink-0" style={{ color: TONE }} />
          {tv(data.setting.note)}
        </p>
      ) : null}

      {status === "rejected" ? (
        <div
          className="flex items-start gap-3 rounded-[16px] px-4 py-3.5 text-[14px]"
          style={{ color: TONES.danger, background: `color-mix(in srgb, ${TONES.danger}, transparent 90%)`, border: `1px solid color-mix(in srgb, ${TONES.danger}, transparent 70%)` }}
        >
          <TriangleAlert size={17} className="mt-0.5 shrink-0" />
          {row?.reviewNote || t("verifyRejected")}
        </div>
      ) : null}

      <Glass tone={TONE} lined className="p-5 lg:p-6">
        <form noValidate className="flex flex-col gap-6" onSubmit={submit}>
          <FormAlert>{error}</FormAlert>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label={t("verifyFullName")}>
              <input value={form.fullName} onChange={update("fullName")} placeholder={t("verifyFullNameHint")} className="pro-input" style={{ "--tone": TONE }} />
            </FormField>
            <FormField label={t("verifyBirthDate")}>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={update("dateOfBirth")}
                max={new Date().toISOString().slice(0, 10)}
                className="pro-input"
                style={{ "--tone": TONE, colorScheme: "dark" }}
              />
            </FormField>
          </div>

          <FormField label={t("verifyDocType")}>
            <div className="grid grid-cols-3 gap-3">
              {DOC_TYPES.map((doc) => {
                const on = form.documentType === doc.key;
                return (
                  <button
                    key={doc.key}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, documentType: doc.key }))}
                    className="flex h-[84px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[16px] border text-[13px] transition"
                    style={{
                      borderColor: on ? `color-mix(in srgb, ${TONE}, transparent 40%)` : "rgb(255 255 255 / 0.08)",
                      background: on ? `color-mix(in srgb, ${TONE}, transparent 88%)` : "rgb(1 9 40 / 0.45)",
                      color: on ? TONE : "var(--text-secondary)",
                      fontWeight: on ? 700 : 500,
                      boxShadow: on ? `0 10px 24px -14px ${TONE}` : "none",
                    }}
                  >
                    <doc.Icon size={22} />
                    {t(doc.label)}
                  </button>
                );
              })}
            </div>
          </FormField>

          <FormField label={t("verifyDocNumber")}>
            <input value={form.documentNumber} onChange={update("documentNumber")} placeholder={t("verifyDocNumberHint")} className="pro-input" style={{ "--tone": TONE }} />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["frontImage", "verifyFront", true],
              ["backImage", "verifyBack", false],
              ["selfieImage", "verifySelfie", true],
            ].map(([key, labelKey, required]) => (
              <FilePick
                key={key}
                label={`${t(labelKey)}${required ? "" : ` (${t("optional")})`}`}
                file={files[key]}
                onPick={(file) => setFiles((prev) => ({ ...prev, [key]: file }))}
                clearLabel={t("close")}
                pickLabel={t("verifyUploadHint")}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={busy || !form.fullName.trim() || !files.frontImage || !files.selfieImage}
            className="pbtn pbtn--solid h-[50px] w-full text-[16px]"
            style={{ "--tone": TONE }}
          >
            <ShieldCheck size={18} />
            {busy ? t("loading") : t("submitDeposit")}
          </button>
        </form>
      </Glass>
    </div>
  );
};

/**
 * ছবি বাছার ঘর — বাছার পরে ছোট প্রিভিউ, যাতে ভুল ছবি জমা না পড়ে।
 * প্রিভিউর URL ফাইল ধরে বানানো; ফাইল বদলালে আগেরটা ছেড়ে দেওয়া হয়।
 */
const FilePick = ({ label, file, onPick, clearLabel, pickLabel }) => {
  const inputRef = useRef(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);

  useEffect(() => {
    if (!preview) return undefined;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  return (
    <FormField label={label}>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(event) => onPick(event.target.files?.[0] || null)} />

      {preview ? (
        <div className="relative overflow-hidden rounded-[16px] border" style={{ borderColor: `color-mix(in srgb, ${TONE}, transparent 55%)` }}>
          <img src={preview} alt="" className="h-[136px] w-full object-cover" draggable="false" />
          <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full" style={{ background: TONE, color: "#062b1f" }}>
            <Check size={14} />
          </span>
          <button
            type="button"
            onClick={() => onPick(null)}
            aria-label={clearLabel}
            className="absolute right-2 top-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="group flex h-[136px] w-full cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[16px] border-2 border-dashed border-white/[0.1] bg-[rgb(1_9_40_/_0.35)] text-[13px] text-[var(--text-muted)] transition hover:border-[color:var(--tone)] hover:text-[var(--text-secondary)]"
          style={{ "--tone": TONE }}
        >
          <span className="pro-badge h-11 w-11 rounded-full transition group-hover:scale-105" style={{ "--tone": TONE }}>
            <Upload size={18} />
          </span>
          {pickLabel}
        </button>
      )}
    </FormField>
  );
};

export default Verification;
