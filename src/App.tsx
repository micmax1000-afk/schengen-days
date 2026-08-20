import { useState } from "react";
import Header from "./components/Header";
import TripForm from "./components/TripForm";
import TripList from "./components/TripList";
import Summary from "./components/Summary";
import CalendarView from "./components/CalendarView";
import SimulateEntry from "./components/SimulateEntry";
import BackupControls from "./components/BackupControls";
import ProfileSwitcher from "./components/ProfileSwitcher";
import { useProfiles } from "./utils/useProfiles";
import { getComplianceStatus, Trip } from "./utils/calculator";
import { useLanguage } from "./i18n/LanguageContext";

export default function App() {
  const {
    trips,
    addTrip,
    removeTrip,
    updateTrip,
    exportAll,
    importAll,
    profiles,
    activeProfileId,
    setActiveProfileId,
    addProfile,
    renameProfile,
    deleteProfile,
  } = useProfiles();
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
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
  const handleRemove = (id: string) => {
    if (editingTrip?.id === id) setEditingTrip(null);
    removeTrip(id);
  };
  const handleSwitchProfile = (id: string) => {
    setActiveProfileId(id);
    setEditingTrip(null);
  };

  return (
    <div className="app">
      <Header />
      <main className="app__main">
        <ProfileSwitcher
          profiles={profiles}
          activeProfileId={activeProfileId}
          onSwitch={handleSwitchProfile}
          onAdd={addProfile}
          onRename={renameProfile}
          onDelete={deleteProfile}
        />
        <Summary status={status} trips={trips} />
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
        <CalendarView trips={trips} />
        <SimulateEntry trips={trips} />
        <BackupControls exportTrips={exportAll} importTrips={importAll} />
      </main>
      <footer className="app__footer">
        <p>{t.footerNote}</p>
        <p className="app__disclaimer">{t.disclaimer}</p>
        <p className="app__disclaimer">{t.liabilityDisclaimer}</p>
        <p>
          <a
            href="https://ec.europa.eu/assets/home/visa-calculator/calculator.htm?lang=en"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.officialCalculatorLink}
          </a>
          {" · "}
          <a href="privacy.html" target="_blank" rel="noopener noreferrer">
            {t.privacyLink}
          </a>
        </p>
      </footer>
    </div>
  );
}
