import type { Lang } from "../i18n/translations";

export interface Country {
  code: string;
  name: string;
  flag: string;
}

function flagEmoji(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

// I 29 paesi dell'area Schengen: 25 stati membri UE + 4 paesi associati
// (Islanda, Liechtenstein, Norvegia, Svizzera).
// Il nome qui è solo il fallback italiano, usato se il browser non supporta
// la traduzione automatica dei nomi dei paesi (Intl.DisplayNames).
const CODES: [string, string][] = [
  ["AT", "Austria"],
  ["BE", "Belgio"],
  ["BG", "Bulgaria"],
  ["HR", "Croazia"],
  ["CZ", "Cechia"],
  ["DK", "Danimarca"],
  ["EE", "Estonia"],
  ["FI", "Finlandia"],
  ["FR", "Francia"],
  ["DE", "Germania"],
  ["GR", "Grecia"],
  ["IT", "Italia"],
  ["LV", "Lettonia"],
  ["LT", "Lituania"],
  ["LU", "Lussemburgo"],
  ["MT", "Malta"],
  ["PL", "Polonia"],
  ["PT", "Portogallo"],
  ["NL", "Paesi Bassi"],
  ["RO", "Romania"],
  ["SK", "Slovacchia"],
  ["SI", "Slovenia"],
  ["ES", "Spagna"],
  ["SE", "Svezia"],
  ["HU", "Ungheria"],
  ["IS", "Islanda"],
  ["LI", "Liechtenstein"],
  ["NO", "Norvegia"],
  ["CH", "Svizzera"],
];

const FALLBACK_NAMES: Record<string, string> = Object.fromEntries(CODES);

// Cache di un oggetto Intl.DisplayNames per lingua, per non ricrearlo ad
// ogni render.
const displayNamesCache = new Map<string, Intl.DisplayNames | null>();

function getDisplayNames(lang: string): Intl.DisplayNames | null {
  if (displayNamesCache.has(lang)) {
    return displayNamesCache.get(lang) ?? null;
  }
  let instance: Intl.DisplayNames | null = null;
  try {
    if (typeof Intl !== "undefined" && "DisplayNames" in Intl) {
      instance = new Intl.DisplayNames([lang], { type: "region" });
    }
  } catch {
    instance = null;
  }
  displayNamesCache.set(lang, instance);
  return instance;
}

/** Nome del paese tradotto automaticamente nella lingua richiesta, tramite
 *  l'API del browser Intl.DisplayNames. Se la lingua non è supportata (o il
 *  browser è troppo vecchio), usa il nome italiano come riserva. */
export function countryName(code: string, lang: Lang): string {
  const displayNames = getDisplayNames(lang);
  if (displayNames) {
    try {
      const translated = displayNames.of(code.toUpperCase());
      if (translated) return translated;
    } catch {
      // ignora e usa il fallback
    }
  }
  return FALLBACK_NAMES[code.toUpperCase()] ?? code;
}

/** Elenco dei 29 paesi Schengen con il nome tradotto nella lingua corrente
 *  dell'app, ordinato alfabeticamente secondo quella lingua. */
export function schengenCountries(lang: Lang): Country[] {
  return CODES.map(([code]) => ({
    code,
    name: countryName(code, lang),
    flag: flagEmoji(code),
  })).sort((a, b) => a.name.localeCompare(b.name, lang));
}

/** Elenco "grezzo" (nomi in italiano) mantenuto per retrocompatibilità con
 *  codice che non ha ancora bisogno della traduzione. */
export const SCHENGEN_COUNTRIES: Country[] = CODES.map(([code, name]) => ({
  code,
  name,
  flag: flagEmoji(code),
})).sort((a, b) => a.name.localeCompare(b.name));

export function flagForCode(code?: string): string {
  if (!code) return "";
  return flagEmoji(code);
}

/** URL di un'immagine bandiera (Twemoji), che funziona identica su ogni
 *  sistema operativo — a differenza dell'emoji di sistema, che su Windows
 *  mostra solo la sigla del paese invece della bandiera. */
export function flagImageUrl(code?: string): string {
  if (!code) return "";
  const hex = code
    .toUpperCase()
    .split("")
    .map((c) => (127397 + c.charCodeAt(0)).toString(16))
    .join("-");
  return `https://cdn.jsdelivr.net/gh/jdecked/twemoji@16.0.1/assets/72x72/${hex}.png`;
}
