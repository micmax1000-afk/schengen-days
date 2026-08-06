import { useState } from "react";
import { Trip, tripContaining, isDateInWindow } from "../utils/calculator";
import { useLanguage } from "../i18n/LanguageContext";

interface Props {
  trips: Trip[];
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/** Costruisce la data ISO direttamente da anno/mese/giorno locali, senza passare
 *  da un oggetto Date e la sua conversione UTC (che sfaserebbe il giorno nei
 *  fusi orari avanti rispetto a UTC, come l'Italia). */
function localISO(year: number, month0: number, day: number): string {
  return `${year}-${pad(month0 + 1)}-${pad(day)}`;
}

function buildMonthGrid(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1);
  const leadingBlanks = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function CalendarView({ trips }: Props) {
  const { t } = useLanguage();
  const today = new Date();
  const todayISO = localISO(today.getFullYear(), today.getMonth(), today.getDate());
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const goPrev = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  };
  const goNext = () => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const cells = buildMonthGrid(year, month);

  return (
    <section className="calendar">
      <div className="calendar__nav">
        <button onClick={goPrev} aria-label={t.prevMonth}>‹</button>
        <span className="calendar__title">
          {t.months[month]} {year}
        </span>
        <button onClick={goNext} aria-label={t.nextMonth}>›</button>
      </div>

      <div className="calendar__grid calendar__grid--labels">
        {t.weekdays.map((w) => (
          <span key={w} className="calendar__weekday">{w}</span>
        ))}
      </div>

      <div className="calendar__grid">
        {cells.map((day, i) => {
          if (!day) return <span key={i} className="calendar__cell calendar__cell--empty" />;
          const iso = localISO(year, month, day);
          const inTrip = Boolean(tripContaining(iso, trips));
          const inWindow = isDateInWindow(iso, today);
          const isToday = iso === todayISO;

          const classes = ["calendar__cell"];
          if (inTrip) classes.push("calendar__cell--trip");
          else if (inWindow) classes.push("calendar__cell--window");
          if (isToday) classes.push("calendar__cell--today");

          return (
            <span key={i} className={classes.join(" ")} title={iso}>
              {day}
            </span>
          );
        })}
      </div>

      <div className="calendar__legend">
        <span><i className="calendar__dot calendar__dot--trip" /> {t.legendTrip}</span>
        <span><i className="calendar__dot calendar__dot--window" /> {t.legendWindow}</span>
      </div>
    </section>
  );
}
