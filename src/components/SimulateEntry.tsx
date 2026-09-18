import { useState, FormEvent } from "react";
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
  const [result, setResult] = useState<ReturnType<typeof simulateStay> | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!entryDate) return;
    setResult(simulateStay(trips, entryDate));
  };

  return (
    <section className="simulate">
      <h2 className="simulate__title">{t.simulateTitle}</h2>
      <p className="simulate__hint">{t.simulateHint}</p>
      <form className="simulate__form" onSubmit={handleSubmit}>
        <label>
          {t.simulateEntryLabel}
          <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} required />
        </label>
        <button type="submit">{t.simulateButton}</button>
      </form>

      {result && (
        <div className={`simulate__result${result.alreadyOverAtEntry ? " simulate__result--over" : ""}`}>
          <p>
            {result.alreadyOverAtEntry
              ? t.simulateOver(formatDate(entryDate))
              : t.simulateOk(formatDate(entryDate), formatDate(result.maxExit!), result.daysAllowed)}
          </p>
        </div>
      )}
    </section>
  );
}
