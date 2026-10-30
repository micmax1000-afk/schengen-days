import { useLanguage } from "../i18n/LanguageContext";
import { LANGUAGES } from "../i18n/translations";

export default function LanguageSwitcher() {
  const { selection, setLang, t, lang } = useLanguage();

  return (
    <span className="language-switcher__wrap">
      <span className="language-switcher__chip" aria-hidden="true">🌐 {lang.toUpperCase()}</span>
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
    </span>
  );
}
