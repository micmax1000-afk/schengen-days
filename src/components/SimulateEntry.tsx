import { useState } from "react";
import { Trip, simulateStay } from "../utils/calculator";
import { useLanguage } from "../i18n/LanguageContext";

interface Props {
  trips: Trip[];
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

export default function SimulateEntry({ trips }: Props) {
  const { t } = useLanguage();
  const [entryDate, setEntryDate] = useState("");
  // Ricalcolato a ogni render: si aggiorna da solo quando cambia la data o
  // quando si aggiungono, modificano o eliminano viaggi.
  const result = entryDate ? simulateStay(trips, entryDate) : null;

  return (
    <section className="simulate">
      <h2 className="simulate__title">{t.simulateTitle}</h2>
      <p className="simulate__hint">{t.simulateHint}</p>
      <div className="simulate__form">
        <label>
          {t.simulateEntryLabel}
          <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
        </label>
      </div>

      {result && (
        <div className={`simulate__result${result.alreadyOverAtEntry ? " simulate__result--over" : ""}`}>
          <p>
            {result.alreadyOverAtEntry
              ? t.simulateOver(formatDate(entryDate))
              : t.simulateOk(formatDate(entryDate), formatDate(result.maxExit!), result.daysAllowed)}
          </p>
          {result.limitedByPlanned && <p className="simulate__planned-note">{t.limitedByPlanned}</p>}
        </div>
      )}
    </section>
  );
}
