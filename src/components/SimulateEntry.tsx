import { Trip, simulateStay, nextAvailableEntry, checkTrip, isValidTrip, tripDuration } from "../utils/calculator";
import { useLanguage } from "../i18n/LanguageContext";

interface Props {
  trips: Trip[];
  entryDate: string;
  exitDate: string;
  onChange: (entry: string, exit: string) => void;
  /** Salva il viaggio simulato tra i viaggi pianificati. */
  onAddPlanned: (entry: string, exit: string) => void;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

export default function SimulateEntry({ trips, entryDate, exitDate, onChange, onAddPlanned }: Props) {
  const { t } = useLanguage();
  // Ricalcolato a ogni render: si aggiorna da solo quando cambiano le date o
  // quando si aggiungono, modificano o eliminano viaggi.
  const stay = entryDate ? simulateStay(trips, entryDate) : null;
  const exitValid = Boolean(entryDate && exitDate && isValidTrip(entryDate, exitDate));
  const check = exitValid ? checkTrip(trips, entryDate, exitDate) : null;
  const days = exitValid ? tripDuration({ id: "", entry: entryDate, exit: exitDate }) : 0;

  // Se la data è la stessa del "prossimo ingresso" del riepilogo, la nota sul
  // viaggio pianificato è già mostrata lì: non la ripetiamo.
  const showPlannedNote =
    Boolean(stay?.limitingTrip) && (!check || !check.ok) && entryDate !== nextAvailableEntry(trips);

  const over = Boolean(stay?.alreadyOverAtEntry || (check && !check.ok));

  let message: string | null = null;
  if (stay?.alreadyOverAtEntry) message = t.simulateOver(formatDate(entryDate));
  else if (check?.ok) message = t.simulateTripOk(days, formatDate(exitDate), check.usedAtExit);
  else if (check && stay?.maxExit) message = t.simulateTripOver(formatDate(stay.maxExit), stay.daysAllowed);
  else if (stay?.maxExit) message = t.simulateOk(formatDate(entryDate), formatDate(stay.maxExit), stay.daysAllowed);

  return (
    <section className="simulate">
      <h2 className="simulate__title">{t.simulateTitle}</h2>
      <p className="simulate__hint">{t.simulateHint}</p>
      <div className="simulate__form">
        <label>
          {t.simulateEntryLabel}
          <input type="date" value={entryDate} onChange={(e) => onChange(e.target.value, exitDate)} />
        </label>
        <label>
          {t.simulateExitLabel}
          <input
            type="date"
            value={exitDate}
            min={entryDate || undefined}
            onChange={(e) => onChange(entryDate, e.target.value)}
          />
        </label>
      </div>

      {entryDate && exitDate && !exitValid && <p className="trip-form__error">{t.errorExitBeforeEntry}</p>}

      {message && (
        <div className={`simulate__result${over ? " simulate__result--over" : ""}`}>
          <p>{message}</p>
          {showPlannedNote && stay?.limitingTrip && (
            <p className="simulate__planned-note">
              <span aria-hidden="true">📅</span>
              {t.limitedByPlanned(formatDate(stay.limitingTrip.entry), formatDate(stay.limitingTrip.exit!))}
            </p>
          )}
        </div>
      )}

      {check?.ok && (
        <button type="button" className="simulate__add" onClick={() => onAddPlanned(entryDate, exitDate)}>
          {t.addAsPlanned}
        </button>
      )}
    </section>
  );
}
