import { useEffect, useState } from "react";
import Header from "./components/Header";
import TripForm from "./components/TripForm";
import QuickBorder from "./components/QuickBorder";
import TripList from "./components/TripList";
import Summary from "./components/Summary";
import CalendarView from "./components/CalendarView";
import SimulateEntry from "./components/SimulateEntry";
import BackupControls from "./components/BackupControls";
import { useLocalTrips } from "./utils/useLocalTrips";
import { getComplianceStatus, simulateStay, isValidTrip, Trip } from "./utils/calculator";
import { useLanguage } from "./i18n/LanguageContext";
import { APP_VERSION } from "./version";
import { maybeAskForReview } from "./utils/review";

/** Informativa sulla privacy pubblicata sul sito Netlify (repository micmax-apps-site). */
const PRIVACY_URL = "https://micmax-apps.netlify.app/privacy-schengen";

export default function App() {
  const { trips, addTrip, removeTrip, updateTrip, exportTrips, importTrips } = useLocalTrips();
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  // Conferma breve dopo "entrato/uscito oggi", con possibilità di annullare
  const [toast, setToast] = useState<{ text: string; undo: () => void } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);
  const showToast = (text: string, undo: () => void) => setToast({ text, undo });
  const fmt = (iso: string) => iso.split("-").reverse().map((p, i) => (i === 2 ? p.slice(2) : p)).join("/");

  // Chiede una recensione su Google Play una sola volta, dopo qualche viaggio registrato
  useEffect(() => {
    void maybeAskForReview(trips.length);
  }, [trips.length]);
  // Viaggio simulato: condiviso tra la simulazione e il calendario
  const [simEntry, setSimEntry] = useState("");
  const [simExit, setSimExit] = useState("");
  const status = getComplianceStatus(trips);
  const { t } = useLanguage();

  const handleEdit = (trip: Trip) => setEditingTrip(trip);
  const handleCancelEdit = () => setEditingTrip(null);
  const handleUpdate = (
    id: string,
    entry: string,
    exit: string | undefined,
    entryCountry?: string,
    exitCountry?: string,
    note?: string
  ) => {
    updateTrip(id, entry, exit, entryCountry, exitCountry, note);
    setEditingTrip(null);
  };
  const handleSimChange = (entry: string, exit: string) => {
    setSimEntry(entry);
    setSimExit(exit);
  };
  const handleAddPlanned = (entry: string, exit: string) => {
    addTrip(entry, exit);
    setSimEntry("");
    setSimExit("");
  };
  // Giorni da evidenziare nel calendario: il viaggio simulato con la sua
  // uscita, oppure (solo ingresso) fino all'uscita massima consentita.
  const simRange = (() => {
    if (!simEntry) return null;
    if (simExit) return isValidTrip(simEntry, simExit) ? { entry: simEntry, exit: simExit } : null;
    const stay = simulateStay(trips, simEntry);
    return stay.maxExit ? { entry: simEntry, exit: stay.maxExit } : null;
  })();

  const handleRemove = (id: string) => {
    if (editingTrip?.id === id) setEditingTrip(null);
    removeTrip(id);
  };

  return (
    <div className="app">
      <Header />
      <main className="app__main">
        <Summary status={status} trips={trips} />
        {trips.length === 0 && (
          <section className="welcome">
            <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" />
            <div>
              <h2>{t.welcomeTitle}</h2>
              <p>{t.welcomeText}</p>
            </div>
          </section>
        )}
        <QuickBorder
          trips={trips}
          onEnter={(today) => {
            const id = addTrip(today, undefined);
            showToast(`✓ ${t.toastEntered(fmt(today))}`, () => removeTrip(id));
          }}
          onExit={(trip, today) => {
            updateTrip(trip.id, trip.entry, today, trip.entryCountry, trip.exitCountry, trip.note);
            showToast(`✓ ${t.toastExited(fmt(today))}`, () =>
              updateTrip(trip.id, trip.entry, undefined, trip.entryCountry, trip.exitCountry, trip.note)
            );
          }}
        />
        <TripForm
          trips={trips}
          onAdd={addTrip}
          editingTrip={editingTrip}
          onUpdate={handleUpdate}
          onCancelEdit={handleCancelEdit}
        />
        <TripList
          trips={trips}
          onRemove={handleRemove}
          onEdit={handleEdit}
          editingId={editingTrip?.id}
          remainingDays={status.remaining}
        />
        <SimulateEntry
          trips={trips}
          entryDate={simEntry}
          exitDate={simExit}
          onChange={handleSimChange}
          onAddPlanned={handleAddPlanned}
        />
        <CalendarView trips={trips} simulated={simRange} />
        <p className="app__notice">⚠️ {t.disclaimer}</p>
        <BackupControls exportTrips={exportTrips} importTrips={importTrips} />
      </main>
      {toast && (
        <div className="toast" role="status">
          <span>{toast.text}</span>
          <button
            type="button"
            onClick={() => {
              toast.undo();
              setToast(null);
            }}
          >
            {t.cancel}
          </button>
        </div>
      )}
      <footer className="app__footer">
        <p>{t.footerNote}</p>
        <details className="app__legal">
          <summary>{t.legalTitle}</summary>
          <p>{t.liabilityDisclaimer}</p>
        </details>

        <div className="app__sources">
          <p className="app__sources-title">{t.officialSourcesTitle}</p>
          <ul className="app__sources-list">
            <li>
              <a
                href="https://home-affairs.ec.europa.eu/policies/schengen/schengen-area_en"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.officialSourceSchengenArea}
              </a>
            </li>
            <li>
              <a
                href="https://eur-lex.europa.eu/eli/reg/2016/399/oj"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.officialSourceRegulation}
              </a>
            </li>
            <li>
              <a
                href="https://ec.europa.eu/assets/home/visa-calculator/calculator.htm?lang=en"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.officialCalculatorLink}
              </a>
            </li>
            <li>
              <a
                href="https://travel-europe.europa.eu/en/ees"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.officialSourceEES}
              </a>
            </li>
          </ul>
        </div>

        <p>
          {/* Indirizzo completo: un link relativo nell'app Android punterebbe a un
              file interno all'app invece che alla pagina pubblicata */}
          <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">
            {t.privacyLink}
          </a>
        </p>
        <p className="app__version">v{APP_VERSION}</p>
      </footer>
    </div>
  );
}
