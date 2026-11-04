import { useRef, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { Capacitor } from "@capacitor/core";
import { todayISO } from "../utils/calculator";
import { shareOrDownload } from "../utils/exportPdf";

interface Props {
  exportTrips: () => string;
  importTrips: (json: string) => boolean;
}

export default function BackupControls({ exportTrips, importTrips }: Props) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const backupFile = () =>
    new File([exportTrips()], `schengen-days-backup-${todayISO()}.json`, { type: "application/json" });

  // Sul web scarica il file; nell'app Android apre il foglio nativo (Salva su file, Drive, email…).
  const handleExport = () => {
    const file = backupFile();
    if (Capacitor.isNativePlatform()) {
      void shareOrDownload(file, "StampDays — backup").catch(console.error);
      return;
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleShare = () => {
    void shareOrDownload(backupFile(), "StampDays — backup").catch(console.error);
  };

  const handleImportClick = () => {
    if (!window.confirm(t.importConfirm)) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importTrips(String(reader.result));
      setMessage(ok ? { type: "success", text: t.importSuccess } : { type: "error", text: t.importError });
    };
    reader.readAsText(file);
  };

  return (
    <details className="backup">
      <summary className="backup__title">{t.backupTitle}</summary>
      <div className="backup__actions">
        <button type="button" onClick={handleExport} className="backup__export">
          ⬇ {t.exportBackup}
        </button>
        <button type="button" onClick={handleShare} className="backup__share">
          ⤴ {t.shareBackup}
        </button>
        <button type="button" onClick={handleImportClick} className="backup__import">
          ⬆ {t.importBackup}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
      </div>
      {message && (
        <p className={`backup__message backup__message--${message.type}`}>{message.text}</p>
      )}
    </details>
  );
}
