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

/** Vero se il viaggio è ancora in corso (nessuna data di uscita impostata). */
export function isOngoing(trip: Trip): boolean {
  return !trip.exit;
}

/** Data di uscita "effettiva" di un viaggio: quella impostata, oppure oggi se ancora in corso. */
function effectiveExit(trip: Trip): string {
  return trip.exit && trip.exit.length > 0 ? trip.exit : toISO(new Date());
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
  const ref = new Date(Date.UTC(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate()));
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
  level: "ok" | "warning" | "over";
}

/**
 * Stato di conformità: "ok" fino a 70 giorni usati, "warning" da 71 a 90,
 * "over" oltre i 90 giorni consentiti.
 */
export function getComplianceStatus(trips: Trip[], referenceDate: Date = new Date()): ComplianceStatus {
  const used = daysUsedInWindow(trips, referenceDate);
  const remaining = MAX_DAYS - used;
  let level: ComplianceStatus["level"] = "ok";
  if (used > MAX_DAYS) level = "over";
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
  const ref = new Date(Date.UTC(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate()));
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

    const referenceDate = new Date(`${trip.exit}T00:00:00Z`);
    const used = daysUsedInWindow(allWithCandidate, referenceDate);
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
export function nextAvailableEntry(
  trips: Trip[],
  referenceDate: Date = new Date(),
  horizonDays = 200
): string {
  const start = new Date(
    Date.UTC(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate())
  );
  for (let i = 0; i < horizonDays; i++) {
    const candidate = new Date(start.getTime() + i * MS_PER_DAY);
    const candidateISO = toISO(candidate);
    const probeTrips = [...trips, { id: "__probe__", entry: candidateISO, exit: candidateISO }];
    const used = daysUsedInWindow(probeTrips, candidate);
    if (used <= MAX_DAYS) return candidateISO;
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
}

/**
 * Simula un ingresso futuro il giorno `entryISO` e calcola fino a quando
 * si può restare senza superare il limite di 90 giorni su 180, tenendo
 * conto dei viaggi già registrati. La finestra di 180 giorni scorre in
 * avanti giorno per giorno insieme al soggiorno simulato.
 */
export function simulateStay(trips: Trip[], entryISO: string, maxHorizonDays = 90): StaySimulation {
  const entry = parseISO(entryISO);
  let lastValid: Date | null = null;

  for (let i = 0; i < maxHorizonDays; i++) {
    const candidateExit = new Date(entry.getTime() + i * MS_PER_DAY);
    const simulatedTrips = [...trips, { id: "__sim__", entry: entryISO, exit: toISO(candidateExit) }];
    const used = daysUsedInWindow(simulatedTrips, candidateExit);
    if (used > MAX_DAYS) break;
    lastValid = candidateExit;
  }

  if (!lastValid) {
    return { alreadyOverAtEntry: true, daysAllowed: 0, maxExit: null };
  }

  const daysAllowed = Math.round((lastValid.getTime() - entry.getTime()) / MS_PER_DAY) + 1;
  return { alreadyOverAtEntry: false, daysAllowed, maxExit: toISO(lastValid) };
}
