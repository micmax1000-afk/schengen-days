import { Trip, tripDuration, sortTripsDesc, isOngoing, simulateStay, todayISO } from "../utils/calculator";
import { useLanguage } from "../i18n/LanguageContext";
import { dayCount } from "../i18n/plural";
import { exportReportPdf } from "../utils/exportPdf";
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
  const { t, lang, isRtl } = useLanguage();

  if (trips.length === 0) {
    return (
      <section className="trips">
        <h2 className="trips__title">{t.tripsTitle}</h2>
        <p className="trip-list__empty">{t.noTrips}</p>
      </section>
    );
  }

  const sorted = sortTripsDesc(trips);

  const renderTrip = (trip: Trip) => {
          const ongoing = isOngoing(trip);
          const planned = trip.entry > todayISO();
          const countdownLevel = remainingDays <= 3 ? "over" : remainingDays <= 20 ? "warning" : "ok";
          let deadlineISO: string | null = null;
          if (ongoing) {
            const others = trips.filter((t2) => t2.id !== trip.id);
            const sim = simulateStay(others, trip.entry);
            if (!sim.alreadyOverAtEntry) deadlineISO = sim.maxExit;
          }
          return (
            <li
              key={trip.id}
              className={`trip-list__item${planned ? " trip-list__item--planned" : ""}${
                editingId === trip.id ? " trip-list__item--editing" : ""
              }`}
            >
              <div className="trip-list__row">
                <span className="trip-list__main">
                  <span className="trip-list__dates">
                    {formatDate(trip.entry)} → {ongoing ? t.ongoingLabel : formatDate(trip.exit!)}
                  </span>
                  <span className="trip-list__meta">
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
                    <span className={`trip-list__days${ongoing ? " trip-list__days--ongoing" : ""}`}>
                      {dayCount(t, tripDuration(trip))}
                    </span>
                    {planned && <span className="trip-list__badge">{t.plannedLabel}</span>}
                  </span>
                </span>
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
                  {t.countdownPrefix} {dayCount(t, Math.max(0, remainingDays))}
                  {deadlineISO && ` (${t.countdownUntil} ${formatDate(deadlineISO)})`}
                </p>
              )}
              {trip.note && <p className="trip-list__note">{trip.note}</p>}
            </li>
          );
  };

  // Prima i viaggi in corso o futuri (dal più vicino), poi quelli passati (dal più recente)
  const today = todayISO();
  const isUpcoming = (tr: Trip) => !tr.exit || tr.exit >= today;
  const upcoming = sorted.filter(isUpcoming).reverse();
  const past = sorted.filter((tr) => !isUpcoming(tr));

  return (
    <section className="trips">
      <h2 className="trips__title">
        {t.tripsTitle} <span className="trips__count">{trips.length}</span>
        <button type="button" className="trips__pdf" onClick={() => exportReportPdf(trips, t, lang, isRtl)} title={t.exportPdf}>
          📄 PDF
        </button>
      </h2>
      {upcoming.length > 0 && (
        <>
          <h3 className="trips__group">{t.upcomingTrips}</h3>
          <ul className="trip-list">{upcoming.map(renderTrip)}</ul>
        </>
      )}
      {past.length > 0 && (
        <>
          <h3 className="trips__group">{t.pastTrips}</h3>
          <ul className="trip-list">{past.map(renderTrip)}</ul>
        </>
      )}
    </section>
  );
}
