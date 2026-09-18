import { useRef, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";

interface Props {
  exportTrips: () => string;
  importTrips: (json: string) => boolean;
}

export default function BackupControls({ exportTrips, importTrips }: Props) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleExport = () => {
    const json = exportTrips();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `schengen-days-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const json = exportTrips();
    const date = new Date().toISOString().slice(0, 10);
    const file = new File([json], `schengen-days-backup-${date}.json`, { type: "application/json" });

    let shared = false;
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Schengen Days — backup" });
        shared = true;
      }
    } catch (err) {
      // AbortError = l'utente ha annullato volontariamente: va bene così, nessun fallback.
      if (err instanceof DOMException && err.name === "AbortError") {
        shared = true;
      }
    }
    // In ogni altro caso (condivisione non supportata, file non condivisibile,
    // errore imprevisto) scarichiamo comunque il backup invece di non fare nulla.
    if (!shared) handleExport();
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
    <section className="backup">
      <h2 className="backup__title">{t.backupTitle}</h2>
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
    </section>
  );
}
