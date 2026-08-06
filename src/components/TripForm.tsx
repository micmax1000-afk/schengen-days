import { useState, useEffect, FormEvent } from "react";
import { isValidTrip, Trip } from "../utils/calculator";
import { useLanguage } from "../i18n/LanguageContext";
import { SCHENGEN_COUNTRIES } from "../data/schengenCountries";

interface Props {
  onAdd: (entry: string, exit: string, country?: string, note?: string) => void;
  editingTrip?: Trip | null;
  onUpdate?: (id: string, entry: string, exit: string, country?: string, note?: string) => void;
  onCancelEdit?: () => void;
}

export default function TripForm({ onAdd, editingTrip, onUpdate, onCancelEdit }: Props) {
  const { t } = useLanguage();
  const [entry, setEntry] = useState("");
  const [exit, setExit] = useState("");
  const [country, setCountry] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingTrip) {
      setEntry(editingTrip.entry);
      setExit(editingTrip.exit);
      setCountry(editingTrip.country ?? "");
      setNote(editingTrip.note ?? "");
      setError(null);
    }
  }, [editingTrip]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!entry || !exit) {
      setError(t.errorBothDates);
      return;
    }
    if (!isValidTrip(entry, exit)) {
      setError(t.errorExitBeforeEntry);
      return;
    }
    const countryValue = country || undefined;
    const noteValue = note.trim() || undefined;
    if (editingTrip && onUpdate) {
      onUpdate(editingTrip.id, entry, exit, countryValue, noteValue);
    } else {
      onAdd(entry, exit, countryValue, noteValue);
    }
    setEntry("");
    setExit("");
    setCountry("");
    setNote("");
    setError(null);
  };

  const handleCancel = () => {
    setEntry("");
    setExit("");
    setCountry("");
    setNote("");
    setError(null);
    onCancelEdit?.();
  };

  return (
    <form className="trip-form" onSubmit={handleSubmit}>
      <div className="trip-form__fields">
        <label>
          {t.entryDate}
          <input type="date" value={entry} onChange={(e) => setEntry(e.target.value)} required />
        </label>
        <label>
          {t.exitDate}
          <input type="date" value={exit} onChange={(e) => setExit(e.target.value)} required />
        </label>
      </div>
      <div className="trip-form__fields">
        <label>
          {t.country}
          <select value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">{t.countryPlaceholder}</option>
            {SCHENGEN_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
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
