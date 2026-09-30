import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import {
  BadgeCheck,
  BanknoteArrowDown,
  Check,
  CircleCheckBig,
  Info,
  Lock,
  LockOpen,
  Nfc,
  ShieldAlert,
  Smartphone,
  TriangleAlert,
  Users,
} from "lucide-react";

import { Loading } from "../../components/Panel/Panel";
import { Badge, Glass, Ring, Title } from "../../components/Panel/Pro";
import { TONES } from "../../components/Panel/tones";
import { money } from "../../components/Panel/panelFormat";
import FormAlert from "../../components/FormAlert/FormAlert";
import FormField from "../../components/FormField/FormField";
import { useLanguage } from "../../Context/LanguageProvider";
import { selectUser } from "../../features/auth/authSelectors";
import { updateUser } from "../../features/auth/authSlice";
import { authError } from "../../features/auth/authApi";
import { fetchAffEligibility, fetchAffWithdrawMethods, fetchMe, submitAffWithdraw } from "../../features/affiliate/affiliateApi";
import { assetUrl } from "../../utils/assetUrl";
import { notify } from "../../utils/notify";

const TONE = TONES.withdraw;

/**
 * অ্যাফিলিয়েটের টাকা তোলা — "ওয়ালেট", অ্যাম্বার রঙে।
 *
 * উপরে ব্যাংক-কার্ডের মতো ব্যালেন্স (RGB বর্ডার), পাশে শর্তের রিং
 * (কতজন সক্রিয় খেলোয়াড় এনেছেন) আর তোলা যাবে কিনা। নিচে উপায়ের টাইল
 * আর admin এর ঠিক করা ঘরগুলো — ফর্মটা সার্ভারের বলা ঘর ধরেই তৈরি হয়,
 * নতুন উপায় যোগ করতে এই পাতা বদলাতে হয় না।
 *
 * কোন শর্তে আটকাচ্ছে সেটা পরিষ্কার করে বলা হয়; পরিচয় যাচাই না হলে ফর্ম
 * দেখানোই হয় না — শুধু কী করতে হবে।
 */
const Withdraw = () => {
  const { t, tv } = useLanguage();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);

  const [methods, setMethods] = useState([]);
  const [setting, setSetting] = useState({});
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(true);

  const [methodId, setMethodId] = useState("");
  const [amount, setAmount] = useState("");
  const [values, setValues] = useState({});

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;

    Promise.all([fetchAffWithdrawMethods(), fetchAffEligibility(), fetchMe()])
      .then(([methodData, elig, me]) => {
        if (!alive) return;
        setMethods(methodData.methods || []);
        setSetting(methodData.setting || {});
        setEligibility(elig);
        if (me) dispatch(updateUser(me));
        if (methodData.methods?.length) setMethodId((prev) => prev || methodData.methods[0].methodId);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [reload, dispatch]);

  const method = methods.find((item) => item.methodId === methodId);

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;

    if (!methodId || Number(amount) <= 0) {
      setError(t("errMissingFields"));
      return;
    }

    try {
      setBusy(true);
      setError("");
      await submitAffWithdraw({ methodId, amount: Number(amount), fields: values });
      setDone(true);
      notify.success(t("withdrawDone"));
      setAmount("");
      setValues({});
      const me = await fetchMe();
      if (me) dispatch(updateUser(me));
    } catch (err) {
      setError(authError(err, t("somethingWrong"), t));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading label={t("loading")} />;

  /* ── জমা হয়ে গেছে ── */
  if (done) {
    return (
      <Glass tone={TONES.success} rgb className="mx-auto w-full max-w-[560px] p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <Ring value={1} max={1} size={110} stroke={9} tone={TONES.success}>
            <Check size={40} style={{ color: TONES.success }} />
          </Ring>
          <p className="text-[19px] font-black text-[var(--text-primary)]">{t("withdrawDone")}</p>
          <p className="max-w-[380px] text-[14px] leading-relaxed text-[var(--text-muted)]">{t("withdrawDoneText")}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setDone(false);
                setReload((prev) => prev + 1);
              }}
              className="pbtn pbtn--solid"
              style={{ "--tone": TONE }}
            >
              {t("back")}
            </button>
            <Link to="/dashboard/withdraw-history" className="pbtn pbtn--soft" style={{ "--tone": TONES.history }}>
              {t("navWithdrawHistory")}
            </Link>
          </div>
        </div>
      </Glass>
    );
  }

  /* ── পরিচয় যাচাই বাকি ── */
  if (eligibility?.reason === "verification") {
    const waiting = eligibility.verificationStatus === "pending";
    return (
      <Glass tone={TONES.pending} lined className="mx-auto w-full max-w-[620px] p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="pro-badge h-20 w-20 rounded-full" style={{ "--tone": TONES.pending }}>
            {waiting ? <BadgeCheck size={36} /> : <ShieldAlert size={36} />}
          </span>
          <p className="text-[18px] font-black text-[var(--text-primary)]">{t(waiting ? "verifyPendingTitle" : "withdrawNeedVerifyTitle")}</p>
          <p className="max-w-[440px] text-[14px] leading-relaxed text-[var(--text-muted)]">{t(waiting ? "verifyPendingText" : "withdrawNeedVerifyText")}</p>
          {waiting ? null : (
            <Link to="/dashboard/verification" className="pbtn pbtn--solid mt-2 w-full max-w-[320px]" style={{ "--tone": TONES.verify }}>
              <BadgeCheck size={16} />
              {t("goToVerification")}
            </Link>
          )}
        </div>
      </Glass>
    );
  }

  /** কোন শর্তে আটকাচ্ছে, আর কী করলে খুলবে */
  const blockText = () => {
    if (!eligibility || eligibility.eligible) return "";
    const map = {
      referrals: `${t("blockReferrals")} ${eligibility.remainingReferrals} ${t("blockReferralsTail")}`,
      unsettled: `${t("blockUnsettled")} ${money(eligibility.unsettled)}`,
      pending: t("blockPending"),
      noBalance: t("blockNoBalance"),
    };
    return map[eligibility.reason] || t("blockGeneric");
  };

  const blocked = eligibility && !eligibility.eligible;
  const active = eligibility?.activeReferrals ?? 0;
  const required = eligibility?.requiredActiveReferrals ?? 0;
  const referralsDone = active >= required;
  const tooLow = method && amount && Number(amount) < Number(method.minimumWithdrawAmount);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        {/* ── ব্যাংক-কার্ডের মতো ব্যালেন্স ── */}
        <div className="pro-wallet rgb-edge rgb-glow min-h-[220px] p-6 lg:p-7" style={{ "--rgb-width": "2px" }}>
          <span aria-hidden="true" className="pro-wallet__ring" />
          <div className="relative flex h-full flex-col justify-between gap-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[12px] font-semibold text-white/60">{t("availableBalance")}</p>
                <p className="mt-1 text-[38px] font-black leading-none text-white lg:text-[46px]" style={{ textShadow: `0 0 30px color-mix(in srgb, ${TONE}, transparent 60%)` }}>
                  {money(user?.balance)}
                </p>
              </div>
              <span className="flex h-11 w-14 items-center justify-center rounded-[10px]" style={{ background: "linear-gradient(135deg,#f7d774,#b8862b)" }}>
                <Nfc size={22} className="text-[#3a2600]" />
              </span>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] text-white/50">{t("username")}</p>
                <p className="text-[17px] font-bold tracking-[0.08em] text-white">{user?.userId}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-white/50">{t("myReferralLink")}</p>
                <p className="text-[17px] font-black tracking-[0.2em]" style={{ color: TONE }}>
                  {user?.referralCode}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── শর্তের রিং আর তোলা যাবে কিনা ── */}
        <Glass tone={referralsDone ? TONES.success : TONES.pending} lined className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <Ring value={active} max={Math.max(required, 1)} size={128} tone={referralsDone ? TONES.success : TONES.pending}>
            <Users size={18} className="text-[var(--text-muted)]" />
            <p className="text-[22px] font-black leading-tight text-[var(--text-primary)]">
              {active}
              <span className="text-[14px] text-[var(--text-muted)]"> / {required}</span>
            </p>
          </Ring>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-[var(--text-primary)]">{t("activePlayersBrought")}</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--text-muted)]">{t("activePlayersText")}</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[12px] text-[var(--text-muted)]">{t("withdrawStatus")}</span>
              <Badge tone={blocked ? TONES.danger : TONES.success}>
                {blocked ? <Lock size={11} /> : <LockOpen size={11} />}
                {t(blocked ? "withdrawClosed" : "withdrawOpen")}
              </Badge>
            </div>
          </div>
        </Glass>
      </div>

      {blocked ? (
        <div
          className="flex items-start gap-3 rounded-[16px] px-4 py-3.5 text-[14px]"
          style={{ color: TONES.pending, background: `color-mix(in srgb, ${TONES.pending}, transparent 90%)`, border: `1px solid color-mix(in srgb, ${TONES.pending}, transparent 70%)` }}
        >
          <TriangleAlert size={17} className="mt-0.5 shrink-0" />
          {blockText()}
        </div>
      ) : null}

      <Glass tone={TONE} lined className="p-5 lg:p-6">
        <Title tone={TONE} Icon={BanknoteArrowDown} title={t("navWithdraw")} subtitle={t("affWithdrawText")} />

        {tv(setting.note) ? (
          <p className="mb-5 flex items-start gap-2 rounded-[12px] bg-white/[0.03] p-3 text-[13px] text-[var(--text-muted)]">
            <Info size={15} className="mt-0.5 shrink-0" style={{ color: TONE }} />
            {tv(setting.note)}
          </p>
        ) : null}

        <form className="flex flex-col gap-5" onSubmit={submit}>
          <FormAlert>{error}</FormAlert>

          <FormField label={t("selectWithdrawMethod")}>
            {methods.length === 0 ? (
              <p className="text-[13px] text-[var(--text-disabled)]">{t("noWithdrawMethod")}</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {methods.map((item) => {
                  const on = methodId === item.methodId;
                  return (
                    <button
                      key={item.methodId}
                      type="button"
                      onClick={() => {
                        setMethodId(item.methodId);
                        setValues({});
                      }}
                      className={`relative flex h-[76px] cursor-pointer items-center gap-3 rounded-[16px] border px-3.5 text-left transition ${on ? "rgb-edge" : ""}`}
                      style={{
                        borderColor: on ? "transparent" : "rgb(255 255 255 / 0.08)",
                        background: on ? `color-mix(in srgb, ${TONE}, transparent 88%)` : "rgb(1 9 40 / 0.45)",
                      }}
                    >
                      {item.logoUrl ? (
                        <img src={assetUrl(item.logoUrl)} alt="" className="h-10 w-10 shrink-0 rounded-[10px] bg-white object-contain p-1" draggable="false" />
                      ) : (
                        <span className="pro-badge h-10 w-10 rounded-[10px]" style={{ "--tone": TONE }}>
                          <Smartphone size={18} />
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-bold text-[var(--text-primary)]">{tv(item.name)}</span>
                        <span className="block truncate text-[11px] text-[var(--text-muted)]">
                          {money(item.minimumWithdrawAmount)} – {money(item.maximumWithdrawAmount)}
                        </span>
                      </span>
                      {on ? <CircleCheckBig size={16} className="absolute right-2.5 top-2.5" style={{ color: TONE }} /> : null}
                    </button>
                  );
                })}
              </div>
            )}
          </FormField>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* admin এর ঠিক করা ঘরগুলো */}
            {(method?.fields || []).map((field) => (
              <FormField key={field.key} label={`${tv(field.label)}${field.required ? "" : ` (${t("optional")})`}`}>
                <input
                  type={field.type === "number" ? "number" : field.type}
                  value={values[field.key] || ""}
                  onChange={(event) => setValues((prev) => ({ ...prev, [field.key]: event.target.value }))}
                  placeholder={tv(field.placeholder)}
                  className="pro-input"
                  style={{ "--tone": TONE }}
                />
              </FormField>
            ))}

            <FormField label={t("withdrawAmount")} error={tooLow ? `${t("minMax")}: ${method.minimumWithdrawAmount} — ${method.maximumWithdrawAmount}` : ""}>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[16px] font-black" style={{ color: TONE }}>
                  ৳
                </span>
                <input
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder={t("amountPlaceholder")}
                  className="pro-input text-[17px] font-bold"
                  style={{ "--tone": TONE, paddingInlineStart: 36 }}
                />
              </div>
            </FormField>
          </div>

          <button
            type="submit"
            disabled={busy || blocked || methods.length === 0}
            className="pbtn pbtn--solid h-[50px] w-full text-[16px]"
            style={{ "--tone": TONE }}
          >
            <BanknoteArrowDown size={18} />
            {busy ? t("loading") : t("withdrawNow")}
          </button>
        </form>
      </Glass>
    </div>
  );
};

export default Withdraw;
