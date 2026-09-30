import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Download, Loader2, Save, Smartphone, Trash2, UploadCloud } from "lucide-react";

import { api } from "../../api/axios";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import { Field, Loading, PageHead } from "./bits";
import { errorOf, imageUrl } from "./helpers";

const sizeText = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`);

/**
 * অ্যাপ ডাউনলোড — admin APK আপলোড করেন, খেলোয়াড় সাইটের "APP" বোতাম
 * থেকে **ঠিক সেই নামেই** ফাইলটা নামান। নতুন আপলোড করলে আগেরটা বদলে যায়।
 */
const AppDownload = () => {
  const [setting, setSetting] = useState(null);
  const [form, setForm] = useState({ descBn: "", descEn: "", version: "", enabled: true, showWebApp: true });
  const [file, setFile] = useState(null);
  const [version, setVersion] = useState("");
  const [progress, setProgress] = useState(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [drag, setDrag] = useState(false);
  const input = useRef(null);

  const apply = (s) => {
    setSetting(s);
    setForm({ descBn: s.description?.bn || "", descEn: s.description?.en || "", version: s.version || "", enabled: s.enabled, showWebApp: s.showWebApp });
  };

  useEffect(() => {
    api
      .get("/api/app/admin")
      .then(({ data }) => apply(data.data.setting))
      .catch((e) => toast.error(errorOf(e, "Failed to load")));
  }, []);

  const pick = (f) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".apk")) {
      toast.error("Only .apk files");
      return;
    }
    setFile(f);
  };

  const upload = async () => {
    if (!file) return;
    const body = new FormData();
    body.append("apk", file, file.name);
    body.append("version", version);
    try {
      setProgress(0);
      const { data } = await api.post("/api/app/admin/apk", body, {
        onUploadProgress: (e) => e.total && setProgress(Math.round((e.loaded / e.total) * 100)),
        timeout: 0,
      });
      apply(data.data.setting);
      setFile(null);
      setVersion("");
      toast.success("APK uploaded");
    } catch (err) {
      toast.error(errorOf(err, "Upload failed"));
    } finally {
      setProgress(null);
    }
  };

  const save = async () => {
    try {
      setBusy(true);
      const { data } = await api.put("/api/app/admin", {
        enabled: form.enabled,
        showWebApp: form.showWebApp,
        version: form.version,
        description: { bn: form.descBn, en: form.descEn },
      });
      apply(data.data.setting);
      toast.success("Saved");
    } catch (err) {
      toast.error(errorOf(err, "Could not save"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    try {
      setBusy(true);
      const { data } = await api.delete("/api/app/admin/apk");
      apply(data.data.setting);
      setRemoving(false);
      toast.success("APK removed");
    } catch (err) {
      toast.error(errorOf(err));
    } finally {
      setBusy(false);
    }
  };

  if (!setting) return <Loading />;

  return (
    <div className="mx-auto max-w-[900px]">
      <PageHead title="App Download" subtitle="Upload the Android app (.apk). Players download it from the site's “APP” button with exactly the same file name." />

      {/* বর্তমান ফাইল */}
      <div className="ad-card mb-5">
        <p className="ad-label">Current app</p>
        {setting.fileName ? (
          <div className="flex flex-wrap items-center gap-4">
            <span className="grid place-items-center rounded-xl bg-[#3ddc84]/15 text-[#3ddc84]" style={{ width: 54, height: 54 }}>
              <Smartphone size={26} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="break-all text-[16px] font-semibold text-[var(--neutral100)]">{setting.fileName}</p>
              <p className="text-[12px] text-[var(--text-muted)]">
                {sizeText(setting.size)}
                {setting.version ? ` · v${setting.version}` : ""} · uploaded {new Date(setting.uploadedAt).toLocaleString()} · downloaded {setting.downloads} times
              </p>
            </div>
            <a href={imageUrl("/api/app/download")} className="ad-btn ad-btn--ghost ad-btn--sm">
              <Download size={14} /> Test download
            </a>
            <button type="button" onClick={() => setRemoving(true)} className="ad-btn ad-btn--ghost ad-btn--sm">
              <Trash2 size={14} /> Remove
            </button>
          </div>
        ) : (
          <p className="text-[14px] text-[var(--text-muted)]">No app uploaded yet — the site's “APP” button tells players the app is coming soon.</p>
        )}
      </div>

      {/* আপলোড */}
      <div className="ad-card mb-5 grid gap-4">
        <p className="ad-label">{setting.fileName ? "Replace with a new version" : "Upload the app"}</p>
        <div
          role="button"
          tabIndex={0}
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            pick(e.dataTransfer.files?.[0]);
          }}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-center"
          style={{ minHeight: 150, borderColor: drag ? "var(--primary500)" : "rgb(255 255 255 / .15)", background: drag ? "rgb(255 255 255 / .04)" : "transparent" }}
        >
          <UploadCloud size={30} className="text-[var(--text-muted)]" />
          {file ? (
            <>
              <p className="break-all text-[15px] font-semibold text-[var(--neutral100)]">{file.name}</p>
              <p className="text-[12px] text-[var(--text-muted)]">{sizeText(file.size)} — players will download it with this exact name</p>
            </>
          ) : (
            <p className="text-[14px] text-[var(--text-muted)]">Drop the .apk here or click to choose (up to 300 MB)</p>
          )}
          <input ref={input} type="file" accept=".apk,application/vnd.android.package-archive" hidden onChange={(e) => pick(e.target.files?.[0])} />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div style={{ width: 200 }}>
            <Field label="Version (optional)">
              <input className="ad-input" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="e.g. 1.2.0" />
            </Field>
          </div>
          <button type="button" disabled={!file || progress !== null} onClick={upload} className="ad-btn ad-btn--primary">
            {progress !== null ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />} {progress !== null ? `Uploading ${progress}%` : "Upload"}
          </button>
        </div>
        {progress !== null && (
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-[var(--primary500)] transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      {/* নিয়ম ও লেখা */}
      <div className="ad-card grid gap-4">
        <div className="flex flex-wrap gap-5 text-[14px] text-[var(--text-secondary)]">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} /> App download is on
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={form.showWebApp} onChange={(e) => setForm({ ...form, showWebApp: e.target.checked })} /> Show the “Web-app” button (add to home screen)
          </label>
        </div>
        {setting.fileName && (
          <div style={{ width: 200 }}>
            <Field label="Version shown">
              <input className="ad-input" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
            </Field>
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Popup text (বাংলা)" hint="Empty = the default text.">
            <textarea rows={3} className="ad-input" value={form.descBn} onChange={(e) => setForm({ ...form, descBn: e.target.value })} />
          </Field>
          <Field label="Popup text (English)">
            <textarea rows={3} className="ad-input" value={form.descEn} onChange={(e) => setForm({ ...form, descEn: e.target.value })} />
          </Field>
        </div>
        <div className="flex justify-end">
          <button type="button" disabled={busy} onClick={save} className="ad-btn ad-btn--primary">
            <Save size={15} /> Save
          </button>
        </div>
      </div>

      <ConfirmModal
        open={removing}
        title="Remove the app file?"
        message="Players will not be able to download the app until you upload a new one."
        confirmText="Remove"
        danger
        busy={busy}
        onConfirm={remove}
        onClose={() => setRemoving(false)}
      />
    </div>
  );
};

export default AppDownload;
