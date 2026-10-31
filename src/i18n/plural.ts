import type { Dict } from "./translations";

/** "giorno" o "giorni" nella lingua attuale, secondo il numero. */
export function dayWord(t: Dict, n: number): string {
  return n === 1 ? t.dayUnitOne : t.daysUnit;
}

/** "1 giorno" / "5 giorni" nella lingua attuale. */
export function dayCount(t: Dict, n: number): string {
  return `${n} ${dayWord(t, n)}`;
}
