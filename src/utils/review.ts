import { Capacitor } from "@capacitor/core";
import { InAppReview } from "@capacitor-community/in-app-review";

const ASKED_KEY = "schengen-days-review-asked";
/** Dopo quanti viaggi registrati chiedere una recensione (una sola volta). */
const TRIPS_BEFORE_ASKING = 3;

/**
 * Mostra la finestra ufficiale di Google Play per la recensione, una sola volta,
 * quando l'utente ha registrato abbastanza viaggi. Solo nell'app Android: sul sito
 * non fa nulla. Google stesso può decidere di non mostrarla.
 */
export async function maybeAskForReview(tripCount: number): Promise<void> {
  if (!Capacitor.isNativePlatform() || tripCount < TRIPS_BEFORE_ASKING) return;
  try {
    if (localStorage.getItem(ASKED_KEY)) return;
    localStorage.setItem(ASKED_KEY, new Date().toISOString());
    await InAppReview.requestReview();
  } catch {
    // Nessun problema se non è disponibile: l'app continua normalmente
  }
}
