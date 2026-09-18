import { useLanguage } from "../i18n/LanguageContext";
import { LANGUAGES } from "../i18n/translations";

export default function LanguageSwitcher() {
  const { selection, setLang, t } = useLanguage();

  return (
    <select
      className="language-switcher"
      value={selection}
      onChange={(e) => setLang(e.target.value as typeof selection)}
      aria-label="Language"
    >
      <option value="system">🌐 {t.systemLanguage}</option>
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
