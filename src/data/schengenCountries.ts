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
  return `https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/72x72/${hex}.png`;
}
