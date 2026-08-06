import { useEffect, useState } from "react";
import { Trip } from "./calculator";

const STORAGE_KEY = "schengen-days-trips";

function load(): Trip[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Trip[]) : [];
  } catch {
    return [];
  }
}

export function useLocalTrips() {
  const [trips, setTrips] = useState<Trip[]>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
  }, [trips]);

  const addTrip = (
    entry: string,
    exit: string,
    entryCountry?: string,
    exitCountry?: string,
    note?: string
  ) => {
    const trip: Trip = { id: crypto.randomUUID(), entry, exit, entryCountry, exitCountry, note };
    setTrips((prev) => [...prev, trip]);
  };

  const removeTrip = (id: string) => {
    setTrips((prev) => prev.filter((t) => t.id !== id));
  };

  const updateTrip = (
    id: string,
    entry: string,
    exit: string,
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

  /** Valida e importa un backup. Restituisce true se riuscito, false se il file non è valido. */
  const importTrips = (json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      const incoming: unknown = Array.isArray(parsed) ? parsed : parsed?.trips;
      if (!Array.isArray(incoming)) return false;
      const valid = incoming.every(
        (t) =>
          t &&
          typeof t === "object" &&
          typeof t.entry === "string" &&
          typeof t.exit === "string"
      );
      if (!valid) return false;
      const normalized: Trip[] = incoming.map((t) => ({
        id: typeof t.id === "string" ? t.id : crypto.randomUUID(),
        entry: t.entry,
        exit: t.exit,
        // Compatibile anche con backup più vecchi che avevano un solo campo "country".
        entryCountry:
          typeof t.entryCountry === "string"
            ? t.entryCountry
            : typeof t.country === "string"
            ? t.country
            : undefined,
        exitCountry: typeof t.exitCountry === "string" ? t.exitCountry : undefined,
        note: typeof t.note === "string" ? t.note : undefined,
      }));
      setTrips(normalized);
      return true;
    } catch {
      return false;
    }
  };

  return { trips, addTrip, removeTrip, updateTrip, exportTrips, importTrips };
}
