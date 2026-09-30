import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";

import Icon from "../Icon/Icon";
import api from "../../api/axios";
import { useLanguage } from "../../Context/LanguageProvider";
import { m } from "../../hook/useUnits";
import { notify } from "../../utils/notify";
import MemberShell from "./MemberShell";

/**
 * অভিযোগ / পরামর্শ — মূল সাইটে এটা **শুধু মোবাইলে** আছে (`/m/feedback`),
 * ডেস্কটপ মডালে এর ট্যাব নেই।
 *
 * গঠন: ধূসর ড্রপডাউন সারি (ডানে নীল বর্গে তীর) — চাপলে নিচ থেকে ধরনের
 * তালিকা (আমানত / উত্তোলন / খেলা / গ্রাহক সেবা / এজেন্ট আবেদন / অন্যান্য);
 * বড় ধূসর টেক্সট এরিয়া (ডান-নিচে ০/৫০০); ড্যাশ করা আপলোড বাক্স; বাঁয়ে
 * যাচাই কোড, ডানে ক্যাপচার ছবি (server এর, চাপলে নতুন); শেষে "জমা দিন"
 * (সব পূরণ না হলে ধূসর)। admin উত্তর দিলে সেটা ইনবক্সে আসে।
 */
const MAX = 500;
const TYPES = ["deposit", "withdraw", "game", "service", "agent", "other"];

const FeedbackSection = () => {
  const { t } = useLanguage();
  const page = t.memberPage.pages.feedback;
  const fb = t.feedbackFlow;
  const navigate = useNavigate();

  const [type, setType] = useState("");
  const [picker, setPicker] = useState(false);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [captcha, setCaptcha] = useState({ captchaId: "", image: "" });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const loadCaptcha = useCallback(async () => {
    try {
      const { data } = await api.get("/api/user/captcha");
      setCaptcha(data?.data || { captchaId: "", image: "" });
      setCode("");
    } catch {
      /* পরে আবার চাপলে আসবে */
    }
  }, []);

  useEffect(() => {
    loadCaptcha();
  }, [loadCaptcha]);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const pick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) {
      notify.warning(fb.tooBig);
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const ready = type && text.trim().length >= 5 && code.length >= 4 && !busy;

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    const done = notify.pending(t.auth.wait);
    try {
      const body = new FormData();
      body.append("type", type);
      body.append("content", text.trim());
      body.append("captchaId", captcha.captchaId);
      body.append("captcha", code);
      if (file) body.append("image", file);
      await api.post("/api/feedback", body);
      done();
      notify.success(fb.sent, fb.sentHint);
      navigate("/member", { replace: true });
    } catch (error) {
      done();
      const c = error?.response?.data?.code;
      notify.error(fb.err[c] || error?.response?.data?.message || t.authErr.generic);
      loadCaptcha();
    } finally {
      setBusy(false);
    }
  };

  return (
    <MemberShell title={page.title}>
      <div style={{ padding: `${m(30)} ${m(30)} ${m(60)}`, background: "var(--member-surface, #fff)" }}>
        {/* সমস্যার ধরন */}
        <button type="button" onClick={() => setPicker(true)} className="flex w-full cursor-pointer text-left" style={{ height: m(120), marginBottom: m(26) }}>
          <span className="flex flex-1 items-center" style={{ background: "#f2f2f4", borderRadius: `${m(12)} 0 0 ${m(12)}`, padding: `0 ${m(26)}`, color: type ? "var(--member-title, #333)" : "#8b8b93", fontSize: m(28) }}>
            {type ? fb.types[type] : page.type}
          </span>
          <span className="grid place-items-center" style={{ width: m(140), background: "#2f80ed", borderRadius: `0 ${m(12)} ${m(12)} 0`, color: "#fff" }}>
            <Icon name="arrow-down" size={m(44)} />
          </span>
        </button>

        {/* বিষয়বস্তু */}
        <div className="relative" style={{ background: "#f2f2f4", borderRadius: m(12), padding: m(26), marginBottom: m(26) }}>
          <div style={{ color: "var(--member-title, #333)", fontSize: m(30), fontWeight: 600 }}>{page.subject}</div>
          <textarea
            value={text}
            maxLength={MAX}
            onChange={(e) => setText(e.target.value)}
            placeholder={page.placeholder}
            style={{ width: "100%", height: m(300), marginTop: m(16), background: "transparent", border: "none", outline: "none", resize: "none", fontSize: m(26), color: "var(--member-title, #333)" }}
          />
          <span className="absolute" style={{ right: m(26), bottom: m(20), color: "#8b8b93", fontSize: m(30) }}>
            ( {text.length} / {MAX} )
          </span>
        </div>

        {/* আপলোড */}
        <label className="relative flex cursor-pointer flex-col items-center justify-center overflow-hidden" style={{ height: m(300), border: `${m(2)} dashed #cfcfd6`, borderRadius: m(12), color: "#b4b4bc", gap: m(20), marginBottom: m(26) }}>
          {preview ? (
            <>
              <img src={preview} alt="" style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
              <button
                type="button"
                aria-label={fb.removeImage}
                onClick={(e) => {
                  e.preventDefault();
                  setFile(null);
                  setPreview("");
                }}
                className="absolute grid place-items-center"
                style={{ right: m(14), top: m(14), width: m(48), height: m(48), borderRadius: "50%", background: "rgb(0 0 0 / .55)", color: "#fff", fontSize: m(30) }}
              >
                ×
              </button>
            </>
          ) : (
            <>
              <span style={{ fontSize: m(90), lineHeight: 1 }}>🖼</span>
              <span style={{ fontSize: m(28) }}>{page.upload}</span>
            </>
          )}
          <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pick} />
        </label>

        {/* যাচাই কোড */}
        <div className="flex" style={{ gap: m(20), marginBottom: m(50) }}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
            inputMode="numeric"
            placeholder={page.captcha}
            style={{ flex: 1, minWidth: 0, height: m(110), background: "#f2f2f4", border: "none", outline: "none", borderRadius: m(12), padding: `0 ${m(26)}`, fontSize: m(28), color: "var(--member-title, #333)" }}
          />
          <button type="button" onClick={loadCaptcha} aria-label={fb.newCaptcha} className="shrink-0 cursor-pointer overflow-hidden" style={{ width: m(310), height: m(110), borderRadius: m(12), background: "#eef3ea" }}>
            {captcha.image ? <img src={captcha.image} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : null}
          </button>
        </div>

        <button type="button" disabled={!ready} onClick={submit} className="w-full" style={{ height: m(110), borderRadius: m(12), background: ready ? "#2f80ed" : "#e2e2e8", color: "#fff", fontSize: m(34) }}>
          {page.submit}
        </button>
      </div>

      {/* নিচ থেকে ধরনের তালিকা — মূল সাইটের van-picker এর মতো */}
      {picker && (
        <div className="fixed inset-0 flex items-end" style={{ zIndex: 90, background: "rgb(0 0 0 / .45)" }} onClick={() => setPicker(false)}>
          <div className="w-full" style={{ background: "var(--member-surface, #fff)", borderRadius: `${m(24)} ${m(24)} 0 0`, paddingBottom: m(30) }} onClick={(e) => e.stopPropagation()}>
            <div className="text-center" style={{ padding: m(28), fontSize: m(30), color: "var(--member-title, #333)", borderBottom: "1px solid var(--member-line, #eee)" }}>
              {page.type.replace(/^\*\s*/, "")}
            </div>
            {TYPES.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setType(key);
                  setPicker(false);
                }}
                className="block w-full cursor-pointer text-center"
                style={{ padding: `${m(26)} 0`, fontSize: m(32), color: key === type ? "#2f80ed" : "var(--member-title, #333)", fontWeight: key === type ? 700 : 400 }}
              >
                {fb.types[key]}
              </button>
            ))}
          </div>
        </div>
      )}
    </MemberShell>
  );
};

export default FeedbackSection;
