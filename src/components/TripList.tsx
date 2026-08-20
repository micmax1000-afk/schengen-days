import { Trip, tripDuration, sortTripsDesc, isOngoing } from "../utils/calculator";
import { useLanguage } from "../i18n/LanguageContext";
import { flagImageUrl } from "../data/schengenCountries";

interface Props {
  trips: Trip[];
  onRemove: (id: string) => void;
  onEdit: (trip: Trip) => void;
  editingId?: string | null;
  /** Giorni rimanenti attuali (calcolati sull'insieme di tutti i viaggi), usati per il conto alla rovescia del viaggio in corso. */
  remainingDays: number;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

export default function TripList({ trips, onRemove, onEdit, editingId, remainingDays }: Props) {
  const { t } = useLanguage();

  if (trips.length === 0) {
    return <p className="trip-list__empty">{t.noTrips}</p>;
  }

  const sorted = sortTripsDesc(trips);

  return (
    <ul className="trip-list">
      {sorted.map((trip) => {
        const ongoing = isOngoing(trip);
        const countdownLevel = remainingDays <= 3 ? "over" : remainingDays <= 20 ? "warning" : "ok";
        return (
          <li
            key={trip.id}
            className={`trip-list__item${editingId === trip.id ? " trip-list__item--editing" : ""}`}
          >
            <div className="trip-list__row">
              {(trip.entryCountry || trip.exitCountry) && (
                <span className="trip-list__flags">
                  {trip.entryCountry && (
                    <img className="trip-list__flag" src={flagImageUrl(trip.entryCountry)} alt={trip.entryCountry} width={20} height={20} />
                  )}
                  {trip.exitCountry && trip.exitCountry !== trip.entryCountry && (
                    <>
                      <span className="trip-list__flag-arrow">→</span>
                      <img className="trip-list__flag" src={flagImageUrl(trip.exitCountry)} alt={trip.exitCountry} width={20} height={20} />
                    </>
                  )}
                </span>
              )}
              <span className="trip-list__dates">
                {formatDate(trip.entry)} → {ongoing ? t.ongoingLabel : formatDate(trip.exit!)}
              </span>
              <span className="trip-list__days">{tripDuration(trip)} {t.daysUnit}</span>
              <button className="trip-list__edit" onClick={() => onEdit(trip)} aria-label={t.editTrip}>
                ✎
              </button>
              <button
                className="trip-list__remove"
                onClick={() => onRemove(trip.id)}
                aria-label={t.deleteTrip}
              >
                ✕
              </button>
            </div>
            {ongoing && (
              <p className={`trip-list__countdown trip-list__countdown--${countdownLevel}`}>
                {t.countdownPrefix} {Math.max(0, remainingDays)} {t.daysUnit}
              </p>
            )}
            {trip.note && <p className="trip-list__note">{trip.note}</p>}
          </li>
        );
      })}
    </ul>
  );
}
