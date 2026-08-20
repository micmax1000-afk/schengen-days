import { ComplianceStatus, Trip, nextAvailableEntry } from "../utils/calculator";
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
    over: { icon: "🔴", text: t.statusOver },
  };

  const { icon, text } = LABELS[status.level];
  const remainingClamped = Math.max(0, Math.min(90, status.remaining));
  const fraction = remainingClamped / 90;
  const dashOffset = CIRCUMFERENCE * (1 - fraction);

  const todayISO = new Date().toISOString().slice(0, 10);
  const nextEntry = nextAvailableEntry(trips);
  const isAvailableToday = nextEntry === todayISO;

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
        <div>
          <p className="summary__label">{t.totalLast180}</p>
          <p className="summary__value">{status.used} {t.daysUnit}</p>
        </div>
        <div>
          <p className="summary__label">{t.daysRemaining}</p>
          <p className="summary__value">{Math.max(0, status.remaining)} {t.daysUnit}</p>
        </div>
      </div>

      <p className="summary__status">
        {icon} {text}
      </p>

      <p className="summary__next-entry">
        {t.nextAvailableEntry}{" "}
        <strong>{isAvailableToday ? t.availableToday : formatDate(nextEntry)}</strong>
      </p>
    </section>
  );
}
