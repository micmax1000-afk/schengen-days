import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  Trip,
  currentTripProjection,
  daysUsedInWindow,
  findFutureConflicts,
  getComplianceStatus,
  isDateInWindow,
  nextAvailableEntry,
  simulateStay,
  todayISO,
  tripDuration,
} from "./calculator";

const trip = (id: string, entry: string, exit?: string): Trip => ({ id, entry, exit });

/** Una data "di calendario" nell'ora locale, come la produce il telefono. */
const local = (iso: string, hour = 12) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, hour);
};

// Node rilegge process.env.TZ a runtime: ripetiamo tutti i test in fusi
// orari diversi, a est e a ovest di Greenwich.
const ORIGINAL_TZ = process.env.TZ;

describe.each(["Europe/Rome", "America/New_York", "Pacific/Auckland", "UTC"])("fuso %s", (tz) => {
  beforeEach(() => {
    process.env.TZ = tz;
  });
  afterEach(() => {
    process.env.TZ = ORIGINAL_TZ;
    vi.useRealTimers();
  });

  it("conta ingresso e uscita inclusi", () => {
    expect(tripDuration(trip("a", "2026-01-01", "2026-01-01"))).toBe(1);
    expect(tripDuration(trip("a", "2026-01-01", "2026-01-10"))).toBe(10);
  });

  it("conta i giorni nella finestra di 180 giorni, riferimento incluso", () => {
    const trips = [trip("a", "2026-01-01", "2026-03-31")];
    expect(daysUsedInWindow(trips, local("2026-03-31"))).toBe(90);
    // A mezzanotte e un minuto o alle 23:59 il giorno resta lo stesso
    expect(daysUsedInWindow(trips, local("2026-03-31", 0))).toBe(90);
    expect(daysUsedInWindow(trips, new Date(2026, 2, 31, 23, 59))).toBe(90);
    // 180° giorno dopo l'ingresso: il 1° gennaio è ancora nella finestra
    expect(daysUsedInWindow(trips, local("2026-06-29"))).toBe(90);
    // Il giorno dopo esce dalla finestra
    expect(daysUsedInWindow(trips, local("2026-06-30"))).toBe(89);
  });

  it("non conta due volte i giorni di viaggi sovrapposti", () => {
    const trips = [trip("a", "2026-01-01", "2026-01-10"), trip("b", "2026-01-05", "2026-01-15")];
    expect(daysUsedInWindow(trips, local("2026-02-01"))).toBe(15);
  });

  it("calcola lo stato di conformità", () => {
    expect(getComplianceStatus([trip("a", "2026-01-01", "2026-03-11")], local("2026-03-11")).level).toBe("ok"); // 70
    expect(getComplianceStatus([trip("a", "2026-01-01", "2026-03-12")], local("2026-03-12")).level).toBe("warning"); // 71
    expect(getComplianceStatus([trip("a", "2026-01-01", "2026-03-30")], local("2026-03-30")).level).toBe("warning"); // 89
    expect(getComplianceStatus([trip("a", "2026-01-01", "2026-03-31")], local("2026-03-31"))).toMatchObject({
      level: "full",
      used: 90,
      remaining: 0,
    });
    expect(getComplianceStatus([trip("a", "2026-01-01", "2026-04-01")], local("2026-04-01")).level).toBe("over"); // 91
  });

  it("isDateInWindow usa il giorno locale", () => {
    expect(isDateInWindow("2026-03-31", local("2026-03-31", 0))).toBe(true);
    expect(isDateInWindow("2025-10-03", local("2026-03-31"))).toBe(true);
    expect(isDateInWindow("2025-10-02", local("2026-03-31"))).toBe(false);
  });

  it("todayISO e i viaggi in corso usano la data locale, anche vicino a mezzanotte", () => {
    vi.useFakeTimers();
    for (const hour of [0, 1, 12, 23]) {
      vi.setSystemTime(local("2026-03-10", hour));
      expect(todayISO()).toBe("2026-03-10");
      expect(tripDuration(trip("a", "2026-03-01"))).toBe(10);
      expect(daysUsedInWindow([trip("a", "2026-03-01")])).toBe(10);
    }
  });

  it("segnala un viaggio futuro che supererebbe il limite", () => {
    const future = trip("f", "2026-04-01", "2026-04-01");
    // 89 giorni + 1 futuro = 90: ok
    expect(findFutureConflicts([future], trip("c", "2026-01-02", "2026-03-31"))).toEqual([]);
    // 90 giorni + 1 futuro = 91: conflitto
    const conflicts = findFutureConflicts([future], trip("c", "2026-01-01", "2026-03-31"));
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].used).toBe(91);
  });

  it("proietta i giorni usati alla fine del viaggio in corso", () => {
    const trips = [trip("a", "2026-03-01", "2026-03-20")];
    expect(currentTripProjection(trips, local("2026-03-10"))).toEqual({
      used: 20,
      remaining: 70,
      exitISO: "2026-03-20",
    });
    expect(currentTripProjection(trips, local("2026-03-20"))).toBeNull();
  });

  it("caso reale: 90 giorni dal 15/04 al 13/07, controllo l'11/10", () => {
    const trips = [trip("a", "2026-04-15", "2026-07-13")];
    expect(tripDuration(trips[0])).toBe(90);
    expect(getComplianceStatus(trips, local("2026-10-11"))).toMatchObject({ level: "full", used: 90, remaining: 0 });
    // Il 15/04 esce dalla finestra il 12/10: da quel giorno si può rientrare
    expect(nextAvailableEntry(trips, local("2026-10-11"))).toBe("2026-10-12");
    expect(getComplianceStatus(trips, local("2026-10-12"))).toMatchObject({ level: "warning", used: 89 });
    // Entrando il 12/10 ogni giorno se ne libera uno: si può restare 90 giorni,
    // fino al 09/01/27 (quando il 13/07 esce dalla finestra)
    expect(simulateStay(trips, "2026-10-12")).toMatchObject({ daysAllowed: 90, maxExit: "2027-01-09" });
  });

  it("la simulazione tiene conto dei viaggi già pianificati più avanti", () => {
    // Viaggio pianificato dal 15/12 al 13/01 (30 giorni). Entrando il 12/10
    // si può restare al massimo 60 giorni, fino al 10/12: altrimenti nella
    // finestra che termina il 13/01 si supererebbero i 90 giorni.
    const planned = [trip("p", "2026-12-15", "2027-01-13")];
    expect(simulateStay(planned, "2026-10-12")).toMatchObject({
      daysAllowed: 60,
      maxExit: "2026-12-10",
      limitingTrip: planned[0],
    });
    expect(simulateStay([], "2026-10-12").limitingTrip).toBeNull();
    // Restando fino al 10/12 il viaggio pianificato resta valido
    expect(
      findFutureConflicts(planned, trip("s", "2026-10-12", "2026-12-10"))
    ).toEqual([]);
    expect(findFutureConflicts(planned, trip("s", "2026-10-12", "2026-12-11"))).toHaveLength(1);
  });

  it("il prossimo ingresso non compromette i viaggi pianificati", () => {
    // 60 giorni già fatti + 30 pianificati dal 01/12: in ottobre e novembre
    // non si può aggiungere nemmeno un giorno senza superare il limite il
    // 30/12. Il primo ingresso possibile è l'inizio del viaggio pianificato.
    const trips = [trip("a", "2026-08-01", "2026-09-29"), trip("p", "2026-12-01", "2026-12-30")];
    expect(daysUsedInWindow(trips, local("2026-12-30"))).toBe(90);
    expect(daysUsedInWindow(trips, local("2026-10-12"))).toBe(60);
    expect(nextAvailableEntry(trips, local("2026-10-12"))).toBe("2026-12-01");
  });

  it("trova il prossimo ingresso disponibile", () => {
    const trips = [trip("a", "2026-01-01", "2026-03-31")];
    expect(nextAvailableEntry([], local("2026-04-01"))).toBe("2026-04-01");
    // Il 1° gennaio esce dalla finestra il 30 giugno
    expect(nextAvailableEntry(trips, local("2026-04-01"))).toBe("2026-06-30");
  });

  it("simula quanto si può restare", () => {
    expect(simulateStay([], "2026-01-01")).toEqual({
      alreadyOverAtEntry: false,
      daysAllowed: 90,
      maxExit: "2026-03-31",
      limitingTrip: null,
    });
    const trips = [trip("a", "2026-01-01", "2026-01-30")]; // 30 giorni
    expect(simulateStay(trips, "2026-02-01")).toMatchObject({ daysAllowed: 60, maxExit: "2026-04-01" });
    expect(simulateStay([trip("a", "2026-01-01", "2026-03-31")], "2026-04-01")).toEqual({
      alreadyOverAtEntry: true,
      daysAllowed: 0,
      maxExit: null,
      limitingTrip: null,
    });
  });
});
