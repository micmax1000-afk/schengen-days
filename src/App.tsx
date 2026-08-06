import { useState } from "react";
import Header from "./components/Header";
import TripForm from "./components/TripForm";
import TripList from "./components/TripList";
import Summary from "./components/Summary";
import CalendarView from "./components/CalendarView";
import SimulateEntry from "./components/SimulateEntry";
import BackupControls from "./components/BackupControls";
import { useLocalTrips } from "./utils/useLocalTrips";
import { getComplianceStatus, Trip } from "./utils/calculator";
import { useLanguage } from "./i18n/LanguageContext";

export default function App() {
  const { trips, addTrip, removeTrip, updateTrip, exportTrips, importTrips } = useLocalTrips();
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const status = getComplianceStatus(trips);
  const { t } = useLanguage();

  const handleEdit = (trip: Trip) => setEditingTrip(trip);
  const handleCancelEdit = () => setEditingTrip(null);
  const handleUpdate = (
    id: string,
    entry: string,
    exit: string,
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

  return (
    <div className="app">
      <Header />
      <main className="app__main">
        <Summary status={status} />
        <TripForm
          onAdd={addTrip}
          editingTrip={editingTrip}
          onUpdate={handleUpdate}
          onCancelEdit={handleCancelEdit}
        />
        <TripList trips={trips} onRemove={handleRemove} onEdit={handleEdit} editingId={editingTrip?.id} />
        <CalendarView trips={trips} />
        <SimulateEntry trips={trips} />
        <BackupControls exportTrips={exportTrips} importTrips={importTrips} />
      </main>
      <footer className="app__footer">
        <p>{t.footerNote}</p>
      </footer>
    </div>
  );
}
