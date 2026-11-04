// Riepilogo dei soggiorni in PDF, generato interamente sul dispositivo.
// Ogni pagina A4 viene disegnata su un canvas (così funzionano tutte le lingue,
// anche arabo, ebraico, cinese e hindi) e poi inserita in un PDF come immagine.
import type { Dict } from "../i18n/translations";
import { dayCount } from "../i18n/plural";
import {
  Trip,
  daysUsedInWindow,
  nextAvailableEntry,
  plannedDaysAfter,
  simulateStay,
  sortTripsDesc,
  todayISO,
  tripDuration,
} from "./calculator";

const W = 1240; // A4 a 150 dpi
const H = 1754;
const M = 90; // margine
const BLUE = "#003399";
const INK = "#14213d";
const SOFT = "#5b6470";
const LINE = "#dde3f0";
const FONT = '"Space Grotesk", system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';

export interface ReportOptions {
  trips: Trip[];
  t: Dict;
  isRtl: boolean;
  countryName: (code: string) => string;
  logoUrl: string;
}

function formatDate(iso: string): string {
  return iso.split("-").reverse().join("/");
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Taglia il testo con "…" se non entra nella larghezza indicata. */
function fit(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + "…").width > max) s = s.slice(0, -1);
  return s + "…";
}

/** Divide un testo in righe; le lingue senza spazi (es. cinese) vanno a capo per carattere. */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const parts = text.includes(" ") ? text.split(" ") : Array.from(text);
  const sep = text.includes(" ") ? " " : "";
  const lines: string[] = [];
  let line = "";
  for (const p of parts) {
    const next = line ? line + sep + p : p;
    if (line && ctx.measureText(next).width > max) {
      lines.push(line);
      line = p;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Disegna le pagine del riepilogo e restituisce un canvas per pagina. */
export async function drawReportPages(opts: ReportOptions): Promise<HTMLCanvasElement[]> {
  const { trips, t, isRtl, countryName } = opts;
  await document.fonts?.ready;
  const logo = await loadImage(opts.logoUrl);

  const today = todayISO();
  const used = daysUsedInWindow(trips);
  const next = nextAvailableEntry(trips);
  const stay = simulateStay(trips, next);
  const planned = plannedDaysAfter(trips);
  const rows = sortTripsDesc(trips);

  // In RTL le posizioni si specchiano: x misurata da destra
  const X = (x: number) => (isRtl ? W - x : x);
  const start: CanvasTextAlign = isRtl ? "right" : "left";
  const end: CanvasTextAlign = isRtl ? "left" : "right";

  const pages: HTMLCanvasElement[] = [];
  const newPage = () => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, W, H);
    ctx.direction = isRtl ? "rtl" : "ltr";
    ctx.textBaseline = "alphabetic";
    pages.push(c);
    return ctx;
  };

  let ctx = newPage();
  let y = M;

  // Intestazione
  const logoSize = 96;
  if (logo) ctx.drawImage(logo, isRtl ? W - M - logoSize : M, y, logoSize, logoSize);
  const tx = M + logoSize + 24;
  ctx.fillStyle = INK;
  ctx.textAlign = start;
  ctx.font = `700 40px ${FONT}`;
  ctx.fillText(fit(ctx, t.reportTitle, W - tx - M), X(tx), y + 46);
  ctx.fillStyle = SOFT;
  ctx.font = `400 24px ${FONT}`;
  ctx.fillText(fit(ctx, t.reportSubtitle(formatDate(today)), W - tx - M), X(tx), y + 84);
  y += logoSize + 22;
  ctx.fillStyle = BLUE;
  ctx.fillRect(M, y, W - 2 * M, 5);
  y += 40;

  // Riquadri con i numeri principali
  // Durante un viaggio in corso: data di ingresso e data limite per uscire
  const ongoing = trips.find((tr) => !tr.exit && tr.entry <= today);
  const ongoingStay = ongoing ? simulateStay(trips.filter((tr) => tr.id !== ongoing.id), ongoing.entry) : null;
  const cards: [string, string][] = [
    [t.totalLast180, `${used} / 90`],
    [t.daysRemaining, String(Math.max(0, 90 - used))],
    ongoing ? [t.entryDate, formatDate(ongoing.entry)] : [t.nextEntryLabel, formatDate(next)],
    ongoing
      ? [t.exitDeadline, ongoingStay?.maxExit ? formatDate(ongoingStay.maxExit) : "—"]
      : [t.stayUntilLabel, stay.maxExit ? formatDate(stay.maxExit) : "—"],
  ];
  const gap = 18;
  const cw = (W - 2 * M - gap * 3) / 4;
  const ch = 130;
  cards.forEach(([label, value], i) => {
    const cx = M + i * (cw + gap);
    const left = isRtl ? W - cx - cw : cx;
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    // roundRect manca sui WebView più vecchi: in quel caso angoli dritti
    if (ctx.roundRect) ctx.roundRect(left, y, cw, ch, 16);
    else ctx.rect(left, y, cw, ch);
    ctx.stroke();
    ctx.fillStyle = SOFT;
    ctx.font = `600 18px ${FONT}`;
    wrap(ctx, label.toUpperCase(), cw - 36)
      .slice(0, 2)
      .forEach((l, k) => ctx.fillText(l, X(cx + 18), y + 34 + k * 22));
    ctx.fillStyle = BLUE;
    ctx.font = `700 34px ${MONO}`;
    // Numeri e date sempre da sinistra a destra, anche in arabo ed ebraico
    ctx.direction = "ltr";
    ctx.fillText(fit(ctx, value, cw - 36), X(cx + 18), y + ch - 24);
    ctx.direction = isRtl ? "rtl" : "ltr";
  });
  y += ch + 50;

  // Tabella dei viaggi
  ctx.fillStyle = INK;
  ctx.font = `700 26px ${FONT}`;
  ctx.fillText(`${t.reportTrips(trips.length)} · ${t.plannedDays}: ${dayCount(t, planned)}`, X(M), y);
  y += 30;

  const cols = [
    { label: t.entryDate, w: 170 },
    { label: t.exitDate, w: 170 },
    { label: t.reportDaysCol, w: 200, num: true },
    { label: t.reportCountriesCol, w: 270 },
    { label: t.note, w: W - 2 * M - 170 - 170 - 200 - 270 },
  ];
  const drawHeader = () => {
    ctx.fillStyle = SOFT;
    ctx.font = `600 17px ${FONT}`;
    let cx = M;
    for (const c of cols) {
      ctx.textAlign = c.num ? end : start;
      ctx.fillText(fit(ctx, c.label.toUpperCase(), c.w - 16), X(c.num ? cx + c.w - 16 : cx), y + 26);
      cx += c.w;
    }
    y += 40;
    ctx.fillStyle = LINE;
    ctx.fillRect(M, y, W - 2 * M, 3);
    y += 8;
  };
  drawHeader();

  const rowH = 52;
  const footerSpace = 190;
  for (const trip of rows) {
    if (y + rowH > H - footerSpace) {
      ctx = newPage();
      y = M;
      drawHeader();
    }
    const isPlanned = trip.entry > today;
    const countries = [trip.entryCountry, trip.exitCountry !== trip.entryCountry ? trip.exitCountry : undefined]
      .filter((c): c is string => Boolean(c))
      .map(countryName)
      .join(isRtl ? " ← " : " → ");
    const cells = [
      formatDate(trip.entry),
      trip.exit ? formatDate(trip.exit) : t.ongoingLabel,
      String(tripDuration(trip)),
      countries,
      [trip.note ?? "", isPlanned ? `(${t.plannedLabel})` : ""].filter(Boolean).join(" "),
    ];
    ctx.fillStyle = isPlanned ? "#2f5fd0" : INK;
    let cx = M;
    cells.forEach((text, i) => {
      const c = cols[i];
      ctx.textAlign = c.num ? end : start;
      ctx.font = i < 3 ? `600 21px ${MONO}` : `400 21px ${FONT}`;
      // Date e numeri (prime tre colonne) sempre da sinistra a destra
      const numeric = i < 3 && /^[\d/]+$/.test(text);
      if (numeric) ctx.direction = "ltr";
      ctx.fillText(fit(ctx, text, c.w - 16), X(c.num ? cx + c.w - 16 : cx), y + 34);
      ctx.direction = isRtl ? "rtl" : "ltr";
      cx += c.w;
    });
    y += rowH;
    ctx.fillStyle = "#eef1f7";
    ctx.fillRect(M, y - 2, W - 2 * M, 2);
  }

  // Nota finale e numeri di pagina
  ctx.textAlign = start;
  ctx.fillStyle = SOFT;
  ctx.font = `400 18px ${FONT}`;
  const noteLines = wrap(ctx, t.reportNote, W - 2 * M);
  let ny = H - M - noteLines.length * 26 + 10;
  ctx.fillStyle = LINE;
  ctx.fillRect(M, ny - 36, W - 2 * M, 2);
  ctx.fillStyle = SOFT;
  for (const l of noteLines) {
    ctx.fillText(l, X(M), ny);
    ny += 26;
  }
  if (pages.length > 1) {
    pages.forEach((p, i) => {
      const c = p.getContext("2d")!;
      c.fillStyle = SOFT;
      c.font = `400 18px ${FONT}`;
      c.textAlign = "center";
      c.fillText(`${i + 1} / ${pages.length}`, W / 2, H - 40);
    });
  }
  return pages;
}

/** PDF minimo: una pagina A4 per ogni immagine JPEG. */
function jpegsToPdf(jpegs: Uint8Array[]): Blob {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (data: Uint8Array | string) => {
    const bytes = typeof data === "string" ? enc.encode(data) : data;
    chunks.push(bytes);
    length += bytes.length;
  };
  const obj = (n: number, body: () => void) => {
    offsets[n] = length;
    push(`${n} 0 obj\n`);
    body();
    push("\nendobj\n");
  };

  const pageW = 595.28;
  const pageH = 841.89;
  const n = jpegs.length;
  // 1 = catalogo, 2 = elenco pagine, poi per ogni pagina: pagina, contenuto, immagine
  const pageObj = (i: number) => 3 + i * 3;
  push("%PDF-1.4\n%âãÏÓ\n");
  obj(1, () => push("<< /Type /Catalog /Pages 2 0 R >>"));
  obj(2, () => push(`<< /Type /Pages /Count ${n} /Kids [${jpegs.map((_, i) => `${pageObj(i)} 0 R`).join(" ")}] >>`));
  jpegs.forEach((jpeg, i) => {
    const p = pageObj(i);
    obj(p, () =>
      push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 ${p + 2} 0 R >> >> /Contents ${p + 1} 0 R >>`
      )
    );
    const content = `q ${pageW} 0 0 ${pageH} 0 0 cm /Im0 Do Q`;
    obj(p + 1, () => push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
    obj(p + 2, () => {
      push(`<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
      push(jpeg);
      push("\nendstream");
    });
  });
  const total = 3 + n * 3;
  const xref = length;
  push(`xref\n0 ${total}\n0000000000 65535 f \n`);
  for (let i = 1; i < total; i++) push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(chunks as BlobPart[], { type: "application/pdf" });
}

async function canvasToJpeg(c: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve) => c.toBlob((b) => resolve(b!), "image/jpeg", 0.9));
  return new Uint8Array(await blob.arrayBuffer());
}

export async function buildReportPdf(opts: ReportOptions): Promise<Blob> {
  const pages = await drawReportPages(opts);
  return jpegsToPdf(await Promise.all(pages.map(canvasToJpeg)));
}
