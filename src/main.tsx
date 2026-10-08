import React from "react";
import ReactDOM from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "./App";
import { LanguageProvider } from "./i18n/LanguageContext";
import "./style.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>
);

if (Capacitor.isNativePlatform()) {
  // Dentro l'app nativa (Capacitor) i file più recenti sono già inclusi in
  // ogni nuovo aggiornamento scaricato dal Play Store: il service worker,
  // pensato per la versione web su GitHub Pages, qui non serve a nulla e,
  // se resta attivo da una versione precedente, può continuare a servire
  // pagine/script vecchi dalla sua cache anche dopo un aggiornamento
  // dell'app. Lo disattiviamo e ripuliamo ogni sua cache residua.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
  }
  if ("caches" in window) {
    caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
  }
} else if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}service-worker.js`)
      .catch((err) => console.error("Registrazione service worker fallita:", err));
  });
}
