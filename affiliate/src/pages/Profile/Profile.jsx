import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  AtSign,
  BadgeCheck,
  CalendarDays,
  CircleDollarSign,
  Copy,
  Info,
  Link2,
  Phone,
  ShieldCheck,
  User,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

import { Loading } from "../../components/Panel/Panel";
import { Badge, Glass, Title } from "../../components/Panel/Pro";
import { TONES } from "../../components/Panel/tones";
import { money, referralLink, when } from "../../components/Panel/panelFormat";
import { useLanguage } from "../../Context/LanguageProvider";
import { selectUser } from "../../features/auth/authSelectors";
import { updateUser } from "../../features/auth/authSlice";
import { fetchMe } from "../../features/affiliate/affiliateApi";
import { notify } from "../../utils/notify";

const TONE = TONES.profile;

/**
 * অ্যাফিলিয়েটের নিজের তথ্য — "পরিচয়পত্র", গোলাপি রঙে।
 *
 * উপরে কভার ব্যানার, বড় অবতার আর নাম; তথ্যগুলো আইকনের টাইলে; রেফারেল
 * লিংক RGB বর্ডারের কার্ডে — QR আর কপি পাশাপাশি।
 *
 * পাতা খোলার সময় সার্ভার থেকে তাজা তথ্য আনা হয় — localStorage এর
 * কপিটা পুরোনো হতে পারে।
 */
const Profile = () => {
  const { t } = useLanguage();
  const dispatch = useDispatch();
  const saved = useSelector(selectUser);

  const [user, setUser] = useState(saved);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchMe()
      .then((next) => {
        if (!alive || !next) return;
        setUser(next);
        dispatch(updateUser(next));
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [dispatch]);

  if (loading && !user) return <Loading label={t("loading")} />;
  if (!user) return <Glass className="p-5">{t("somethingWrong")}</Glass>;

  const link = referralLink(user.referralCode);
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      notify.success(t("copied"));
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ক্লিপবোর্ড বন্ধ থাকলে লিংকটা পর্দাতেই দেখা যাচ্ছে
    }
  };

  const info = [
    { label: t("username"), value: user.userId, Icon: User, tone: TONE },
    { label: t("fullName"), value: fullName || "—", Icon: UserRound, tone: TONES.commission },
    { label: t("phoneNumber"), value: `${user.countryCode} ${user.phone}`, Icon: Phone, tone: TONES.users },
    { label: t("email"), value: user.email || "—", Icon: AtSign, tone: TONES.history },
    { label: t("currency"), value: user.currency, Icon: CircleDollarSign, tone: TONES.withdraw },
    { label: t("joined"), value: when(user.createdAt), Icon: CalendarDays, tone: TONES.verify },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* ── কভার আর অবতার ── */}
      <section className="pro-card overflow-hidden" style={{ "--tone": TONE }}>
        <div
          className="relative h-[120px] lg:h-[150px]"
          style={{
            background: `radial-gradient(80% 140% at 85% 0%, color-mix(in srgb, ${TONE}, transparent 45%), transparent 60%), radial-gradient(70% 120% at 10% 100%, color-mix(in srgb, var(--accent), transparent 40%), transparent 60%), linear-gradient(120deg, var(--aff-profile-hero, #1b0d3f), #2a0f45)`,
          }}
        >
          <span
            aria-hidden="true"
            className="absolute inset-0"
            style={{ backgroundImage: "radial-gradient(rgb(255 255 255 / 0.09) 1px, transparent 1px)", backgroundSize: "18px 18px" }}
          />
        </div>

        <div className="relative flex flex-col gap-4 px-5 pb-5 lg:flex-row lg:items-end lg:justify-between lg:px-7">
          <div className="-mt-12 flex items-end gap-4">
            <span className="rgb-edge rgb-glow flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-[var(--neutral900)] p-1.5" style={{ "--rgb-width": "3px" }}>
              <span className="pro-badge h-full w-full rounded-full text-[36px] font-black" style={{ "--tone": TONE }}>
                {String(user.userId || "?").slice(0, 1).toUpperCase()}
              </span>
            </span>
            <div className="min-w-0 pb-1">
              <h1 className="flex items-center gap-2 truncate text-[22px] font-black text-[var(--text-primary)] lg:text-[26px]">
                {user.userId}
                {user.verificationStatus === "approved" ? <BadgeCheck size={20} className="shrink-0 text-[var(--status-success)]" /> : null}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge tone={TONE} dot={false}>
                  <ShieldCheck size={11} />
                  {t("affiliateRole")}
                </Badge>
                <Badge tone={user.isActive ? TONES.success : TONES.danger}>{t(user.isActive ? "statusActive" : "statusInactive")}</Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:w-[380px]">
            <div className="rounded-[14px] border border-white/[0.07] bg-[rgb(1_9_40_/_0.45)] p-3">
              <p className="flex items-center gap-1.5 text-[11.5px] text-[var(--text-muted)]">
                <Wallet size={13} style={{ color: TONES.dashboard }} />
                {t("mainBalance")}
              </p>
              <p className="mt-1 text-[20px] font-black" style={{ color: TONES.dashboard }}>
                {money(user.balance)}
              </p>
            </div>
            <div className="rounded-[14px] border border-white/[0.07] bg-[rgb(1_9_40_/_0.45)] p-3">
              <p className="flex items-center gap-1.5 text-[11.5px] text-[var(--text-muted)]">
                <Users size={13} style={{ color: TONES.users }} />
                {t("statTotalPlayers")}
              </p>
              <p className="mt-1 text-[20px] font-black text-[var(--text-primary)]">{user.referralCount || 0}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        {/* ── তথ্যের টাইল ── */}
        <Glass tone={TONE} lined className="p-5">
          <Title tone={TONE} Icon={UserRound} title={t("myInfo")} subtitle={t("myInfoText")} />
          <div className="grid gap-3 sm:grid-cols-2">
            {info.map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-[14px] border border-white/[0.05] bg-[rgb(1_9_40_/_0.45)] p-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]"
                  style={{ background: `color-mix(in srgb, ${item.tone}, transparent 86%)`, color: item.tone }}
                >
                  <item.Icon size={17} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11.5px] text-[var(--text-muted)]">{item.label}</p>
                  <p className="truncate text-[14px] font-semibold text-[var(--text-primary)]">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </Glass>

        {/* ── রেফারেল লিংক — RGB বর্ডার ── */}
        <Glass tone={TONE} rgb glow className="p-5" style={{ background: "rgb(8 4 26 / 0.92)" }}>
          <Title tone={TONE} Icon={Link2} title={t("myReferralLink")} subtitle={t("myReferralLinkText")} />
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <span className="flex h-[132px] w-[132px] shrink-0 items-center justify-center rounded-[14px] bg-white p-2 shadow-[0_10px_30px_-12px_rgb(244_114_182_/_0.6)]">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(link)}`}
                alt={user.referralCode}
                className="h-full w-full object-contain"
                draggable="false"
              />
            </span>
            <div className="w-full min-w-0">
              <p className="text-center text-[26px] font-black tracking-[0.2em] sm:text-left" style={{ color: TONE }}>
                {user.referralCode}
              </p>
              <p className="mt-2 break-all rounded-[10px] border border-white/[0.06] bg-white/[0.04] p-2.5 text-[11.5px] text-[var(--text-secondary)]">{link}</p>
              <button type="button" onClick={copy} className="pbtn pbtn--solid mt-3 w-full" style={{ "--tone": TONE }}>
                <Copy size={15} />
                {copied ? t("copied") : t("copyLink")}
              </button>
            </div>
          </div>
        </Glass>
      </div>

      <Glass tone={TONE} className="flex items-start gap-3 p-4">
        <Info size={16} className="mt-0.5 shrink-0" style={{ color: TONE }} />
        <p className="text-[13px] text-[var(--text-muted)]">{t("profileChangeNote")}</p>
      </Glass>
    </div>
  );
};

export default Profile;
