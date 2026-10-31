import type { Dict, Lang } from "../i18n/translations";
import { Trip, todayISO } from "./calculator";
import { buildReportPdf } from "./reportPdf";
import { countryName } from "../data/schengenCountries";

/** Condivide un file (email, WhatsApp, Drive…) o, se non è possibile, lo scarica. */
export async function shareOrDownload(file: File, title: string) {
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
