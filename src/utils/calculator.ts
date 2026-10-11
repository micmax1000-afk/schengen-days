export interface Trip {
  id: string;
  entry: string; // formato ISO "YYYY-MM-DD"
  exit?: string; // formato ISO "YYYY-MM-DD" — vuoto/assente = viaggio ancora in corso
  entryCountry?: string; // codice paese ISO di ingresso (es. "FR")
  exitCountry?: string;  // codice paese ISO di uscita
  note?: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WINDOW_SIZE = 180;
const MAX_DAYS = 90;

function parseISO(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Converte una data "di calendario" (letta con l'ora locale del dispositivo)
 *  nella mezzanotte UTC dello stesso giorno, il formato usato internamente. */
function localDay(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

/** Data di oggi (ora locale del dispositivo) in formato ISO "YYYY-MM-DD". */
export function todayISO(now: Date = new Date()): string {
  return toISO(localDay(now));
}

/** Vero se il viaggio è ancora in corso (nessuna data di uscita impostata). */
export function isOngoing(trip: Trip): boolean {
  return !trip.exit;
}

/** Data di uscita "effettiva" di un viaggio: quella impostata, oppure oggi se ancora in corso. */
function effectiveExit(trip: Trip): string {
  return trip.exit && trip.exit.length > 0 ? trip.exit : todayISO();
}

/** Numero di giorni di un viaggio, ingresso e uscita inclusi. Se il viaggio
 *  è ancora in corso, conta i giorni fino a oggi. */
export function tripDuration(trip: Trip): number {
  const entry = parseISO(trip.entry);
  const exit = parseISO(effectiveExit(trip));
  return Math.round((exit.getTime() - entry.getTime()) / MS_PER_DAY) + 1;
}

/** Verifica che un viaggio sia valido: serve solo l'ingresso; se è impostata
 *  anche l'uscita, questa non può precedere l'ingresso. */
export function isValidTrip(entry: string, exit?: string): boolean {
  if (!entry) return false;
  if (!exit) return true;
  return parseISO(exit).getTime() >= parseISO(entry).getTime();
}

/**
 * Calcola quanti giorni della finestra di 180 giorni che termina in
 * `referenceDate` (inclusa) sono stati trascorsi nell'area Schengen,
 * sommando tutti i viaggi senza contare due volte i giorni sovrapposti.
 */
export function daysUsedInWindow(trips: Trip[], referenceDate: Date = new Date()): number {
  return usedInWindowUTC(trips, localDay(referenceDate));
}

/** Come daysUsedInWindow, ma `ref` è già una mezzanotte UTC (es. da parseISO). */
function usedInWindowUTC(trips: Trip[], ref: Date): number {
  const windowStart = new Date(ref.getTime() - (WINDOW_SIZE - 1) * MS_PER_DAY);

  const occupied = new Set<string>();

  for (const trip of trips) {
    if (!isValidTrip(trip.entry, trip.exit)) continue;
    const entry = parseISO(trip.entry);
    const exit = parseISO(effectiveExit(trip));

    const start = entry.getTime() > windowStart.getTime() ? entry : windowStart;
    const end = exit.getTime() < ref.getTime() ? exit : ref;

    for (let t = start.getTime(); t <= end.getTime(); t += MS_PER_DAY) {
      occupied.add(toISO(new Date(t)));
    }
  }

  return occupied.size;
}

export function daysRemaining(trips: Trip[], referenceDate: Date = new Date()): number {
  return MAX_DAYS - daysUsedInWindow(trips, referenceDate);
}

export interface ComplianceStatus {
  used: number;
  remaining: number;
  overLimit: boolean;
  level: "ok" | "warning" | "full" | "over";
}

/**
 * Stato di conformità: "ok" fino a 70 giorni usati, "warning" da 71 a 89,
 * "full" a 90 esatti (in regola, ma oggi non si può entrare né restare un
 * giorno in più), "over" oltre i 90 giorni consentiti.
 */
export function getComplianceStatus(trips: Trip[], referenceDate: Date = new Date()): ComplianceStatus {
  const used = daysUsedInWindow(trips, referenceDate);
  const remaining = MAX_DAYS - used;
  let level: ComplianceStatus["level"] = "ok";
  if (used > MAX_DAYS) level = "over";
  else if (used === MAX_DAYS) level = "full";
  else if (used >= 71) level = "warning";
  return { used, remaining, overLimit: used > MAX_DAYS, level };
}

export function sortTripsDesc(trips: Trip[]): Trip[] {
  return [...trips].sort((a, b) => parseISO(b.entry).getTime() - parseISO(a.entry).getTime());
}

/** Restituisce il viaggio (se esiste) che contiene la data indicata. */
export function tripContaining(dateISO: string, trips: Trip[]): Trip | undefined {
  const d = parseISO(dateISO).getTime();
  return trips.find((t) => {
    if (!isValidTrip(t.entry, t.exit)) return false;
    return d >= parseISO(t.entry).getTime() && d <= parseISO(effectiveExit(t)).getTime();
  });
}

/** Vero se la data indicata rientra nella finestra dei 180 giorni terminante in referenceDate. */
export function isDateInWindow(dateISO: string, referenceDate: Date = new Date()): boolean {
  const ref = localDay(referenceDate);
  const windowStart = new Date(ref.getTime() - (WINDOW_SIZE - 1) * MS_PER_DAY);
  const d = parseISO(dateISO).getTime();
  return d >= windowStart.getTime() && d <= ref.getTime();
}

export { toISO };

export interface FutureConflict {
  trip: Trip;
  used: number;
}

/**
 * Verifica se aggiungere/modificare `candidate` farebbe superare i 90 giorni
 * per uno o più viaggi già pianificati più avanti nel tempo. Restituisce
 * l'elenco dei viaggi futuri "compromessi", con quanti giorni risulterebbero
 * usati nella loro finestra di 180 giorni se il candidato venisse salvato.
 */
export function findFutureConflicts(existingTrips: Trip[], candidate: Trip): FutureConflict[] {
  if (!isValidTrip(candidate.entry, candidate.exit)) return [];

  const others = existingTrips.filter((t) => t.id !== candidate.id);
  const allWithCandidate = [...others, candidate];
  const conflicts: FutureConflict[] = [];

  for (const trip of others) {
    // Consideriamo solo viaggi futuri con date certe (non in corso) che
    // iniziano dopo il candidato: sono quelli che potrebbero "subire" il
    // nuovo viaggio.
    if (!trip.exit || trip.entry <= candidate.entry) continue;
    if (!isValidTrip(trip.entry, trip.exit)) continue;

    const used = usedInWindowUTC(allWithCandidate, parseISO(trip.exit));
    if (used > MAX_DAYS) {
      conflicts.push({ trip, used });
    }
  }

  return conflicts;
}

/**
 * Calcola la prossima data (a partire da oggi) in cui sarebbe possibile
 * entrare nell'area Schengen restando almeno un giorno senza superare il
 * limite di 90/180, tenendo conto dei viaggi già registrati. Se oggi stesso
 * è già disponibile, restituisce la data di oggi.
 */
/**
 * Se oggi è in corso (o inizia oggi) un viaggio con una data di uscita
 * futura già pianificata, calcola quanti giorni risulteranno usati e quanti
 * ne resteranno una volta completato quel viaggio come previsto. Utile per
 * non confondere l'utente quando registra un viaggio che inizia oggi: il
 * riepilogo mostra i giorni usati "ad oggi", non quelli del viaggio intero.
 */
export function currentTripProjection(
  trips: Trip[],
  referenceDate: Date = new Date()
): { used: number; remaining: number; exitISO: string } | null {
  const today = todayISO(referenceDate);
  const activeFutureTrip = trips.find(
    (t) => t.exit && t.entry <= today && t.exit > today
  );
  if (!activeFutureTrip || !activeFutureTrip.exit) return null;

  const used = usedInWindowUTC(trips, parseISO(activeFutureTrip.exit));
  return { used, remaining: MAX_DAYS - used, exitISO: activeFutureTrip.exit };
}

/**
 * Vero se un soggiorno da `stayEntry` a `stayExit` (inclusi), aggiunto ai
 * viaggi esistenti, farebbe superare i 90 giorni in una qualsiasi finestra
 * di 180 giorni che contiene almeno un giorno del soggiorno. Controlla anche
 * le finestre successive, quindi tiene conto dei viaggi già pianificati più
 * avanti: un soggiorno è valido solo se non compromette nemmeno quelli.
 */
function stayExceedsLimit(trips: Trip[], stayEntry: string, stayExit: string): boolean {
  return firstViolation(trips, stayEntry, stayExit) !== null;
}

/** Come stayExceedsLimit, ma restituisce il primo giorno (ISO) in cui la
 *  finestra di 180 giorni supera i 90, oppure null se non succede mai. */
function firstViolation(trips: Trip[], stayEntry: string, stayExit: string): string | null {
  const occupied = new Set<number>();
  const addRange = (from: string, to: string) => {
    const end = parseISO(to).getTime() / MS_PER_DAY;
    for (let d = parseISO(from).getTime() / MS_PER_DAY; d <= end; d++) occupied.add(d);
  };
  for (const trip of trips) {
    if (isValidTrip(trip.entry, trip.exit)) addRange(trip.entry, effectiveExit(trip));
  }
  addRange(stayEntry, stayExit);

  const days = [...occupied].sort((a, b) => a - b);
  const stayStart = parseISO(stayEntry).getTime() / MS_PER_DAY;
  const stayEnd = parseISO(stayExit).getTime() / MS_PER_DAY;

  // Basta controllare le finestre che terminano in un giorno trascorso in
  // Schengen: negli altri giorni il conteggio non può essere più alto.
  let lo = 0;
  for (let hi = 0; hi < days.length; hi++) {
    const d = days[hi];
    while (days[lo] < d - (WINDOW_SIZE - 1)) lo++;
    const windowTouchesStay = d >= stayStart && d - (WINDOW_SIZE - 1) <= stayEnd;
    if (windowTouchesStay && hi - lo + 1 > MAX_DAYS) return toISO(new Date(d * MS_PER_DAY));
  }
  return null;
}

export function nextAvailableEntry(
  trips: Trip[],
  referenceDate: Date = new Date(),
  horizonDays = 200
): string {
  const start = localDay(referenceDate);
  for (let i = 0; i < horizonDays; i++) {
    const candidate = new Date(start.getTime() + i * MS_PER_DAY);
    const candidateISO = toISO(candidate);
    if (!stayExceedsLimit(trips, candidateISO, candidateISO)) return candidateISO;
  }
  return toISO(start);
}

export interface StaySimulation {
  /** Vero se già al momento dell'ingresso il limite risulta superato (viaggi esistenti troppo fitti). */
  alreadyOverAtEntry: boolean;
  /** Numero massimo di giorni consecutivi restabili a partire dall'ingresso. */
  daysAllowed: number;
  /** Ultima data di uscita consentita (ISO), oppure null se 0 giorni sono consentiti. */
  maxExit: string | null;
  /** Il viaggio già pianificato dopo l'ingresso che impedisce di restare
   *  più a lungo (restando un giorno in più gli farebbe superare i 90
   *  giorni), oppure null se il limite dipende solo dai viaggi passati. */
  limitingTrip: Trip | null;
}

/**
 * Simula un ingresso futuro il giorno `entryISO` e calcola fino a quando
 * si può restare senza superare il limite di 90 giorni su 180, tenendo
 * conto dei viaggi già registrati, compresi quelli pianificati più avanti
 * (il soggiorno non deve far superare il limite nemmeno a quelli).
 */
export function simulateStay(trips: Trip[], entryISO: string, maxHorizonDays = 90): StaySimulation {
  const entry = parseISO(entryISO);
  let lastValid: Date | null = null;
  let violationISO: string | null = null;

  for (let i = 0; i < maxHorizonDays; i++) {
    const candidateExit = new Date(entry.getTime() + i * MS_PER_DAY);
    violationISO = firstViolation(trips, entryISO, toISO(candidateExit));
    if (violationISO) break;
    lastValid = candidateExit;
  }

  // Se il soggiorno si ferma perché farebbe sforare un viaggio già
  // pianificato più avanti, lo indichiamo per spiegarlo all'utente.
  const violatedTrip = violationISO ? tripContaining(violationISO, trips) : undefined;
  const limitingTrip = violatedTrip && violatedTrip.entry > entryISO ? violatedTrip : null;

  if (!lastValid) {
    return { alreadyOverAtEntry: true, daysAllowed: 0, maxExit: null, limitingTrip };
  }
  const daysAllowed = Math.round((lastValid.getTime() - entry.getTime()) / MS_PER_DAY) + 1;
  return { alreadyOverAtEntry: false, daysAllowed, maxExit: toISO(lastValid), limitingTrip };
}
