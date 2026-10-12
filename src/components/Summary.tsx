import { ComplianceStatus, Trip, nextAvailableEntry, plannedDaysAfter, todayISO as getTodayISO, currentTripProjection, simulateStay } from "../utils/calculator";
import { useLanguage } from "../i18n/LanguageContext";

interface Props {
  status: ComplianceStatus;
  trips: Trip[];
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function Summary({ status, trips }: Props) {
  const { t } = useLanguage();

  const LABELS: Record<ComplianceStatus["level"], { icon: string; text: string }> = {
    ok: { icon: "🟢", text: t.statusOk },
    warning: { icon: "🟡", text: t.statusWarning },
    full: { icon: "🟠", text: t.statusFull },
    over: { icon: "🔴", text: t.statusOver },
  };

  const { icon, text } = LABELS[status.level];
  const remainingClamped = Math.max(0, Math.min(90, status.remaining));
  // Senza giorni rimasti il cerchio si mostra pieno nel colore dello stato
  // (arancione = limite raggiunto, rosso = superato), invece che vuoto.
  const fraction = remainingClamped === 0 ? 1 : remainingClamped / 90;
  const dashOffset = CIRCUMFERENCE * (1 - fraction);

  const todayISO = getTodayISO();
  const nextEntry = nextAvailableEntry(trips);
  const isAvailableToday = nextEntry === todayISO;
  const projection = currentTripProjection(trips);
  // Fin quando si potrebbe restare entrando alla prossima data disponibile
  // (oggi o più avanti), mostrato sempre accanto alla data di ingresso.
  const nextStay = simulateStay(trips, nextEntry);

  return (
    <section className={`summary summary--${status.level}`}>
      <div className="summary__ring-wrap">
        <svg viewBox="0 0 130 130" className="summary__ring" aria-hidden="true">
          <circle cx="65" cy="65" r={RADIUS} className="summary__ring-bg" />
          <circle
            cx="65"
            cy="65"
            r={RADIUS}
            className={`summary__ring-fg summary__ring-fg--${status.level}`}
            style={{ strokeDasharray: CIRCUMFERENCE, strokeDashoffset: dashOffset }}
            transform="rotate(-90 65 65)"
          />
        </svg>
        <div className="summary__ring-text">
          <span className="summary__ring-number">{Math.max(0, status.remaining)}</span>
          <span className="summary__ring-label">{t.daysRemaining}</span>
        </div>
      </div>

      <div className="summary__row">
        <div className="summary__stat">
          <p className="summary__label">{t.totalLast180}</p>
          <p className="summary__value">
            {status.used}<span className="summary__unit"> / 90</span>
          </p>
        </div>
        <div className="summary__stat">
          <p className="summary__label">{t.plannedDays}</p>
          <p className="summary__value">
            {plannedDaysAfter(trips)}<span className="summary__unit"> {t.daysUnit}</span>
          </p>
        </div>
      </div>

      <p className={`summary__status summary__status--${status.level}`}>
        {icon} {text}
      </p>

      <div className="summary__next">
        <div className="summary__next-row">
          <div className="summary__next-cell">
            <p className="summary__label">{t.nextEntryLabel}</p>
            <p className={`summary__next-date${isAvailableToday ? " summary__next-date--today" : ""}`}>
              {isAvailableToday ? t.todayLabel : formatDate(nextEntry)}
            </p>
            {isAvailableToday && <p className="summary__next-sub">{formatDate(nextEntry)}</p>}
          </div>
          {!nextStay.alreadyOverAtEntry && nextStay.maxExit && (
            <div className="summary__next-cell">
              <p className="summary__label">{t.stayUntilLabel}</p>
              <p className="summary__next-date">{formatDate(nextStay.maxExit)}</p>
              <p className="summary__next-sub">
                {nextStay.daysAllowed} {t.daysUnit}
              </p>
            </div>
          )}
        </div>
        {nextStay.limitingTrip && (
          <p className="summary__planned-note">
            <span aria-hidden="true">📅</span>
            {t.limitedByPlanned(formatDate(nextStay.limitingTrip.entry), formatDate(nextStay.limitingTrip.exit!))}
          </p>
        )}
      </div>

      {projection && (
        <p className="summary__projection">
          {t.currentTripProjection(formatDate(projection.exitISO), projection.used, Math.max(0, projection.remaining))}
        </p>
      )}
    </section>
  );
}
