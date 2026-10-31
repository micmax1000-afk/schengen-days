import { Trip, todayISO } from "../utils/calculator";
import { useLanguage } from "../i18n/LanguageContext";
import { ongoingDeadline } from "../utils/urgency";

interface Props {
  trips: Trip[];
  onEnter: (entry: string) => void;
  onExit: (trip: Trip, exit: string) => void;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

/** Registrazione rapida al passaggio di frontiera: un tocco per entrare o uscire oggi. */
export default function QuickBorder({ trips, onEnter, onExit }: Props) {
  const { t } = useLanguage();
  const today = todayISO();
  const deadline = ongoingDeadline(trips, today);

  if (deadline) {
    const { ongoing, urgency } = deadline;
    return (
      <button type="button" className={`quick-border quick-border--${urgency}`} onClick={() => onExit(ongoing, today)}>
        <span aria-hidden="true">🛫</span>
        {t.exitedToday}
        <small>{t.exitedTodayHint(formatDate(ongoing.entry))}</small>
      </button>
    );
  }
  return (
    <button type="button" className="quick-border" onClick={() => onEnter(today)}>
      <span aria-hidden="true">🛬</span>
      {t.enteredToday}
      <small>{t.enteredTodayHint}</small>
    </button>
  );
}
