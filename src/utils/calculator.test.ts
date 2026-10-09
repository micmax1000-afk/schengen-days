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
    });
    const trips = [trip("a", "2026-01-01", "2026-01-30")]; // 30 giorni
    expect(simulateStay(trips, "2026-02-01")).toMatchObject({ daysAllowed: 60, maxExit: "2026-04-01" });
    expect(simulateStay([trip("a", "2026-01-01", "2026-03-31")], "2026-04-01")).toEqual({
      alreadyOverAtEntry: true,
      daysAllowed: 0,
      maxExit: null,
    });
  });
});
