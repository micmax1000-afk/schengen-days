import { useRef, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { Trip, todayISO } from "../utils/calculator";
import { buildReportPdf } from "../utils/reportPdf";
import { countryName } from "../data/schengenCountries";

interface Props {
  trips: Trip[];
  exportTrips: () => string;
  importTrips: (json: string) => boolean;
}

/** Condivide un file (email, WhatsApp, Drive…) o, se non è possibile, lo scarica. */
async function shareOrDownload(file: File, title: string) {
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title });
      return;
    }
  } catch (err) {
    // AbortError = l'utente ha annullato volontariamente: va bene così.
    if (err instanceof DOMException && err.name === "AbortError") return;
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function BackupControls({ trips, exportTrips, importTrips }: Props) {
  const { t, lang, isRtl } = useLanguage();
  const [pdfBusy, setPdfBusy] = useState(false);

  const handleExportPdf = async () => {
    setPdfBusy(true);
    try {
      const blob = await buildReportPdf({
        trips,
        t,
        isRtl,
        countryName: (code) => countryName(code, lang),
        logoUrl: `${import.meta.env.BASE_URL}logo.svg`,
      });
      const file = new File([blob], `schengen-days-${todayISO()}.pdf`, { type: "application/pdf" });
      await shareOrDownload(file, t.reportTitle);
    } finally {
      setPdfBusy(false);
    }
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleExport = () => {
    const json = exportTrips();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = todayISO();
    a.href = url;
    a.download = `schengen-days-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const json = exportTrips();
    const date = todayISO();
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
        <button type="button" onClick={handleExportPdf} className="backup__pdf" disabled={pdfBusy || trips.length === 0}>
          📄 {t.exportPdf}
        </button>
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
