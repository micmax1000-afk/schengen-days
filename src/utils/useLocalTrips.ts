import { useEffect, useState } from "react";
import { Trip, isValidTrip } from "./calculator";

const TRIPS_KEY = "schengen-days-trips";
const PROFILES_KEY = "schengen-days-profiles"; // formato precedente, con profili multipli

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/** Carica i viaggi salvati. Se erano presenti più profili (versione
 *  precedente dell'app), li unisce tutti in un'unica lista, senza
 *  perdere alcun dato già registrato dagli utenti. */
function load(): Trip[] {
  try {
    const profilesRaw = localStorage.getItem(PROFILES_KEY);
    if (profilesRaw) {
      const parsed = JSON.parse(profilesRaw) as { profiles?: { trips: Trip[] }[] };
      if (parsed && Array.isArray(parsed.profiles)) {
        const merged: Trip[] = [];
        const seenIds = new Set<string>();
        for (const profile of parsed.profiles) {
          for (const trip of profile.trips ?? []) {
            const id = seenIds.has(trip.id) ? uid() : trip.id;
            seenIds.add(id);
            merged.push({ ...trip, id });
          }
        }
        return merged;
      }
    }
  } catch {
    // ignora e passa al formato standard
  }

  try {
    const raw = localStorage.getItem(TRIPS_KEY);
    return raw ? (JSON.parse(raw) as Trip[]) : [];
  } catch {
    return [];
  }
}

export function useLocalTrips() {
  const [trips, setTrips] = useState<Trip[]>(load);

  useEffect(() => {
    localStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
    // Ripulisce il vecchio formato a profili, ora migrato
    localStorage.removeItem(PROFILES_KEY);
  }, [trips]);

  const addTrip = (
    entry: string,
    exit: string | undefined,
    entryCountry?: string,
    exitCountry?: string,
    note?: string
  ) => {
    const trip: Trip = { id: uid(), entry, exit, entryCountry, exitCountry, note };
    setTrips((prev) => [...prev, trip]);
  };

  const removeTrip = (id: string) => {
    setTrips((prev) => prev.filter((t) => t.id !== id));
  };

  const updateTrip = (
    id: string,
    entry: string,
    exit: string | undefined,
    entryCountry?: string,
    exitCountry?: string,
    note?: string
  ) => {
    setTrips((prev) =>
      prev.map((t) => (t.id === id ? { ...t, entry, exit, entryCountry, exitCountry, note } : t))
    );
  };

  const exportTrips = (): string => {
    return JSON.stringify(
      { app: "schengen-days-calculator", version: 2, exportedAt: new Date().toISOString(), trips },
      null,
      2
    );
  };

  /** Valida e importa un backup. Supporta anche i vecchi formati
   *  (con profili multipli, o con un solo campo "country"). */
  const importTrips = (json: string): boolean => {
    try {
      const parsed = JSON.parse(json);

      // Vecchio formato con profili multipli: unisce tutti i viaggi
      if (parsed && Array.isArray(parsed.profiles)) {
        const merged: unknown[] = [];
        for (const profile of parsed.profiles) {
          if (Array.isArray(profile.trips)) merged.push(...profile.trips);
        }
        const normalized = normalizeTrips(merged);
        if (normalized.length === 0 && merged.length > 0) return false;
        setTrips(normalized);
        return true;
      }

      const incoming: unknown = Array.isArray(parsed) ? parsed : parsed?.trips;
      if (!Array.isArray(incoming)) return false;
      const normalized = normalizeTrips(incoming);
      setTrips(normalized);
      return true;
    } catch {
      return false;
    }
  };

  return { trips, addTrip, removeTrip, updateTrip, exportTrips, importTrips };
}

function normalizeTrips(incoming: unknown[]): Trip[] {
  return incoming
    .filter(
      (t): t is Record<string, unknown> =>
        Boolean(t) && typeof t === "object" && typeof (t as Record<string, unknown>).entry === "string"
    )
    .map((t) => ({
      id: typeof t.id === "string" ? t.id : uid(),
      entry: t.entry as string,
      exit: typeof t.exit === "string" && t.exit ? t.exit : undefined,
      entryCountry:
        typeof t.entryCountry === "string"
          ? t.entryCountry
          : typeof t.country === "string"
          ? t.country
          : undefined,
      exitCountry: typeof t.exitCountry === "string" ? t.exitCountry : undefined,
      note: typeof t.note === "string" ? t.note : undefined,
    }))
    .filter((t) => isValidTrip(t.entry, t.exit));
}
