import { useEffect, useState } from "react";
import { Trip, isValidTrip } from "./calculator";

const OLD_TRIPS_KEY = "schengen-days-trips";
const PROFILES_KEY = "schengen-days-profiles";
const DEFAULT_PROFILE_NAME = "Principale";

export interface Profile {
  id: string;
  name: string;
  trips: Trip[];
}

interface ProfilesState {
  profiles: Profile[];
  activeProfileId: string;
}

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function load(): ProfilesState {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ProfilesState;
      if (parsed && Array.isArray(parsed.profiles) && parsed.profiles.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignora e passa alla migrazione
  }

  // Migrazione: se esistono viaggi salvati dalla versione precedente
  // (senza profili), li spostiamo in un primo profilo "Principale".
  let migratedTrips: Trip[] = [];
  try {
    const oldRaw = localStorage.getItem(OLD_TRIPS_KEY);
    if (oldRaw) migratedTrips = JSON.parse(oldRaw) as Trip[];
  } catch {
    migratedTrips = [];
  }

  const defaultProfile: Profile = { id: uid(), name: DEFAULT_PROFILE_NAME, trips: migratedTrips };
  return { profiles: [defaultProfile], activeProfileId: defaultProfile.id };
}

export function useProfiles() {
  const [state, setState] = useState<ProfilesState>(load);

  useEffect(() => {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(state));
  }, [state]);

  const activeProfile =
    state.profiles.find((p) => p.id === state.activeProfileId) ?? state.profiles[0];
  const trips = activeProfile ? activeProfile.trips : [];

  const updateActiveTrips = (updater: (trips: Trip[]) => Trip[]) => {
    setState((prev) => ({
      ...prev,
      profiles: prev.profiles.map((p) =>
        p.id === prev.activeProfileId ? { ...p, trips: updater(p.trips) } : p
      ),
    }));
  };

  const addTrip = (
    entry: string,
    exit: string | undefined,
    entryCountry?: string,
    exitCountry?: string,
    note?: string
  ) => {
    const trip: Trip = { id: uid(), entry, exit, entryCountry, exitCountry, note };
    updateActiveTrips((trips) => [...trips, trip]);
  };

  const removeTrip = (id: string) => {
    updateActiveTrips((trips) => trips.filter((t) => t.id !== id));
  };

  const updateTrip = (
    id: string,
    entry: string,
    exit: string | undefined,
    entryCountry?: string,
    exitCountry?: string,
    note?: string
  ) => {
    updateActiveTrips((trips) =>
      trips.map((t) => (t.id === id ? { ...t, entry, exit, entryCountry, exitCountry, note } : t))
    );
  };

  const setActiveProfileId = (id: string) => {
    setState((prev) => (prev.profiles.some((p) => p.id === id) ? { ...prev, activeProfileId: id } : prev));
  };

  const addProfile = (name: string) => {
    const profile: Profile = { id: uid(), name: name.trim() || DEFAULT_PROFILE_NAME, trips: [] };
    setState((prev) => ({ profiles: [...prev.profiles, profile], activeProfileId: profile.id }));
  };

  const renameProfile = (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setState((prev) => ({
      ...prev,
      profiles: prev.profiles.map((p) => (p.id === id ? { ...p, name: trimmed } : p)),
    }));
  };

  const deleteProfile = (id: string) => {
    setState((prev) => {
      if (prev.profiles.length <= 1) return prev; // deve restarne sempre almeno uno
      const profiles = prev.profiles.filter((p) => p.id !== id);
      const activeProfileId = prev.activeProfileId === id ? profiles[0].id : prev.activeProfileId;
      return { profiles, activeProfileId };
    });
  };

  const exportAll = (): string => {
    return JSON.stringify(
      { app: "schengen-days-calculator", version: 3, exportedAt: new Date().toISOString(), profiles: state.profiles },
      null,
      2
    );
  };

  /** Valida e importa un backup. Supporta sia il nuovo formato con profili
   *  multipli sia i backup più vecchi (un unico elenco di viaggi). */
  const importAll = (json: string): boolean => {
    try {
      const parsed = JSON.parse(json);

      // Formato nuovo: { profiles: [...] }
      if (parsed && Array.isArray(parsed.profiles) && parsed.profiles.length > 0) {
        const validProfiles = parsed.profiles.every(
          (p: unknown) =>
            p &&
            typeof p === "object" &&
            typeof (p as Profile).name === "string" &&
            Array.isArray((p as Profile).trips)
        );
        if (!validProfiles) return false;
        const normalized: Profile[] = parsed.profiles.map((p: Profile) => ({
          id: typeof p.id === "string" ? p.id : uid(),
          name: p.name,
          trips: normalizeTrips(p.trips),
        }));
        setState({ profiles: normalized, activeProfileId: normalized[0].id });
        return true;
      }

      // Formato vecchio: { trips: [...] } oppure semplice array
      const incoming: unknown = Array.isArray(parsed) ? parsed : parsed?.trips;
      if (!Array.isArray(incoming)) return false;
      const trips = normalizeTrips(incoming);
      const profile: Profile = { id: uid(), name: DEFAULT_PROFILE_NAME, trips };
      setState({ profiles: [profile], activeProfileId: profile.id });
      return true;
    } catch {
      return false;
    }
  };

  return {
    profiles: state.profiles,
    activeProfileId: activeProfile?.id ?? "",
    activeProfileName: activeProfile?.name ?? "",
    setActiveProfileId,
    addProfile,
    renameProfile,
    deleteProfile,
    trips,
    addTrip,
    removeTrip,
    updateTrip,
    exportAll,
    importAll,
  };
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
