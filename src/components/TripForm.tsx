import { useState, useEffect, FormEvent } from "react";
import { isValidTrip, Trip, findFutureConflicts } from "../utils/calculator";
import { useLanguage } from "../i18n/LanguageContext";
import { SCHENGEN_COUNTRIES, flagImageUrl } from "../data/schengenCountries";

interface Props {
  trips: Trip[];
  onAdd: (entry: string, exit: string | undefined, entryCountry?: string, exitCountry?: string, note?: string) => void;
  editingTrip?: Trip | null;
  onUpdate?: (
    id: string,
    entry: string,
    exit: string | undefined,
    entryCountry?: string,
    exitCountry?: string,
    note?: string
  ) => void;
  onCancelEdit?: () => void;
}

function formatPreviewDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

export default function TripForm({ trips, onAdd, editingTrip, onUpdate, onCancelEdit }: Props) {
  const { t } = useLanguage();
  const [entry, setEntry] = useState("");
  const [exit, setExit] = useState("");
  const [entryCountry, setEntryCountry] = useState("");
  const [exitCountry, setExitCountry] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const conflicts =
    entry && exit && isValidTrip(entry, exit)
      ? findFutureConflicts(trips, { id: editingTrip?.id ?? "__new__", entry, exit })
      : [];

  useEffect(() => {
    if (editingTrip) {
      setEntry(editingTrip.entry);
      setExit(editingTrip.exit ?? "");
      setEntryCountry(editingTrip.entryCountry ?? "");
      setExitCountry(editingTrip.exitCountry ?? "");
      setNote(editingTrip.note ?? "");
      setError(null);
    }
  }, [editingTrip]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!entry) {
      setError(t.errorBothDates);
      return;
    }
    if (!isValidTrip(entry, exit || undefined)) {
      setError(t.errorExitBeforeEntry);
      return;
    }
    const entryC = entryCountry || undefined;
    const exitC = exitCountry || undefined;
    const exitValue = exit || undefined;
    const noteValue = note.trim() || undefined;
    if (editingTrip && onUpdate) {
      onUpdate(editingTrip.id, entry, exitValue, entryC, exitC, noteValue);
    } else {
      onAdd(entry, exitValue, entryC, exitC, noteValue);
    }
    setEntry("");
    setExit("");
    setEntryCountry("");
    setExitCountry("");
    setNote("");
    setError(null);
  };

  const handleCancel = () => {
    setEntry("");
    setExit("");
    setEntryCountry("");
    setExitCountry("");
    setNote("");
    setError(null);
    onCancelEdit?.();
  };

  return (
    <form className="trip-form" onSubmit={handleSubmit}>
      <div className="trip-form__fields">
        <div className="trip-form__column">
          <label>
            {t.entryDate}
            <input type="date" value={entry} onChange={(e) => setEntry(e.target.value)} required />
          </label>
          <label>
            {t.entryCountry}
            <span className="trip-form__country-row">
              {entryCountry && (
                <img src={flagImageUrl(entryCountry)} alt={entryCountry} width={20} height={20} className="trip-form__flag-preview" />
              )}
              <select value={entryCountry} onChange={(e) => setEntryCountry(e.target.value)}>
                <option value="">{t.countryPlaceholder}</option>
                {SCHENGEN_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </span>
          </label>
        </div>
        <div className="trip-form__column">
          <label>
            {t.exitDate} <span className="trip-form__optional">({t.ongoingHint})</span>
            <input type="date" value={exit} onChange={(e) => setExit(e.target.value)} />
          </label>
          <label>
            {t.exitCountry}
            <span className="trip-form__country-row">
              {exitCountry && (
                <img src={flagImageUrl(exitCountry)} alt={exitCountry} width={20} height={20} className="trip-form__flag-preview" />
              )}
              <select value={exitCountry} onChange={(e) => setExitCountry(e.target.value)}>
                <option value="">{t.countryPlaceholder}</option>
                {SCHENGEN_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </span>
          </label>
        </div>
      </div>
      <div className="trip-form__fields">
        <label className="trip-form__note-label">
          {t.note}
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t.notePlaceholder}
            maxLength={140}
          />
        </label>
      </div>
      {(entry || exit || entryCountry || exitCountry) && (
        <div className="trip-form__preview">
          <span className="trip-form__preview-side">
            {entryCountry && (
              <img src={flagImageUrl(entryCountry)} alt={entryCountry} width={18} height={18} />
            )}
            <span>
              {SCHENGEN_COUNTRIES.find((c) => c.code === entryCountry)?.name}
              {entryCountry && entry ? " · " : ""}
              {formatPreviewDate(entry)}
            </span>
          </span>
          <span className="trip-form__preview-arrow">—</span>
          <span className="trip-form__preview-side">
            {exitCountry && (
              <img src={flagImageUrl(exitCountry)} alt={exitCountry} width={18} height={18} />
            )}
            <span>
              {SCHENGEN_COUNTRIES.find((c) => c.code === exitCountry)?.name}
              {exitCountry && exit ? " · " : ""}
              {formatPreviewDate(exit)}
            </span>
          </span>
        </div>
      )}
      {conflicts.length > 0 && (
        <div className="trip-form__conflict">
          {conflicts.map(({ trip, used }) => (
            <p key={trip.id}>
              {t.futureConflictWarning(formatPreviewDate(trip.entry), formatPreviewDate(trip.exit!), used)}
            </p>
          ))}
        </div>
      )}
      {error && <p className="trip-form__error">{error}</p>}
      <div className="trip-form__actions">
        <button type="submit">{editingTrip ? t.saveChanges : t.add}</button>
        {editingTrip && (
          <button type="button" className="trip-form__cancel" onClick={handleCancel}>
            {t.cancel}
          </button>
        )}
      </div>
    </form>
  );
}
