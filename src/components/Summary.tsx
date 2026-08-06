import { ComplianceStatus } from "../utils/calculator";
import { useLanguage } from "../i18n/LanguageContext";

interface Props {
  status: ComplianceStatus;
}

export default function Summary({ status }: Props) {
  const { t } = useLanguage();

  const LABELS: Record<ComplianceStatus["level"], { icon: string; text: string }> = {
    ok: { icon: "🟢", text: t.statusOk },
    warning: { icon: "🟡", text: t.statusWarning },
    over: { icon: "🔴", text: t.statusOver },
  };

  const { icon, text } = LABELS[status.level];
  const pct = Math.min(100, (status.used / 90) * 100);

  return (
    <section className={`summary summary--${status.level}`}>
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
      <div className="summary__bar">
        <div className="summary__bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="summary__status">
        {icon} {text}
      </p>
    </section>
  );
}
