import { useLanguage } from "../i18n/LanguageContext";
import LanguageSwitcher from "./LanguageSwitcher";

/** Striscia blu in alto, come l'immagine di copertina dello store. */
export default function Header() {
  const { t } = useLanguage();
  return (
    <header className="app-header app-header--banner">
      <img className="app-header__logo" src={`${import.meta.env.BASE_URL}logo.svg`} alt="" width={52} height={52} />
      <div className="app-header__brand">
        <h1 aria-label={t.appTitle}>StampDays</h1>
        <p>Schengen 90/180</p>
      </div>
      <LanguageSwitcher />
    </header>
  );
}
