import { Capacitor } from "@capacitor/core";
import type { Dict, Lang } from "../i18n/translations";
import { Trip, todayISO } from "./calculator";
import { buildReportPdf } from "./reportPdf";
import { countryName } from "../data/schengenCountries";

/** Legge un file come base64 (senza il prefisso "data:...;base64,"). */
function toBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

/**
 * Condivide un file (email, WhatsApp, Drive, Salva su file…) o, se non è possibile, lo scarica.
 * Nell'app Android la WebView non supporta né navigator.share con file né i download
 * tramite link: il file viene scritto nella cache e aperto con il foglio di condivisione nativo.
 */
export async function shareOrDownload(file: File, title: string) {
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    const { uri } = await Filesystem.writeFile({
      path: file.name,
      data: await toBase64(file),
      directory: Directory.Cache,
    });
    try {
      await Share.share({ title, files: [uri], dialogTitle: title });
    } catch (err) {
      // L'utente ha chiuso il foglio di condivisione senza scegliere: va bene così.
      if (!/cancel/i.test(String((err as Error)?.message ?? err))) throw err;
    }
    return;
  }
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
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Crea il riepilogo PDF dei viaggi e lo condivide (o lo scarica). */
export async function exportReportPdf(trips: Trip[], t: Dict, lang: Lang, isRtl: boolean) {
  const blob = await buildReportPdf({
    trips,
    t,
    isRtl,
    countryName: (code) => countryName(code, lang),
    logoUrl: `${import.meta.env.BASE_URL}logo.svg`,
  });
  const file = new File([blob], `stampdays-${todayISO()}.pdf`, { type: "application/pdf" });
  await shareOrDownload(file, t.reportTitle);
}
