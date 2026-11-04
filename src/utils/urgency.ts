import { Trip, simulateStay, todayISO } from "./calculator";

export type Urgency = "ok" | "warning" | "full" | "over";

/** Colore secondo quanto manca alla data limite: blu, poi giallo, arancione, rosso. */
export function urgencyFor(daysLeft: number): Urgency {
  if (daysLeft <= 3) return "over";
  if (daysLeft <= 7) return "full";
  if (daysLeft <= 20) return "warning";
  return "ok";
}

/** Viaggio in corso, data limite per uscire e giorni che mancano (oggi incluso). */
export function ongoingDeadline(trips: Trip[], today: string = todayISO()) {
  const ongoing = trips.find((tr) => !tr.exit && tr.entry <= today);
  if (!ongoing) return null;
  const stay = simulateStay(trips.filter((tr) => tr.id !== ongoing.id), ongoing.entry);
  const daysLeft = stay.maxExit
    ? Math.max(0, Math.round((Date.parse(stay.maxExit) - Date.parse(today)) / 86400000) + 1)
    : 0;
  return { ongoing, stay, daysLeft, urgency: urgencyFor(daysLeft) };
}
